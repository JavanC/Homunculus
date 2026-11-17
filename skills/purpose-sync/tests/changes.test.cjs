'use strict';
// Run: node --test skills/purpose-sync/tests/changes.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'changes.cjs');

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-sync-'));
  const sh = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' }).toString().trim();
  sh('init', '-q');
  sh('config', 'user.email', 't@example.com');
  sh('config', 'user.name', 't');
  const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
  const run = () => {
    try { return { code: 0, out: JSON.parse(execFileSync('node', [SCRIPT], { cwd: dir, stdio: 'pipe' }).toString()) }; }
    catch (e) { return { code: e.status }; }
  };
  return { dir, sh, write, run };
}

const TREE = `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: brief
      purpose: Know what matters each morning.
      realized_by:
        - scripts/brief.js
    - id: reader
      purpose: Readers keep their place.
      realized_by:
        - app/reader/
    - id: empty_one
      purpose: Has nothing yet.
      status: planned
      paused_reason: later
`;

test('no tree → exit 2', () => {
  const r = repo();
  r.write('a.txt', 'x'); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  assert.strictEqual(r.run().code, 2);
});

test('maps changes to nodes, lists unmatched and empty nodes', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE);
  r.write('scripts/brief.js', '1'); r.write('app/reader/view.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('scripts/brief.js', '2');         // modified, matches brief
  r.write('app/reader/page.js', 'new');     // untracked, matches reader by dir prefix
  r.write('scripts/export.js', 'new');      // matches nothing
  const { code, out } = r.run();
  assert.strictEqual(code, 0);
  assert.strictEqual(out.base_source, 'last_tree_commit');
  const by = Object.fromEntries(out.changes.map((c) => [c.path, c.nodes]));
  assert.deepStrictEqual(by['scripts/brief.js'], ['brief']);
  assert.deepStrictEqual(by['app/reader/page.js'], ['reader']);
  assert.deepStrictEqual(out.unmatched, ['scripts/export.js']);
  assert.deepStrictEqual(out.nodes_without_implementation, ['empty_one']);
});

test('rename keeps the node link via the old path', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', 'same content here\n'.repeat(5));
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.sh('mv', 'scripts/brief.js', 'scripts/morning.js'); r.sh('commit', '-qm', 'rename');
  const { out } = r.run();
  const c = out.changes.find((x) => x.path === 'scripts/morning.js');
  assert.strictEqual(c.status, 'R');
  assert.strictEqual(c.from, 'scripts/brief.js');
  assert.deepStrictEqual(c.nodes, ['brief']);
});

test('last_synced hides changes already synced', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/export.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('scripts/export.js', '2'); r.sh('commit', '-qam', 'work');
  const head = r.sh('rev-parse', 'HEAD');
  r.write('purpose-tree.yaml', TREE + `last_synced: ${head}\n`);
  const { out } = r.run();
  assert.strictEqual(out.base_source, 'last_synced');
  assert.deepStrictEqual(out.changes, []);
});

test('legacy architecture.yaml with goals: map is read', () => {
  const r = repo();
  r.write('architecture.yaml', `version: "3.0"
root:
  purpose: Root.
  goals:
    brief:
      purpose: Morning.
      realized_by: scripts/brief.js
`);
  r.write('scripts/brief.js', '1'); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('scripts/brief.js', '2');
  const { out } = r.run();
  assert.strictEqual(out.tree, 'architecture.yaml');
  assert.deepStrictEqual(out.changes[0].nodes, ['brief']);
});

test('untracked directory is one entry, not every file in it', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  for (let i = 0; i < 20; i++) r.write(`runs/run-${i}.json`, '{}');
  const { out } = r.run();
  assert.deepStrictEqual(out.changes.map((c) => c.path), ['runs/']);
});

test('empty untracked directories are ignored', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  fs.mkdirSync(path.join(r.dir, 'empty', 'nested'), { recursive: true });
  assert.deepStrictEqual(r.run().out.changes, []);
});

test('churn: a touched node whose realized_by keeps changing is flagged', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  for (let i = 1; i <= 3; i++) {
    r.write('purpose-tree.yaml', TREE.replace('- scripts/brief.js', `- scripts/brief.js\n        - extra-${i}`));
    r.sh('commit', '-qam', `tweak ${i}`);
  }
  r.write('scripts/brief.js', '2');
  const { out } = r.run();
  assert.deepStrictEqual(out.churn.map((c) => c.id), ['brief']);
  assert.ok(out.churn[0].changes_in_window >= 3);
});

test('churn: an untouched node is not flagged', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  for (let i = 1; i <= 3; i++) {
    r.write('purpose-tree.yaml', TREE.replace('- scripts/brief.js', `- scripts/brief.js\n        - extra-${i}`));
    r.sh('commit', '-qam', `tweak ${i}`);
  }
  assert.deepStrictEqual(r.run().out.churn, []);
});

