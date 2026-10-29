#!/usr/bin/env node
'use strict';
// changes.cjs — list what changed since the purpose tree was last synced, and which
// nodes' realized_by mention each changed path. Zero dependencies. Run at the repo root.
// Output: JSON on stdout. Exit 0 = ok, 2 = no tree here, 3 = setup problem
// (skill missing, not git), 4 = the tree exists but does not parse.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}
function tryGit(args) {
  try { return git(args); } catch { return null; }
}

function loadTreeLib() {
  const p = path.join(__dirname, '..', '..', 'purpose-tree', 'scripts', 'tree.cjs');
  if (!fs.existsSync(p)) {
    console.error('purpose-tree skill not found next to purpose-sync. Install it: npx skills add JavanC/Homunculus');
    process.exit(3);
  }
  return { ...require(p), parseYaml: require(path.join(path.dirname(p), 'validate.cjs')).parseYaml };
}

// Signal (b): a node touched now whose realized_by already changed this often recently.
const CHURN_DAYS = 30;
const CHURN_MIN = 3;

function main() {
  if (tryGit(['rev-parse', '--is-inside-work-tree']) !== 'true') {
    console.error('Not inside a git repository.');
    process.exit(3);
  }
  const root = git(['rev-parse', '--show-toplevel']);
  process.chdir(root);
  const lib = loadTreeLib();
  const tree = lib.findTree();
  if (!tree) process.exit(2);
  const { parseYaml, collectNodes, mentions, matchKind } = lib;
  let doc;
  try { doc = parseYaml(fs.readFileSync(tree, 'utf8')); } catch (e) {
    console.error(`${tree}: ${e.message}`);
    process.exit(4);
  }

  const head = tryGit(['rev-parse', 'HEAD']);
  let base = null;
  let baseSource = 'none';
  if (doc && doc.last_synced && tryGit(['cat-file', '-e', `${doc.last_synced}^{commit}`]) !== null) {
    base = String(doc.last_synced);
    baseSource = 'last_synced';
  } else {
    const last = tryGit(['log', '-1', '--format=%H', '--', tree]);
    if (last) { base = last; baseSource = 'last_tree_commit'; }
  }

  // Changed paths: committed + uncommitted since base, plus untracked files.
  const changes = new Map();
  const diffArgs = base ? ['diff', '--name-status', '-M', base] : head ? ['diff', '--name-status', '-M', 'HEAD'] : null;
  if (diffArgs) {
    for (const line of (tryGit(diffArgs) || '').split('\n').filter(Boolean)) {
      const parts = line.split('\t');
      const st = parts[0][0];
      if (st === 'R') changes.set(parts[2], { path: parts[2], status: 'R', from: parts[1] });
      else changes.set(parts[1], { path: parts[1], status: st });
    }
  }
  for (const f of (tryGit(['ls-files', '--others', '--exclude-standard', '--directory', '--no-empty-directory']) || '').split('\n').filter(Boolean)) {
    if (!changes.has(f)) changes.set(f, { path: f, status: '?' });
  }
  changes.delete(tree);

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

  // Every path changed by any commit in the range, plus uncommitted and untracked ones.
  // Unlike the net diff above, a path changed and then reverted still appears.
  const any = new Set(changes.keys());
  if (base) {
    for (const f of (tryGit(['log', '--format=', '--name-only', '--no-renames', `${base}..HEAD`]) || '').split('\n').filter(Boolean)) any.add(f);
  }
  for (const f of (head ? tryGit(['diff', '--name-only', '--no-renames', 'HEAD']) || '' : '').split('\n').filter(Boolean)) any.add(f);
  any.delete(tree);
  const touchedAny = [...any].sort().map((f) => ({ path: f, nodes: nodes.filter((n) => n.impls.some((i) => mentions(i, f))).map((n) => n.id) }));

  const touched = new Set(touchedAny.flatMap((c) => c.nodes));
  const hist = touched.size ? lib.nodeHistory(tree, { windowDays: CHURN_DAYS }) : {};
  const churn = [...touched]
    .filter((id) => hist[id] && hist[id].recent_changes >= CHURN_MIN)
    .map((id) => ({ id, changes_in_window: hist[id].recent_changes, window_days: CHURN_DAYS }));

  const out = {
    tree,
    base,
    base_source: baseSource,
    head,
    changes: list,
    touched_any: touchedAny,
    unmatched: list.filter((c) => c.nodes.length === 0).map((c) => c.path),
    nodes_without_implementation: nodes.filter((n) => n.means === 0).map((n) => n.id),
    churn,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) main();
module.exports = { mentions: (impl, file) => loadTreeLib().mentions(impl, file) };
