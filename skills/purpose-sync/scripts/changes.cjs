#!/usr/bin/env node
'use strict';
// changes.cjs — list what changed since the purpose tree was last synced, and which
// nodes' realized_by mention each changed path. Zero dependencies. Run at the repo root.
// Usage: node changes.cjs [--session-base <commit>]
// Output: JSON on stdout. Exit 0 = ok, 2 = no tree here, 3 = setup problem
// (skill missing, not git, unknown --session-base), 4 = the tree exists but does not parse.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}
function tryGit(args) {
  try { return git(args); } catch { return null; }
}
const lines = (s) => (s || '').split('\n').filter(Boolean);

class Exit extends Error {
  constructor(code, message = '') { super(message); this.code = code; }
}

function loadTreeLib() {
  const p = path.join(__dirname, '..', '..', 'purpose-tree', 'scripts', 'tree.cjs');
  if (!fs.existsSync(p)) {
    throw new Exit(3, 'purpose-tree skill not found next to purpose-sync. Install it: npx skills add JavanC/Homunculus');
  }
  return { ...require(p), parseYaml: require(path.join(path.dirname(p), 'validate.cjs')).parseYaml };
}

// Signal (b): a node touched now whose realized_by already changed this often recently.
const CHURN_DAYS = 30;
const CHURN_MIN = 3;
// Above this many changed files that reach a node, sync narrows to this session's work.
const LAG_LIMIT = 50;

