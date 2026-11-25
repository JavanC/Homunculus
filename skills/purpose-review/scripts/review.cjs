#!/usr/bin/env node
'use strict';
// review.cjs — collect the facts for a full purpose-tree review, or, with no tree, a
// project inventory for bootstrapping one. Zero dependencies. Run at the repo root.
// Usage: review.cjs [--run-checks] [--stale-days N] [--days N] [--sessions]
//        review.cjs --record <answers.json | ->
// Output: JSON on stdout. Exit 0 = ok, 3 = setup problem, 4 = the tree does not parse
// (stdout then carries `mode: unparseable` with the error and bootstrap facts).
// --record writes the human's answers into the tree as `reviewed` entries (and `confirmed`
// for nodes they signed off); input {"on"?, "answers": [{node, kind, said, answer, evidence?}],
// "confirm"?: [{node, by}]}. Exit 1 = bad answers, nothing written.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const LIB = path.join(__dirname, '..', '..', 'purpose-tree', 'scripts');
if (!fs.existsSync(path.join(LIB, 'tree.cjs'))) {
  console.error('purpose-tree skill not found next to purpose-review. Install it: npx skills add JavanC/Homunculus');
  process.exit(3);
}
const { findTree, collectNodes, nodeHistory, pathTokens, resolve, featureAreas, mentions } = require(path.join(LIB, 'tree.cjs'));
const { parseYaml, validate, REVIEWED_KINDS, REVIEWED_ANSWERS } = require(path.join(LIB, 'validate.cjs'));
const { setField, confirmNodes } = require(path.join(LIB, 'edit.cjs'));
const { readPending, PENDING_FILE } = require(path.join(LIB, 'pending.cjs'));

// Top-level entries that are project plumbing, not functionality.
const PLUMBING = /^(\..*|README.*|LICENSE.*|CHANGELOG.*|CONTRIBUTING.*|[^/]+\.md|package\.json|pyproject\.toml|setup\.(py|cfg)|requirements.*\.txt|Cargo\.toml|go\.mod|Gemfile|tsconfig.*\.json|Makefile|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|go\.sum|Gemfile\.lock|poetry\.lock|node_modules|docs|tests?|__tests__|spec)$/i;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 512 * 1024 * 1024 }).trim();
}

