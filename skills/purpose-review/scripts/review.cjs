#!/usr/bin/env node
'use strict';
// review.cjs — collect the facts for a full purpose-tree review, or, with no tree, a
// project inventory for bootstrapping one. Zero dependencies. Run at the repo root.
// Usage: review.cjs [--run-checks] [--stale-days N]
// Output: JSON on stdout. Exit 0 = ok, 3 = setup problem.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const LIB = path.join(__dirname, '..', '..', 'purpose-tree', 'scripts');
if (!fs.existsSync(path.join(LIB, 'tree.cjs'))) {
  console.error('purpose-tree skill not found next to purpose-review. Install it: npx skills add JavanC/Homunculus');
  process.exit(3);
}
const { findTree, collectNodes, nodeHistory } = require(path.join(LIB, 'tree.cjs'));
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
function pathTokens(impl, repoName = null) {
  const out = [];
  for (const piece of expandBraces(impl)) {
    for (let t of piece.split(/[\s,()"'`]+/)) {
      t = t.replace(/^\.\//, '').replace(/[;:.]+$/, '');
      if (t.startsWith('~/')) {
        const rest = t.split('/');
        if (rest[1] !== repoName) continue;
        t = rest.slice(2).join('/');
      }
      if (!t || t.startsWith('/') || t.startsWith('~') || /^[a-z][a-z0-9+.-]*:/i.test(t)) continue;
      if (/[@*{}<>=]/.test(t) || /^v?\d[\d.]*$/.test(t)) continue;
      if (t.endsWith('/') || FILE_EXT.test(t)) out.push(t);
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
    process.exit(3);
  }
  const staleDays = Number(arg('--stale-days') || 60);
  const now = Date.now();
  const nodes = collectNodes(doc && doc.root);
  const hist = nodeHistory(tree, { now });
  const ageDays = (id) => (hist[id] && hist[id].last_changed ? Math.floor((now - hist[id].last_changed) / 86400000) : null);

  // Implementations whose paths are gone, and top-level entries no implementation mentions.
  const missing = [];
  const mentioned = new Set();
  const files = tracked();
  const repoName = path.basename(process.cwd());
  for (const n of nodes) {
    for (const impl of n.impls) {
      for (const t of pathTokens(impl, repoName)) {
        const hit = resolve(t, files);
        if (hit) mentioned.add(hit.split('/')[0]);
        else missing.push({ id: n.id, path: t });
      }
    }
  }
  const unowned = inventory().filter((e) => !mentioned.has(e.entry.replace(/\/$/, '')));

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

  const { errors, warnings } = validate(doc);
  const out = {
    mode: 'review',
    tree,
    problems: errors,
    warnings,
    nodes_without_implementation: nodes.filter((n) => n.means === 0).map((n) => n.id),
    missing_paths: missing,
    unowned,
    stale,
    stale_days: staleDays,
    health_checks: checks,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) main();
module.exports = { pathTokens };
