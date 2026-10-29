#!/usr/bin/env node
'use strict';
// review.cjs — collect the facts for a full purpose-tree review, or, with no tree, a
// project inventory for bootstrapping one. Zero dependencies. Run at the repo root.
// Usage: review.cjs [--run-checks] [--stale-days N] [--days N] [--sessions]
// Output: JSON on stdout. Exit 0 = ok, 3 = setup problem, 4 = the tree does not parse
// (stdout then carries `mode: unparseable` with the error and bootstrap facts).

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const LIB = path.join(__dirname, '..', '..', 'purpose-tree', 'scripts');
if (!fs.existsSync(path.join(LIB, 'tree.cjs'))) {
  console.error('purpose-tree skill not found next to purpose-review. Install it: npx skills add JavanC/Homunculus');
  process.exit(3);
}
const { findTree, collectNodes, nodeHistory, pathTokens, resolve, featureAreas, mentions } = require(path.join(LIB, 'tree.cjs'));
const { parseYaml, validate } = require(path.join(LIB, 'validate.cjs'));

// Top-level entries that are project plumbing, not functionality.
const PLUMBING = /^(\..*|README.*|LICENSE.*|CHANGELOG.*|CONTRIBUTING.*|[^/]+\.md|package\.json|pyproject\.toml|setup\.(py|cfg)|requirements.*\.txt|Cargo\.toml|go\.mod|Gemfile|tsconfig.*\.json|Makefile|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|go\.sum|Gemfile\.lock|poetry\.lock|node_modules|docs|tests?|__tests__|spec)$/i;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function tracked() {
  // -z: without it git quotes non-ASCII paths ("dir/\350...") and the quote becomes a fake top-level entry.
  return git(['ls-files', '-z']).split('\0').filter(Boolean);
}

function plumbing(entry) {
  return PLUMBING.test(entry.replace(/\/$/, '')) || entry === findTree();
}

// Tracked top-level entries with how many tracked files each holds. With deep, each
// directory also lists its subdirectories (one level down), so feature areas such as
// src/compliance/ show up instead of hiding inside src/.
function inventory({ deep = false } = {}) {
  const counts = new Map();
  const subs = new Map();
  for (const f of tracked()) {
    const parts = f.split('/');
    const top = parts.length === 1 ? f : parts[0] + '/';
    counts.set(top, (counts.get(top) || 0) + 1);
    if (deep && parts.length > 2) {
      const m = subs.get(top) || new Map();
      const sub = top + parts[1] + '/';
      m.set(sub, (m.get(sub) || 0) + 1);
      subs.set(top, m);
    }
  }
  return [...counts].filter(([entry]) => !plumbing(entry)).map(([entry, files]) => {
    const e = { entry, files };
    if (deep && subs.has(entry)) e.areas = [...subs.get(entry)].map(([a, n]) => ({ entry: a, files: n }));
    return e;
  });
}

// Tracked documents that may state why the project exists: READMEs, agent instructions,
// product briefs, ADRs, and anything under docs/.
const INTENT = /(^|\/)(README|CLAUDE|AGENTS|VISION|PRODUCT|BRIEF|PRD|ROADMAP)[^/]*\.(md|txt|rst)$|(^|\/)(docs?|adrs?|decisions)\/.*\.(md|txt|rst)$/i;
function intentDocs() {
  return tracked().filter((f) => INTENT.test(f) && !f.includes('node_modules/'));
}

const COARSE_MIN_AREAS = 3;

