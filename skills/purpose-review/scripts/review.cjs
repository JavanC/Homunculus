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

// Tracked top-level entries with how many tracked files each holds.
function inventory() {
  const counts = new Map();
  for (const f of git(['ls-files']).split('\n').filter(Boolean)) {
    const i = f.indexOf('/');
    const top = i === -1 ? f : f.slice(0, i + 1);
    counts.set(top, (counts.get(top) || 0) + 1);
  }
  return [...counts].map(([entry, files]) => ({ entry, files }))
    .filter((e) => !PLUMBING.test(e.entry.replace(/\/$/, '')) && e.entry !== findTree());
}

// Path-like tokens in an implementation string.
function pathTokens(impl) {
  return impl.split(/[\s,()"'`]+/).map((t) => t.replace(/^\.\//, ''))
    .filter((t) => t && /[./]/.test(t) && !/^https?:/.test(t) && !/^\.+$/.test(t) && !/^[\d.]+$/.test(t));
}

function looksLikePath(t) {
  return t.includes('/') || /\.[a-z0-9]{1,5}$/i.test(t);
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
    process.stdout.write(JSON.stringify({ mode: 'bootstrap', inventory: inventory() }, null, 2) + '\n');
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
  for (const n of nodes) {
    for (const impl of n.impls) {
      for (const t of pathTokens(impl).filter(looksLikePath)) {
        const clean = t.replace(/^~\/[^/]+\//, '');
        if (fs.existsSync(clean)) mentioned.add(clean.split('/')[0]);
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
module.exports = { pathTokens, looksLikePath };
