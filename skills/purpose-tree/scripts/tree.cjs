'use strict';
// tree.cjs — shared helpers for skills that read a purpose tree: find it, walk its nodes,
// read each node's change history from git, and match implementation strings to paths.
// Zero dependencies.

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

// Extensions that make a bare token count as a file path. Without one, a token must end in /
// to count, so repo slugs (owner/name), hostnames and versions are not mistaken for paths.
const FILE_EXT = /\.(c?js|mjs|jsx|tsx?|json|ya?ml|toml|md|txt|sh|zsh|bash|py|rb|go|rs|swift|kt|java|sql|html?|css|scss|plist|xml|env|lock|cfg|ini|csv|jsonl|svg|png|jpe?g)$/i;

// Expand one {a,b} group per pass so core/x.{js,json} becomes two paths before splitting on commas.
function expandBraces(s) {
  const m = s.match(/^(.*?)(\S*)\{([^{}\s]*)\}(\S*)(.*)$/s);
  if (!m) return [s];
  return m[3].split(',').flatMap((alt) => expandBraces(m[1] + m[2] + alt + m[4] + m[5]));
}

// Path-like tokens in an implementation string: files with a known extension or directories
// ending in /. Skips URLs, routes and slash commands (leading /), emails, globs, ~ paths outside
// the repo, and versions.
// With loose, a token with a / or . also counts even without a known extension (bin/tool),
// and a ~/<dir>/ prefix is dropped whatever <dir> is: right for matching changed paths,
// where a false hit is cheap; wrong for reporting missing paths, where it is not.
function pathTokens(impl, repoName = null, { loose = false } = {}) {
  const out = [];
  for (const piece of expandBraces(impl)) {
    for (let t of piece.split(/[\s,()"'`]+/)) {
      t = t.replace(/^\.\//, '').replace(/[;:.]+$/, '');
      if (t.startsWith('~/')) {
        const rest = t.split('/');
        if (!loose && rest[1] !== repoName) continue;
        t = rest.slice(2).join('/');
      }
      if (!t || t.startsWith('/') || t.startsWith('~') || /^[a-z][a-z0-9+.-]*:/i.test(t)) continue;
      // @ inside a segment is an email or pkg@version; at a segment start (@types/) it is a path.
      if (/[*{}<>=]/.test(t) || /[^/]@/.test(t) || /^v?\d[\d.]*$/.test(t)) continue;
      if (t.endsWith('/') || FILE_EXT.test(t) || (loose && /[./]/.test(t))) out.push(t);
    }
  }
  return [...new Set(out)];
}

// The tracked file a token refers to: at the repo root, or (for tokens written relative to a
// subdirectory, like twitter.sh under daily-news/sources/) the first tracked file ending in it.
function resolve(t, files) {
  const bare = t.replace(/\/$/, '');
  if (fs.existsSync(bare)) return bare;
  return files.find((f) => f.endsWith('/' + bare) || (t.endsWith('/') && f.includes('/' + t))) || null;
}

// How an implementation string refers to a changed path: 'exact' (the file itself, or a
// repo-relative suffix of it), 'prefix' (a directory ending in / that holds it), or null.
function matchKind(impl, file) {
  const f = file.replace(/^\.\//, '');
  let kind = null;
  for (const t of pathTokens(impl, null, { loose: true })) {
    if (t === f || f.endsWith('/' + t)) return 'exact';
    if (t.endsWith('/') && f.startsWith(t)) kind = 'prefix';
  }
  return kind;
}
const mentions = (impl, file) => matchKind(impl, file) !== null;

// Feature areas inside a directory: its immediate subdirectories holding at least
// `minFiles` tracked files each. Shared by the coarse-implementation check and the
// purpose-structure pass.
function featureAreas(dir, files, { minFiles = 3 } = {}) {
  const d = dir.endsWith('/') ? dir : dir + '/';
  const counts = new Map();
  for (const f of files) {
    if (!f.startsWith(d)) continue;
    const rest = f.slice(d.length).split('/');
    if (rest.length < 2) continue;
    const a = d + rest[0] + '/';
    counts.set(a, (counts.get(a) || 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= minFiles).map(([entry, n]) => ({ entry, files: n }));
}

module.exports = { TREE_FILES, findTree, collectNodes, nodeHistory, pathTokens, resolve, matchKind, mentions, featureAreas };