test('touched_any keeps a path changed and reverted within the range', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const base = r.sh('rev-parse', 'HEAD');
  r.write('purpose-tree.yaml', TREE + `last_synced: ${base}\n`); r.sh('commit', '-qam', 'sync');
  r.write('scripts/brief.js', '2'); r.sh('commit', '-qam', 'change');
  r.write('scripts/brief.js', '1'); r.sh('commit', '-qam', 'revert');
  r.write('scripts/new.js', 'new');   // untracked, in a tracked dir
  const { out } = r.run();
  assert.ok(!out.changes.some((c) => c.path === 'scripts/brief.js'));
  const by = Object.fromEntries(out.touched_any.map((c) => [c.path, c.nodes]));
  assert.deepStrictEqual(by['scripts/brief.js'], ['brief']);
  assert.deepStrictEqual(by['scripts/new.js'], []);
  assert.ok(!('purpose-tree.yaml' in by));
});

test('touched_any lists both sides of a committed rename', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', 'same content here\n'.repeat(5));
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.sh('mv', 'scripts/brief.js', 'scripts/morning.js'); r.sh('commit', '-qm', 'rename');
  const paths = r.run().out.touched_any.map((c) => c.path);
  assert.ok(paths.includes('scripts/brief.js') && paths.includes('scripts/morning.js'));
});

test('unparseable tree → exit 4; not a git repo → exit 3', () => {
  const r = repo();
  r.write('purpose-tree.yaml', '---\nroot:\n\tpurpose: tabbed\n');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  assert.strictEqual(r.run().code, 4);
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-sync-nogit-'));
  let code = 0;
  try { execFileSync('node', [SCRIPT], { cwd: plain, stdio: 'pipe' }); } catch (e) { code = e.status; }
  assert.strictEqual(code, 3);
});

test('mentions: pins current matching rules', () => {
  const { mentions } = require(SCRIPT);
  assert.ok(mentions('scripts/brief.js', 'scripts/brief.js'));             // exact
  assert.ok(mentions('brief.js', 'scripts/brief.js'));                     // repo-relative suffix
  assert.ok(mentions('app/reader/', 'app/reader/view.js'));                // dir prefix with /
  assert.ok(!mentions('app/reader', 'app/reader/view.js'));                // no / → not a prefix
  assert.ok(mentions('~/proj/scripts/x.js', 'scripts/x.js'));              // ~/<repo>/ stripped
  assert.ok(mentions('bin/hm-night', 'bin/hm-night'));                     // extensionless file
  assert.ok(mentions('cron job (scripts/brief.js)', 'scripts/brief.js'));  // inside prose
  assert.ok(!mentions('morning brief job', 'scripts/brief.js'));           // prose only
  assert.ok(!mentions('scripts/', 'other/scripts/x.js'));                  // prefix is from the root
});

const COARSE_TREE = `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: analysis
      purpose: Understand quote quality.
      realized_by:
        - scripts/analysis/
`;

test('coarse: a new subdirectory reached only by a dir prefix is marked', () => {
  const r = repo();
  r.write('purpose-tree.yaml', COARSE_TREE); r.write('scripts/analysis/old/a.js', '1'); r.write('scripts/analysis/top.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('scripts/analysis/rhQuoteGap/gap.js', 'new'); r.sh('add', '.'); r.sh('commit', '-qm', 'new area');
  r.write('scripts/analysis/old/a.js', '2');   // existing subdir → not coarse
  r.write('scripts/analysis/top.js', '2');     // directly in the dir → not coarse
  const by = Object.fromEntries(r.run().out.changes.map((c) => [c.path, c]));
  assert.strictEqual(by['scripts/analysis/rhQuoteGap/gap.js'].match, 'coarse');
  assert.strictEqual(by['scripts/analysis/rhQuoteGap/gap.js'].subdir, 'scripts/analysis/rhQuoteGap/');
  assert.deepStrictEqual(by['scripts/analysis/rhQuoteGap/gap.js'].nodes, ['analysis']);
  assert.strictEqual(by['scripts/analysis/old/a.js'].match, undefined);
  assert.strictEqual(by['scripts/analysis/top.js'].match, undefined);
});

test('coarse: an exact match or a rename is not marked', () => {
  const r = repo();
  r.write('purpose-tree.yaml', COARSE_TREE.replace('- scripts/analysis/', '- scripts/analysis/\n        - scripts/analysis/new/x.js'));
  r.write('scripts/analysis/old/a.js', 'same content here\n'.repeat(5));
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('scripts/analysis/new/x.js', 'x');                                    // exact
  r.sh('mv', 'scripts/analysis/old', 'scripts/analysis/moved');                 // rename
  r.sh('add', '.'); r.sh('commit', '-qm', 'work');
  const out = r.run().out;
  assert.ok(out.changes.length >= 2);
  assert.ok(out.changes.every((c) => c.match === undefined), JSON.stringify(out.changes));
});

// ── Lag, noise directories, and the session view (over the limit) ──────────

function runWith(dir, args) {
  try { return { code: 0, out: JSON.parse(execFileSync('node', [SCRIPT, ...args], { cwd: dir, stdio: 'pipe' }).toString()) }; }
  catch (e) { return { code: e.status, err: String(e.stderr) }; }
}

test('noise: data/ and drafts/ are left out by default and counted as ignored', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1');
  r.write('data/old.json', '1'); r.write('drafts/a.md', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('data/old.json', '2'); r.write('drafts/a.md', '2'); r.write('drafts/b.md', 'new');
  r.write('scripts/brief.js', '2');
  const { out } = r.run();
  assert.deepStrictEqual(out.changes.map((c) => c.path), ['scripts/brief.js']);
  assert.deepStrictEqual(out.unmatched, []);
  assert.ok(!out.touched_any.some((c) => /^(data|drafts)\//.test(c.path)));
  assert.strictEqual(out.ignored, 3);
  assert.deepStrictEqual(out.sync_ignore, ['data/', 'drafts/']);
});

test('noise: sync_ignore in the tree replaces the defaults', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE + 'sync_ignore:\n  - build/\n');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('build/out.js', 'x'); r.write('data/run.json', '{}');
  const { out } = r.run();
  assert.deepStrictEqual(out.changes.map((c) => c.path), ['data/']);
  assert.strictEqual(out.ignored, 1);
  assert.deepStrictEqual(out.sync_ignore, ['build/']);
});

test('lag counts only changed files that reach a node, not every change', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  for (let i = 0; i < 60; i++) r.write(`notes/n-${i}.md`, 'x');      // unmatched
  for (let i = 0; i < 60; i++) r.write(`data/d-${i}.json`, 'x');     // noise
  r.write('scripts/brief.js', '2'); r.write('app/reader/a.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'lots');
  const { out } = r.run();
  assert.strictEqual(out.lag, 2);
  assert.strictEqual(out.lag_limit, 50);
  assert.strictEqual(out.over_limit, false);
});

test('lag over the limit: 51 files under a realized directory', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  for (let i = 0; i < 51; i++) r.write(`app/reader/p-${i}.js`, 'x');
  r.sh('add', '.'); r.sh('commit', '-qm', 'reader');
  const { out } = r.run();
  assert.strictEqual(out.lag, 51);
  assert.strictEqual(out.over_limit, true);
});