// Collect everything the skill needs. Throws Exit for the documented exit codes.
// Leaves the process in the repo root.
function collect({ sessionBase = null } = {}) {
  if (tryGit(['rev-parse', '--is-inside-work-tree']) !== 'true') throw new Exit(3, 'Not inside a git repository.');
  const root = git(['rev-parse', '--show-toplevel']);
  process.chdir(root);
  const lib = loadTreeLib();
  const tree = lib.findTree();
  if (!tree) throw new Exit(2);
  const { parseYaml, collectNodes, mentions, matchKind } = lib;
  let doc;
  try { doc = parseYaml(fs.readFileSync(tree, 'utf8')); } catch (e) {
    throw new Exit(4, `${tree}: ${e.message}`);
  }

  const head = tryGit(['rev-parse', 'HEAD']);
  let sessionFrom = head;
  if (sessionBase) {
    sessionFrom = tryGit(['rev-parse', '--verify', '--quiet', `${sessionBase}^{commit}`]);
    if (!sessionFrom) throw new Exit(3, `--session-base ${sessionBase}: not a commit in this repo.`);
  }

  let base = null;
  let baseSource = 'none';
  if (doc && doc.last_synced && tryGit(['cat-file', '-e', `${doc.last_synced}^{commit}`]) !== null) {
    base = String(doc.last_synced);
    baseSource = 'last_synced';
  } else {
    const last = tryGit(['log', '-1', '--format=%H', '--', tree]);
    if (last) { base = last; baseSource = 'last_tree_commit'; }
  }

  const ignoreDirs = lib.syncIgnore(doc);
  const keep = (f) => f !== tree && !lib.isIgnored(f, ignoreDirs);

  // Changed paths: committed + uncommitted since base, plus untracked files.
  const changes = new Map();
  const diffArgs = base ? ['diff', '--name-status', '-M', base] : head ? ['diff', '--name-status', '-M', 'HEAD'] : null;
  if (diffArgs) {
    for (const line of lines(tryGit(diffArgs))) {
      const parts = line.split('\t');
      const st = parts[0][0];
      if (st === 'R') changes.set(parts[2], { path: parts[2], status: 'R', from: parts[1] });
      else changes.set(parts[1], { path: parts[1], status: st });
    }
  }
  const untracked = lines(tryGit(['ls-files', '--others', '--exclude-standard', '--directory', '--no-empty-directory']));
  for (const f of untracked) {
    if (!changes.has(f)) changes.set(f, { path: f, status: '?' });
  }
  changes.delete(tree);
  let ignored = 0;   // net changed paths (an untracked directory counts once) left out as noise
  for (const f of [...changes.keys()]) if (!keep(f)) { changes.delete(f); ignored += 1; }

  const nodes = collectNodes(doc && doc.root);

  // A path reached only through a directory prefix, inside a subdirectory that did not exist
  // at base, is a coarse match: the directory may now hold work for another purpose.
  const existedAtBase = (dir) => !base || tryGit(['cat-file', '-e', `${base}:${dir.replace(/\/$/, '')}`]) !== null;
  function coarseSubdir(c, hit) {
    if (c.from && hit.every((n) => n.impls.some((i) => mentions(i, c.from)))) return null; // a rename
    let sub = null;
    for (const n of hit) {
      for (const i of n.impls) {
        const k = matchKind(i, c.path);
        if (k === 'exact') return null;
        if (k !== 'prefix') continue;
        for (const t of lib.pathTokens(i, null, { loose: true })) {
          if (!t.endsWith('/') || !c.path.startsWith(t)) continue;
          const rest = c.path.slice(t.length).split('/');
          if (rest.length < 2) return null;                      // a file directly in the directory
          const d = t + rest[0] + '/';
          if (existedAtBase(d)) return null;
          sub = sub || d;
        }
      }
    }
    return sub;
  }

  const list = [...changes.values()].map((c) => {
    const hit = nodes.filter((n) => n.impls.some((i) => mentions(i, c.path) || (c.from && mentions(i, c.from))));
    const out = { ...c, nodes: hit.map((n) => n.id) };
    const sub = hit.length ? coarseSubdir(c, hit) : null;
    if (sub) { out.match = 'coarse'; out.subdir = sub; }
    return out;
  });
  const unmatched = list.filter((c) => c.nodes.length === 0).map((c) => c.path);

  // Every path changed by any commit in the range, plus uncommitted and untracked ones.
  // Unlike the net diff above, a path changed and then reverted still appears.
  const any = new Set(changes.keys());
  if (base) {
    for (const f of lines(tryGit(['log', '--format=', '--name-only', '--no-renames', `${base}..HEAD`]))) if (keep(f)) any.add(f);
  }
  for (const f of head ? lines(tryGit(['diff', '--name-only', '--no-renames', 'HEAD'])) : []) if (keep(f)) any.add(f);
  const touchedAny = [...any].sort().map((f) => ({ path: f, nodes: nodes.filter((n) => n.impls.some((i) => mentions(i, f))).map((n) => n.id) }));

  const touched = new Set(touchedAny.flatMap((c) => c.nodes));
  const hist = touched.size ? lib.nodeHistory(tree, { windowDays: CHURN_DAYS }) : {};
  const churn = [...touched]
    .filter((id) => hist[id] && hist[id].recent_changes >= CHURN_MIN)
    .map((id) => ({ id, changes_in_window: hist[id].recent_changes, window_days: CHURN_DAYS }));

  // This session's work: changed since --session-base (default HEAD: uncommitted only),
  // plus untracked. Used when the lag is over the limit.
  const sessionPaths = new Set(untracked);
  if (sessionFrom) for (const f of lines(tryGit(['diff', '--name-only', '-M', sessionFrom]))) sessionPaths.add(f);
  const sessionUnmatched = unmatched.filter((f) => sessionPaths.has(f)).sort();

  const lag = list.filter((c) => c.nodes.length > 0).length;

  // A rename or deletion that leaves a realized_by entry pointing at nothing: the old path
  // was named exactly, or its realized directory is gone. A file removed from a directory
  // that is still there needs no edit.
  const stale = (c) => {
    if (c.status !== 'R' && c.status !== 'D') return false;
    const old = c.status === 'R' ? c.from : c.path;
    return nodes.some((n) => n.impls.some((i) => {
      const k = matchKind(i, old);
      if (k === 'exact') return true;
      return k === 'prefix' && lib.pathTokens(i, null, { loose: true })
        .some((t) => t.endsWith('/') && old.startsWith(t) && !fs.existsSync(t));
    }));
  };

  return {
    tree,
    base,
    base_source: baseSource,
    head,
    sync_ignore: ignoreDirs,
    ignored,
    lag,
    lag_limit: LAG_LIMIT,
    over_limit: lag > LAG_LIMIT,
    changes: list,
    touched_any: touchedAny,
    unmatched,
    nodes_without_implementation: nodes.filter((n) => n.means === 0).map((n) => n.id),
    churn,
    session_base: sessionFrom,
    session_unmatched: sessionUnmatched,
    moved_or_deleted: list.filter(stale),
  };
}

function main() {
  const args = process.argv.slice(2);
  let sessionBase = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session-base' && args[i + 1]) sessionBase = args[++i];
    else { console.error(`Unknown argument: ${args[i]}. Usage: changes.cjs [--session-base <commit>]`); process.exit(3); }
  }
  try {
    process.stdout.write(JSON.stringify(collect({ sessionBase }), null, 2) + '\n');
  } catch (e) {
    if (!(e instanceof Exit)) throw e;
    if (e.message) console.error(e.message);
    process.exit(e.code);
  }
}

if (require.main === module) main();
module.exports = { collect, Exit, LAG_LIMIT, mentions: (impl, file) => loadTreeLib().mentions(impl, file) };
