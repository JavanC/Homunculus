'use strict';
// Run: node --test skills/purpose-sync/tests/pending.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'pending.cjs');

const TREE = `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: reader
      purpose: Readers keep their place.
      realized_by:
        - app/reader/
`;

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-pending-'));
  const sh = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' }).toString().trim();
  sh('init', '-q');
  sh('config', 'user.email', 't@example.com');
  sh('config', 'user.name', 't');
  const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
  write('purpose-tree.yaml', TREE);
  sh('add', '.'); sh('commit', '-qm', 'init');
  const run = (input) => {
    try { return { code: 0, out: execFileSync('node', [SCRIPT], { cwd: dir, input: JSON.stringify(input), stdio: 'pipe' }).toString() }; }
    catch (e) { return { code: e.status, out: String(e.stdout), err: String(e.stderr) }; }
  };
  return { dir, sh, write, run };
}

const ITEMS = {
  items: [
    { kind: 'proposal', text: 'reader: add "app/reader/cache.js"' },
    { kind: 'gap', text: 'tools/export.js serves no purpose — which purpose is it for?' },
    { kind: 'review', text: 'reader changed 4 times in 30 days — still "Readers keep their place."?' },
    { kind: 'proposal', text: 'reader: remove "app/reader/old.js" (deleted)' },
  ],
};

test('pending: prints a numbered block and the pending summary line last', () => {
  const r = repo();
  const head = r.sh('rev-parse', 'HEAD');
  const { code, out } = r.run(ITEMS);
  assert.strictEqual(code, 0);
  const lines = out.trimEnd().split('\n');
  assert.strictEqual(lines[lines.length - 1], 'purpose-sync: pending proposed=2 gaps=1 reviews=1');
  assert.strictEqual(lines[0], '```purpose-sync-pending');
  assert.ok(lines.includes(`repo: ${path.basename(r.dir)}`));
  assert.ok(lines.includes('tree: purpose-tree.yaml'));
  assert.ok(lines.includes(`head: ${head}`));
  assert.ok(lines.includes(`last_synced_on_apply: ${head}`));
  assert.ok(lines.includes('1. reader: add "app/reader/cache.js"'));
  assert.ok(lines.includes('2. gap: tools/export.js serves no purpose — which purpose is it for?'));
  assert.ok(lines.includes('3. review: reader changed 4 times in 30 days — still "Readers keep their place."?'));
  assert.ok(lines.includes('4. reader: remove "app/reader/old.js" (deleted)'));
  assert.ok(lines.some((l) => l.startsWith('answer: ')));
  assert.strictEqual(lines[lines.length - 2], '```');
});

test('pending: over the lag limit the baseline is kept on apply', () => {
  const r = repo();
  for (let i = 0; i < 51; i++) r.write(`app/reader/p-${i}.js`, 'x');
  r.sh('add', '.'); r.sh('commit', '-qm', 'reader');
  const { out } = r.run(ITEMS);
  assert.ok(out.split('\n').includes('last_synced_on_apply: keep (51 files behind; the human resets it only on request)'), out);
});

test('pending: nothing to show prints only the ordinary zero summary', () => {
  const r = repo();
  const { code, out } = r.run({ items: [] });
  assert.strictEqual(code, 0);
  assert.strictEqual(out, 'purpose-sync: proposed=0 accepted=0 rejected=0 gaps=0 reviews=0\n');
});

test('pending: never writes the tree', () => {
  const r = repo();
  const before = fs.readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8');
  r.run(ITEMS);
  assert.strictEqual(fs.readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8'), before);
  assert.strictEqual(r.sh('status', '--porcelain'), '');
});

test('pending: bad input is rejected with exit 1', () => {
  const r = repo();
  assert.strictEqual(r.run({ items: [{ kind: 'wish', text: 'x' }] }).code, 1);
  assert.strictEqual(r.run({ nope: true }).code, 1);
});