// The feature area a path belongs to: the second-level directory holding it when that is a
// feature area (featureAreas: 3+ tracked files), else its top-level entry.
function areaOf(p, level2) {
  const parts = p.replace(/\/$/, '').split('/');
  if (parts.length >= 2) {
    const a = parts.slice(0, 2).join('/') + '/';
    if (level2.has(a)) return a;
  }
  return parts.length > 1 || p.endsWith('/') ? parts[0] + '/' : p;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function main() {
  try { process.chdir(git(['rev-parse', '--show-toplevel'])); } catch {
    console.error('Not inside a git repository.');
    process.exit(3);
  }
  const tree = findTree();
  if (!tree) {
    process.stdout.write(JSON.stringify({ mode: 'bootstrap', intent_docs: intentDocs(), inventory: inventory({ deep: true }) }, null, 2) + '\n');
    return;
  }

  let doc;
  try { doc = parseYaml(fs.readFileSync(tree, 'utf8')); } catch (e) {
    console.error(`${tree}: ${e.message}`);
    process.stdout.write(JSON.stringify({ mode: 'unparseable', tree, error: e.message, intent_docs: intentDocs(), inventory: inventory({ deep: true }) }, null, 2) + '\n');
    process.exit(4);
  }
  const staleDays = Number(arg('--stale-days') || 60);
  const now = Date.now();
  const nodes = collectNodes(doc && doc.root);
  const hist = nodeHistory(tree, { now });
  const ageDays = (id) => (hist[id] && hist[id].last_changed ? Math.floor((now - hist[id].last_changed) / 86400000) : null);

  // Implementations whose paths are gone, and top-level entries no implementation mentions.
  const missing = [];
  const coarse = [];
  const mentioned = new Set();
  const hitsByNode = {};   // node id → resolved paths its implementations point at
  const areasByNode = {};  // node id → feature areas those paths fall in
  const files = tracked();
  const level2 = new Set([...new Set(files.filter((f) => f.includes('/')).map((f) => f.split('/')[0] + '/'))]
    .flatMap((top) => featureAreas(top, files).map((a) => a.entry)));
  const repoName = path.basename(process.cwd());
  for (const n of nodes) {
    for (const impl of n.impls) {
      for (const t of pathTokens(impl, repoName)) {
        const hit = resolve(t, files);
        if (!hit) { missing.push({ id: n.id, path: t }); continue; }
        mentioned.add(hit.split('/')[0]);
        (hitsByNode[n.id] ||= new Set()).add(hit);
        const inner = t.endsWith('/') ? featureAreas(hit, files) : [];
        const own = areasByNode[n.id] ||= new Set();
        if (inner.length) inner.forEach((a) => own.add(a.entry));
        else own.add(areaOf(hit, level2));
        if (t.endsWith('/')) {
          // A directory-level implementation holding several feature areas: a trigger to
          // look at the node's structure, not by itself a reason to split it.
          const areas = featureAreas(hit, files);
          if (areas.length >= COARSE_MIN_AREAS) coarse.push({ id: n.id, path: t, areas });
        }
      }
    }
  }
  const unowned = inventory({ deep: true }).filter((e) => !mentioned.has(e.entry.replace(/\/$/, '')));

  // Structure signals for the purpose-structure pass. Triggers to look, not answers.
  // An area that holds another area of the same node is not counted on its own.
  const leaves = (a) => [...a].filter((x) => ![...a].some((y) => y !== x && y.startsWith(x)));
  const spread = Object.entries(areasByNode)
    .map(([id, a]) => ({ id, areas: leaves(a).sort() }))
    .filter((e) => e.areas.length >= COARSE_MIN_AREAS);
  const shared = [];
  for (const parent of nodes) {
    const kids = parent.subs.filter((id) => hitsByNode[id]);
    for (let x = 0; x < kids.length; x++) {
      for (let y = x + 1; y < kids.length; y++) {
        const both = [...hitsByNode[kids[x]]].filter((h) => hitsByNode[kids[y]].has(h));
        if (both.length) shared.push({ ids: [kids[x], kids[y]], paths: both.sort() });
      }
    }
  }

  const stale = [];
  for (const n of nodes) {
    const age = ageDays(n.id);
    if (age === null || age < staleDays) continue;
    const st = n.node.status || 'active';
    stale.push({ id: n.id, status: st, days_since_change: age });
  }

  const checks = [];
  for (const n of nodes) {
    const hc = n.node.health_check;
    if (!hc || !hc.command) continue;
    const c = { id: n.id, command: String(hc.command) };
    if (process.argv.includes('--run-checks')) {
      const r = spawnSync('sh', ['-c', c.command], { encoding: 'utf8', timeout: 30000 });
      c.exit = r.status;
      c.timed_out = r.error ? r.error.code === 'ETIMEDOUT' : false;
      c.output = ((r.stdout || '') + (r.stderr || '')).trim().slice(-300);
    }
    checks.push(c);
  }

  // Commits in the evidence window, grouped by the node whose implementations they touch.
  const days = Number(arg('--days') || 30);
  const sinceMs = now - days * 86400000;
  const commitsByNode = {};
  let log = '';
  try { log = git(['log', `--since=${Math.floor(sinceMs / 1000)}`, '--reverse', '--no-renames', '--format=@@%H %ct %s', '--name-only']); } catch {}
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const hit = nodes.filter((n) => cur.files.some((f) => f !== tree && n.impls.some((i) => mentions(i, f))));
    for (const n of hit) {
      const e = (commitsByNode[n.id] ||= { count: 0, first: null, last: null, subjects: [] });
      const day = new Date(cur.time).toISOString().slice(0, 10);
      e.count++;
      e.first ||= day;
      e.last = day;
      if (e.subjects.length < 5) e.subjects.push(cur.subject);
    }
  };
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) {
      flush();
      const m = line.slice(2).match(/^(\S+) (\d+) ?(.*)$/);
      cur = { hash: m[1], time: Number(m[2]) * 1000, subject: m[3], files: [] };
    } else if (line.trim() && cur) cur.files.push(line.trim());
  }
  flush();

  // Answered suggestions per node; a stale entry older than the stale threshold is asked again.
  const reviewed = {};
  for (const n of nodes) {
    if (!Array.isArray(n.node.reviewed) || !n.node.reviewed.length) continue;
    reviewed[n.id] = n.node.reviewed.map((r) => {
      const age = Math.floor((now - Date.parse(String(r.on))) / 86400000);
      return { ...r, reask: r.kind === 'stale' && Number.isFinite(age) && age >= staleDays };
    });
  }

  // Depth and parent of each node, for the top-down order.
  const shape = {};
  (function walk(list, parent, depth) {
    for (const n of list) {
      shape[n.id] = { parent, depth };
      walk(nodes.filter((m) => n.subs.includes(m.id)), n.id, depth + 1);
    }
  })(nodes.slice(0, 1), null, 0);

  let sessions;
  if (process.argv.includes('--sessions')) {
    const roots = [process.cwd()];
    try {
      for (const l of git(['worktree', 'list', '--porcelain']).split('\n')) if (l.startsWith('worktree ')) roots.push(l.slice(9));
    } catch {}
    sessions = require('./sessions.cjs').sessionSignals({ roots: [...new Set(roots.map((r) => fs.realpathSync(r)))], sinceMs });
  }

  const { errors, warnings } = validate(doc);
  const out = {
    mode: 'review',
    tree,
    problems: errors,
    warnings,
    nodes_without_implementation: nodes.filter((n) => n.means === 0).map((n) => n.id),
    missing_paths: missing,
    coarse_implementations: coarse,
    spread,
    shared_implementations: shared,
    unowned,
    stale,
    stale_days: staleDays,
    health_checks: checks,
    nodes: shape,
    window_days: days,
    commits_by_node: commitsByNode,
    reviewed,
    ...(sessions ? { session_signals: sessions } : {}),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) main();
module.exports = { pathTokens };
