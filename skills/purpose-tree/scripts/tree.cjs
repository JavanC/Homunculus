'use strict';
// tree.cjs — shared helpers for skills that read a purpose tree: find it, walk its nodes,
// and read each node's change history from git. Zero dependencies.

const fs = require('fs');
const { execFileSync } = require('child_process');
const { parseYaml } = require('./validate.cjs');

const TREE_FILES = ['purpose-tree.yaml', 'architecture.yaml'];

function findTree(dir = '.') {
  return TREE_FILES.find((f) => fs.existsSync(require('path').join(dir, f))) || null;
}

// Every node as {id, node, impls[], subs[], means}, including legacy goals: maps.
function collectNodes(node, id = 'root', out = []) {
  if (!node || typeof node !== 'object') return out;
  const rb = node.realized_by;
  const means = rb == null ? [] : Array.isArray(rb) ? rb : [rb];
  const impls = means.filter((m) => typeof m === 'string');
  const children = means.filter((m) => m && typeof m === 'object' && 'purpose' in m).map((m) => [m.id, m]);
  if (node.goals && typeof node.goals === 'object') {
    for (const [k, c] of Object.entries(node.goals)) children.push([(c && c.id) || k, c]);
  }
  out.push({ id: node.id || id, node, impls, subs: children.map(([cid]) => cid), means: impls.length + children.length });
  for (const [cid, c] of children) collectNodes(c, cid, out);
  return out;
}

// Snapshot of what a node *is* at one commit, so two versions can be compared.
function snapshot(n) {
  return {
    realized: JSON.stringify([n.impls, n.subs]),
    whole: JSON.stringify([n.node.purpose, n.node.status, n.node.metrics, n.node.health_check, n.impls, n.subs]),
  };
}

// For each node id: how often its realized_by changed in the last `windowDays`, and when
// the node last changed at all. Reads the tree file's own git history, oldest first.
function nodeHistory(treeFile, { windowDays = 30, maxCommits = 300, now = Date.now() } = {}) {
  let log;
  try {
    log = execFileSync('git', ['log', '--follow', `-n${maxCommits}`, '--format=@@%H %ct', '--name-only', '--', treeFile],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return {}; }

  const commits = [];
  let cur = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) { const [h, t] = line.slice(2).split(' '); cur = { hash: h, time: Number(t) * 1000 }; commits.push(cur); }
    else if (line.trim() && cur && !cur.path) cur.path = line.trim();
  }
  commits.reverse();

  const since = now - windowDays * 86400000;
  const hist = {};
  let prev = {};
  for (const c of commits) {
    let doc;
    try { doc = parseYaml(execFileSync('git', ['show', `${c.hash}:${c.path || treeFile}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
    catch { continue; }
    const snap = {};
    for (const n of collectNodes(doc && doc.root)) snap[n.id] = snapshot(n);
    for (const [id, s] of Object.entries(snap)) {
      const h = (hist[id] ||= { recent_changes: 0, last_changed: null });
      const p = prev[id];
      if (!p || p.whole !== s.whole) h.last_changed = c.time;
      if (p && p.realized !== s.realized && c.time >= since) h.recent_changes += 1;
    }
    prev = snap;
  }
  return hist;
}

module.exports = { TREE_FILES, findTree, collectNodes, nodeHistory };
