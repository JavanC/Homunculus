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