// Health checks. A command check only counts if it has `fails_when`, a negative control:
// with it applied the same command must exit non-zero. If it still exits 0, it is a false green.
// Env form: whitespace-separated NAME=value tokens (no quoting). Token split, not one regex: no backtracking.
const envTokens = (s) => { const t = s.trim().split(/\s+/); return t.every((x) => /^[A-Za-z_][A-Za-z0-9_]*=\S*$/.test(x)) ? t : null; };
function runSh(command, cwd, env) {
  const r = spawnSync('sh', ['-c', command], { encoding: 'utf8', timeout: 30000, cwd, env: env ? { ...process.env, ...env } : process.env });
  return { exit: r.status, timed_out: r.error ? r.error.code === 'ETIMEDOUT' : false, error: r.error && r.error.code !== 'ETIMEDOUT' ? r.error.message : null, output: ((r.stdout || '') + (r.stderr || '')).trim().slice(-300) };
}
// Negative run. The check must pass in the copy first (control), so a failure afterwards is
// caused by fails_when and not by the copy missing .git, node_modules or a symlink target.
function negativeRun(command, failsWhen) {
  const tokens = envTokens(failsWhen);
  if (tokens) {
    const env = {};
    for (const kv of tokens) env[kv.slice(0, kv.indexOf('='))] = kv.slice(kv.indexOf('=') + 1);
    return runSh(command, process.cwd(), env);
  }
  // A command: apply it, then the check, in a throwaway copy so project files are never touched.
  // Only regular files and directories are copied: a symlink would lead back to the real data.
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'purpose-negctl-'));
  try {
    try {
      fs.cpSync(process.cwd(), tmp, {
        recursive: true,
        filter: (src) => {
          if (/(^|\/)(\.git|node_modules)$/.test(src)) return false;
          const st = fs.lstatSync(src);
          return st.isDirectory() || st.isFile();
        },
      });
    } catch (e) { return { exit: null, error: 'copy failed: ' + e.message.split('\n')[0], output: '' }; }
    const control = runSh(command, tmp);
    if (control.exit !== 0) return { ...control, error: 'check fails in the copy even before fails_when (needs .git, node_modules or a symlink?)' };
    const setup = runSh(failsWhen, tmp);
    if (setup.exit !== 0) return { ...setup, setup_failed: true };
    return runSh(command, tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
function checkFacts(id, hc, run) {
  if (hc.kind === 'manual') {
    const last = String(hc.last_run || '');
    const every = Number(hc.every_days) > 0 ? Number(hc.every_days) : 30;
    const t = Date.parse(last + 'T00:00:00Z');
    const age = Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
    return { id, kind: 'manual', owner: hc.owner || null, last_run: last || null, every_days: every, days_since_run: age,
      status: age !== null && age >= 0 && age <= every ? 'manual_ok' : 'manual_overdue' };
  }
  if (!hc.command) return null;
  const c = { id, kind: 'command', command: String(hc.command) };
  if (typeof hc.fails_when !== 'string' || !hc.fails_when.trim()) { c.status = 'no_check'; return c; }
  c.fails_when = hc.fails_when;
  if (!run) return c;
  const p = runSh(c.command);
  c.exit = p.exit;
  c.timed_out = p.timed_out;
  c.output = p.output;
  if (p.exit !== 0) { c.status = 'failing'; return c; }
  const neg = negativeRun(c.command, c.fails_when);
  c.negative_exit = neg.exit;
  c.negative_output = neg.output;
  if (neg.setup_failed || neg.timed_out || neg.error || neg.exit === null) c.status = 'negative_error';
  else c.status = neg.exit === 0 ? 'false_green' : 'ok';
  return c;
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

// Lockfiles, tests and docs: changes there are not proposals, so the diff leaves them out.
const NOISE = /(^|\/)purpose-tree\.pending\.yaml$|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|go\.sum|Gemfile\.lock|poetry\.lock)$|(^|\/)(tests?|__tests__|spec|docs)\//i;
const CHANGES_CAP = 100;

// What changed since the tree was last synced (purpose-sync's changes.cjs, noise left out).
// null when purpose-sync is not installed next to this skill.
function changesSinceSynced() {
  const p = path.join(__dirname, '..', '..', 'purpose-sync', 'scripts', 'changes.cjs');
  if (!fs.existsSync(p)) return null;
  try {
    const c = require(p).collect();
    const keep = (x) => !NOISE.test(typeof x === 'string' ? x : x.path);
    const changes = c.changes.filter(keep);
    return {
      base: c.base,
      base_source: c.base_source,
      head: c.head,
      lag: changes.filter((x) => x.nodes.length > 0).length,
      lag_limit: c.lag_limit,
      over_limit: changes.filter((x) => x.nodes.length > 0).length > c.lag_limit,
      changes: changes.slice(0, CHANGES_CAP),
      changes_total: changes.length,
      noise_dropped: c.changes.length - changes.length,
      unmatched: c.unmatched.filter(keep),
      moved_or_deleted: c.moved_or_deleted,
    };
  } catch (e) {
    return { error: e.message || `exit ${e.code}` };
  }
}

function pendingFacts() {
  try {
    const doc = readPending();
    return doc ? { file: PENDING_FILE, head: doc.head, items: doc.items } : null;
  } catch (e) {
    return { file: PENDING_FILE, error: e.message };
  }
}

const q = (s) => JSON.stringify(String(s));

// Write the human's answers into the tree: `reviewed` entries (the same kind+said updates its
// entry) and `confirmed` for nodes they signed off. All or nothing; the result must not add
// a validation error.
function record(answersPath) {
  const fail = (m) => { console.error(m); process.exit(1); };
  const tree = findTree();
  if (!tree) fail('No tree here: nothing to record into.');
  let input;
  try { input = JSON.parse(fs.readFileSync(answersPath === '-' ? 0 : answersPath, 'utf8')); } catch (e) { fail(`answers: ${e.message}`); }
  const on = (input && input.on) || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(on))) fail(`on must be YYYY-MM-DD (got "${on}")`);
  const answers = (input && input.answers) || [];
  const confirm = (input && input.confirm) || [];
  if (!Array.isArray(answers) || !Array.isArray(confirm)) fail('answers and confirm must be lists');

  const before = fs.readFileSync(tree, 'utf8');
  let text = before;
  const nodes = collectNodes(parseYaml(before).root);
  const byNode = new Map();
  answers.forEach((a, j) => {
    const at = `answers[${j}]`;
    if (!a || typeof a !== 'object') fail(`${at}: must be a mapping`);
    if (!nodes.some((n) => n.id === a.node)) fail(`${at}: node "${a.node}" not found in ${tree}`);
    if (!REVIEWED_KINDS.has(a.kind)) fail(`${at}: kind must be ${[...REVIEWED_KINDS].join('|')} (got "${a.kind}")`);
    if (!REVIEWED_ANSWERS.has(a.answer)) fail(`${at}: answer must be declined|kept|accepted (got "${a.answer}")`);
    if (typeof a.said !== 'string' || !a.said.trim() || /[\r\n]/.test(a.said)) fail(`${at}: said must be one non-empty line`);
    if (a.evidence !== undefined && (typeof a.evidence !== 'string' || /[\r\n]/.test(a.evidence))) fail(`${at}: evidence must be one line`);
    (byNode.get(a.node) || byNode.set(a.node, []).get(a.node)).push(a);
  });
  try {
    for (const [id, list] of byNode) {
      const entries = (nodes.find((n) => n.id === id).node.reviewed || []).filter((r) => r && typeof r === 'object').map((r) => ({ ...r }));
      for (const a of list) {
        const e = { kind: a.kind, said: a.said.trim(), answer: a.answer, on, ...(a.evidence ? { evidence: a.evidence } : {}) };
        const at = entries.findIndex((x) => x.kind === e.kind && x.said === e.said);
        if (at === -1) entries.push(e); else entries[at] = e;
      }
      const lines = entries.flatMap((e) => [
        `- kind: ${e.kind}`, `  said: ${q(e.said)}`, `  answer: ${e.answer}`, `  on: ${e.on}`,
        ...(e.evidence ? [`  evidence: ${q(e.evidence)}`] : []),
      ]);
      text = setField(text, id, 'reviewed', lines, { after: 'end' });
    }
    let confirmed = 0;
    for (const c of confirm) {
      if (!c || typeof c.by !== 'string' || !c.by.trim()) fail('confirm: each entry needs node and by');
      const r = confirmNodes(text, [c.node], c.by.trim(), on);
      confirmed += r.done.length;
      text = r.text;
    }
    const known = new Set(validate(parseYaml(before)).errors);
    const added = validate(parseYaml(text)).errors.filter((e) => !known.has(e));
    if (added.length) fail(`the answers would leave the tree invalid, nothing written:\n${added.join('\n')}`);
    if (text !== before) fs.writeFileSync(tree, text);
    process.stdout.write(JSON.stringify({ recorded: answers.length, confirmed, tree }) + '\n');
  } catch (e) {
    fail(`${tree}: ${e.message}`);
  }
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
  if (process.argv.includes('--record')) {
    const f = arg('--record');
    if (!f) { console.error('Usage: review.cjs --record <answers.json | ->'); process.exit(1); }
    return record(f);
  }
  const tree = findTree();
  if (!tree) {
    process.stdout.write(JSON.stringify({ mode: 'bootstrap', pending: pendingFacts(), intent_docs: intentDocs(), inventory: inventory({ deep: true }) }, null, 2) + '\n');
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
  // An entry a node's status_note or paused_reason already names was decided on: say which
  // node, so the agent reads that note instead of asking again.
  const notes = nodes.map((n) => ({ id: n.id, text: [n.node.status_note, n.node.paused_reason].filter(Boolean).join('\n') }));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const unowned = inventory({ deep: true }).filter((e) => !mentioned.has(e.entry.replace(/\/$/, ''))).map((e) => {
    const re = new RegExp(`(^|[^\\w./-])${esc(e.entry.replace(/\/$/, ''))}(/|(?![\\w.-]))`);
    const by = notes.filter((n) => re.test(n.text)).map((n) => n.id);
    return by.length ? { ...e, noted_by: by } : e;
  });

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
    if (!hc || typeof hc !== 'object') continue;
    const c = checkFacts(n.id, hc, process.argv.includes('--run-checks'));
    if (c) checks.push(c);
  }

  // Commits in the evidence window, grouped by the node whose implementations they touch.
  const days = Number(arg('--days') || 30);
  const sinceMs = now - days * 86400000;
  const commitsByNode = {};
  // \x01 marks a commit line: git quotes control characters in file names, so no path starts with it.
  let log = '';
  let commitsError = null;
  try { log = git(['log', `--since=${Math.floor(sinceMs / 1000)}`, '--reverse', '--no-renames', '--format=%x01%H %ct %s', '--name-only']); } catch (e) { commitsError = e.message.split('\n')[0]; }
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
    if (line.startsWith('\x01')) {
      flush();
      const m = line.slice(1).match(/^(\S+) (\d+) ?(.*)$/);
      cur = { hash: m[1], time: Number(m[2]) * 1000, subject: m[3], files: [] };
    } else if (line.trim() && cur) cur.files.push(line.trim());
  }
  flush();

  // Answered suggestions per node; a stale entry older than the stale threshold is asked again.
  const reviewed = {};
  for (const n of nodes) {
    if (!Array.isArray(n.node.reviewed) || !n.node.reviewed.length) continue;
    reviewed[n.id] = n.node.reviewed.filter((r) => r && typeof r === 'object').map((r) => {
      const age = Math.floor((now - Date.parse(String(r.on))) / 86400000);
      return { ...r, reask: r.kind === 'stale' && Number.isFinite(age) && age >= staleDays };
    });
  }

  // Depth and parent of each node, for the top-down order.
  // A duplicate id is a validation problem; `seen` keeps it from recursing forever.
  const shape = {};
  const seen = new Set();
  (function walk(list, parent, depth) {
    for (const n of list) {
      if (seen.has(n)) continue;
      seen.add(n);
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
  // The first health fact: nodes no human has confirmed yet, shallowest first. Drafts are legal,
  // so this is the only thing that keeps them from sitting there quietly.
  const unconfirmed = nodes
    .filter((n) => !(n.node.confirmed && typeof n.node.confirmed === 'object' && n.node.confirmed.by && n.node.confirmed.on))
    .map((n) => ({ id: n.id, depth: shape[n.id] ? shape[n.id].depth : 0, purpose: String(n.node.purpose || '').trim() }))
    .sort((a, b) => a.depth - b.depth);
  const out = {
    mode: 'review',
    tree,
    unconfirmed,
    pending: pendingFacts(),
    changes_since_synced: changesSinceSynced(),
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
    commits_by_node: commitsError ? null : commitsByNode,
    ...(commitsError ? { commits_error: commitsError } : {}),
    reviewed,
    ...(sessions ? { session_signals: sessions } : {}),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) main();
module.exports = { pathTokens };