test('session view: only this session\'s unmatched files, plus moves and deletes of realized paths', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE);
  r.write('scripts/brief.js', 'same content here\n'.repeat(5)); r.write('app/reader/old.js', 'gone soon');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  // Earlier sessions: a backlog of unmatched work, a move and a delete of realized paths.
  r.write('tools/old-backlog.js', 'x'); r.write('tools/untouched.js', 'x');
  r.sh('mv', 'scripts/brief.js', 'scripts/morning.js');
  r.sh('rm', '-q', 'app/reader/old.js');
  r.sh('add', '.'); r.sh('commit', '-qm', 'earlier');
  const sessionBase = r.sh('rev-parse', 'HEAD');
  // This session: one committed unmatched file, one uncommitted, one untracked, one noise.
  r.write('tools/export.js', 'x'); r.sh('add', '.'); r.sh('commit', '-qm', 'session');
  r.write('tools/old-backlog.js', 'edited');
  r.write('tools/new.js', 'x');
  r.write('data/run.json', '{}');
  const { code, out } = runWith(r.dir, ['--session-base', sessionBase]);
  assert.strictEqual(code, 0);
  assert.strictEqual(out.session_base, sessionBase);
  assert.ok(out.unmatched.includes('tools/untouched.js'));      // still in the range...
  assert.deepStrictEqual(out.session_unmatched, ['tools/export.js', 'tools/new.js', 'tools/old-backlog.js']);
  const moved = Object.fromEntries(out.moved_or_deleted.map((c) => [c.path, c]));
  assert.strictEqual(moved['scripts/morning.js'].status, 'R');
  assert.deepStrictEqual(moved['scripts/morning.js'].nodes, ['brief']);
  assert.strictEqual(moved['app/reader/old.js'].status, 'D');
  assert.strictEqual(out.moved_or_deleted.length, 2);
});

test('moved_or_deleted: a file deleted inside a realized directory that still exists is left out', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE);
  r.write('app/reader/keep.js', '1'); r.write('app/reader/gone.js', '1'); r.write('scripts/brief.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.sh('rm', '-q', 'app/reader/gone.js', 'scripts/brief.js'); r.sh('commit', '-qm', 'del');
  const { out } = r.run();
  assert.deepStrictEqual(out.moved_or_deleted.map((c) => c.path), ['scripts/brief.js']);
});

test('session view: without --session-base it is the uncommitted work only', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('tools/committed.js', 'x'); r.sh('add', '.'); r.sh('commit', '-qm', 'c');
  r.write('tools/new.js', 'x');
  const { out } = r.run();
  assert.strictEqual(out.session_base, out.head);
  assert.deepStrictEqual(out.session_unmatched, ['tools/new.js']);
});

test('session view: an unknown --session-base is a setup problem (exit 3)', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  assert.strictEqual(runWith(r.dir, ['--session-base', 'nope']).code, 3);
});
