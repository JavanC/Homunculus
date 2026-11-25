'use strict';
// Run: node --test skills/purpose-tree/tests/pending.test.cjs
// The shared pending path: when nobody can be asked, a skill writes its questions to
// purpose-tree.pending.yaml (committed with the work); any later session reads and applies it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'pending.cjs');
const { parseYaml } = require(path.join(__dirname, '..', 'scripts', 'validate.cjs'));

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-pending-shared-'));
  const sh = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' }).toString().trim();
  sh('init', '-q'); sh('config', 'user.email', 't@example.com'); sh('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'README.md'), 'x');
  sh('add', '.'); sh('commit', '-qm', 'init');
  const run = (args, input) => {
    try { return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { cwd: dir, input: JSON.stringify(input || {}), stdio: 'pipe' }).toString() }; }
    catch (e) { return { code: e.status, out: String(e.stdout), err: String(e.stderr) }; }
  };
  const file = path.join(dir, 'purpose-tree.pending.yaml');
  return { dir, sh, run, file };
}

const TEXT = 'billing: is "Customers pay once" still the purpose? it # changed 4×: 為什麼?';

test('bootstrap: writes purpose-tree.pending.yaml whose items read back verbatim', () => {
  const r = repo();
  const { code, out } = r.run(['--source', 'bootstrap'], { items: [{ kind: 'question', node: 'billing', text: TEXT }, { kind: 'draft', text: 'drafted node "export" (no human confirmed it)' }] });
  assert.strictEqual(code, 0, out);
  const doc = parseYaml(fs.readFileSync(r.file, 'utf8'));
  assert.strictEqual(doc.items.length, 2);
  assert.strictEqual(doc.items[0].text, TEXT);
  assert.strictEqual(doc.items[0].node, 'billing');
  assert.strictEqual(doc.items[0].source, 'bootstrap');
  assert.strictEqual(doc.items[0].n, 1);
  assert.strictEqual(doc.head, r.sh('rev-parse', 'HEAD'));
  assert.ok(out.includes('purpose-tree.pending.yaml'));
  assert.strictEqual(out.trimEnd().split('\n').pop(), 'purpose-review: pending items=2');
});

test('a second run adds new items, drops duplicates and renumbers', () => {
  const r = repo();
  r.run(['--source', 'bootstrap'], { items: [{ kind: 'question', text: 'a?' }] });
  r.run(['--source', 'review'], { items: [{ kind: 'question', text: 'a?' }, { kind: 'proposal', text: 'split billing' }] });
  const doc = parseYaml(fs.readFileSync(r.file, 'utf8'));
  assert.deepStrictEqual(doc.items.map((i) => [i.n, i.source, i.text]), [[1, 'bootstrap', 'a?'], [2, 'review', 'split billing']]);
});

test('no items: nothing is written', () => {
  const r = repo();
  const { code } = r.run(['--source', 'review'], { items: [] });
  assert.strictEqual(code, 0);
  assert.strictEqual(fs.existsSync(r.file), false);
});

test('bad input: unknown kind, multi-line text, unknown source exit 1 and write nothing', () => {
  const r = repo();
  assert.strictEqual(r.run(['--source', 'review'], { items: [{ kind: 'wish', text: 'x' }] }).code, 1);
  assert.strictEqual(r.run(['--source', 'review'], { items: [{ kind: 'question', text: 'a\nb' }] }).code, 1);
  assert.strictEqual(r.run(['--source', 'chat'], { items: [] }).code, 1);
  assert.strictEqual(fs.existsSync(r.file), false);
});

test('--clear removes the file after the answers are applied', () => {
  const r = repo();
  r.run(['--source', 'review'], { items: [{ kind: 'question', text: 'a?' }] });
  const { code, out } = r.run(['--clear']);
  assert.strictEqual(code, 0);
  assert.match(out, /removed purpose-tree\.pending\.yaml/);
  assert.strictEqual(fs.existsSync(r.file), false);
  assert.match(r.run(['--clear']).out, /nothing pending/);
});

test('review round 1: same text on different nodes is kept (dedupe includes node and source)', () => {
  const { addPending } = require('../scripts/pending.cjs');
  const fs = require('fs'), os = require('os'), path = require('path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pend-'));
  const cwd = process.cwd();
  process.chdir(d);
  try {
    const doc = addPending({ source: 'review', items: [{ kind: 'question', node: 'a', text: 'Same?' }, { kind: 'question', node: 'b', text: 'Same?' }] });
    assert.strictEqual(doc.items.length, 2);
    const again = addPending({ source: 'review', items: [{ kind: 'question', node: 'a', text: 'Same?' }] });
    assert.strictEqual(again.items.length, 2);
  } finally { process.chdir(cwd); }
});
