#!/usr/bin/env node
'use strict';
// changes.cjs — list what changed since the purpose tree was last synced, and which
// nodes' realized_by mention each changed path. Zero dependencies. Run at the repo root.
// Output: JSON on stdout. Exit 0 = ok, 2 = no tree here, 3 = setup problem.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}
function tryGit(args) {
  try { return git(args); } catch { return null; }
}

function loadParser() {
  const p = path.join(__dirname, '..', '..', 'purpose-tree', 'scripts', 'validate.cjs');
  if (!fs.existsSync(p)) {
    console.error('purpose-tree skill not found next to purpose-sync. Install it: npx skills add JavanC/Homunculus');
    process.exit(3);
  }
  return require(p).parseYaml;
}

// Collect {id, impls[]} for every node, including legacy goals: maps.
function collectNodes(node, id, out) {
  if (!node || typeof node !== 'object') return;
  const rb = node.realized_by;
  const means = rb == null ? [] : Array.isArray(rb) ? rb : [rb];
  const impls = means.filter((m) => typeof m === 'string');
  const subs = means.length - impls.length + (node.goals && typeof node.goals === 'object' ? Object.keys(node.goals).length : 0);
  out.push({ id: node.id || id, impls, means: impls.length + subs });
  means.forEach((m) => { if (m && typeof m === 'object' && 'purpose' in m) collectNodes(m, m.id, out); });
  if (node.goals && typeof node.goals === 'object') {
    for (const [k, c] of Object.entries(node.goals)) collectNodes(c, (c && c.id) || k, out);
  }
}

const norm = (p) => p.replace(/^\.\//, '').replace(/^~\/[^/]+\//, '');

// Does this implementation string refer to the changed path?
function mentions(impl, file) {
  const f = norm(file);
  return impl.split(/[\s,()"'`]+/).filter(Boolean).some((tok) => {
    const t = norm(tok);
    if (!t || !/[./]/.test(t)) return false;           // only path-like tokens
    if (t === f || f.endsWith('/' + t)) return true;    // exact file (or repo-relative suffix)
    if (t.endsWith('/') && f.startsWith(t)) return true; // directory prefix
    return false;
  });
}

function main() {
  if (tryGit(['rev-parse', '--is-inside-work-tree']) !== 'true') {
    console.error('Not inside a git repository.');
    process.exit(3);
  }
  const root = git(['rev-parse', '--show-toplevel']);
  process.chdir(root);
  const tree = ['purpose-tree.yaml', 'architecture.yaml'].find((f) => fs.existsSync(f));
  if (!tree) process.exit(2);

  const parseYaml = loadParser();
  let doc;
  try { doc = parseYaml(fs.readFileSync(tree, 'utf8')); } catch (e) {
    console.error(`${tree}: ${e.message}`);
    process.exit(3);
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
  for (const f of (tryGit(['ls-files', '--others', '--exclude-standard']) || '').split('\n').filter(Boolean)) {
    if (!changes.has(f)) changes.set(f, { path: f, status: '?' });
  }
  changes.delete(tree);

  const nodes = [];
  collectNodes(doc && doc.root, 'root', nodes);

  const list = [...changes.values()].map((c) => {
    const hit = nodes.filter((n) => n.impls.some((i) => mentions(i, c.path) || (c.from && mentions(i, c.from))));
    return { ...c, nodes: hit.map((n) => n.id) };
  });

  const out = {
    tree,
    base,
    base_source: baseSource,
    head,
    changes: list,
    unmatched: list.filter((c) => c.nodes.length === 0).map((c) => c.path),
    nodes_without_implementation: nodes.filter((n) => n.means === 0).map((n) => n.id),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) main();
module.exports = { mentions, collectNodes };
