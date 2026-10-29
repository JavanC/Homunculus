'use strict';
// Run: node --test skills/purpose-tree/tests/validate.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const V = path.join(__dirname, '..', 'scripts', 'validate.cjs');
const FIX = path.join(__dirname, 'fixtures');

function run(file) {
  try {
    execFileSync('node', [V, file], { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status;
  }
}

for (const f of fs.readdirSync(FIX).filter((x) => x.endsWith('.yaml'))) {
  const expected = f.startsWith('bad-') ? 1 : 0;
  test(`${f} exits ${expected}`, () => assert.strictEqual(run(path.join(FIX, f)), expected));
}

test('template is valid', () => {
  assert.strictEqual(run(path.join(__dirname, '..', 'templates', 'purpose-tree.yaml')), 0);
});

test('missing file exits 2', () => {
  assert.strictEqual(run(path.join(FIX, 'does-not-exist.yaml')), 2);
});

const { parseYaml } = require(V);

test('parser: a leading --- marker is accepted', () => {
  assert.deepStrictEqual(parseYaml('---\nroot:\n  purpose: Why.\n'), { root: { purpose: 'Why.' } });
});

test('parser: a plain scalar over several lines folds into one', () => {
  const doc = parseYaml('root:\n  purpose: Know what matters\n    before the day starts.\n  status: active\n');
  assert.deepStrictEqual(doc.root, { purpose: 'Know what matters before the day starts.', status: 'active' });
});

test('parser: a flow mapping is an error, not a string', () => {
  assert.throws(() => parseYaml('root:\n  realized_by:\n    - {id: x, purpose: y}\n'), /flow mappings/);
});

test('parser: tab indentation is an error', () => {
  assert.throws(() => parseYaml('root:\n\tpurpose: Why.\n'), /line 2: tab/);
});

test('reviewed: missing fields, unknown kind/answer and bad date are errors', () => {
  const { validate } = require(V);
  const doc = parseYaml(`version: "3.0"
root:
  purpose: Root.
  reviewed:
    - kind: split
      said: x
    - kind: rename
      said: x
      answer: maybe
      on: 29/10/2026
    - kind: stale
      said: x
      answer: kept
      on: 2026-10-29
      why: extra
`);
  const errs = validate(doc).errors.join('\n');
  assert.match(errs, /reviewed\[0\]: missing answer/);
  assert.match(errs, /reviewed\[0\]: missing on/);
  assert.match(errs, /reviewed\[1\]: unknown kind "rename"/);
  assert.match(errs, /reviewed\[1\]: answer must be/);
  assert.match(errs, /reviewed\[1\]: on must be YYYY-MM-DD/);
  assert.match(errs, /reviewed\[2\]: unknown field "why"/);
});

test('parser: a comma inside a quoted flow-sequence item does not split it', () => {
  assert.deepStrictEqual(parseYaml('a: ["x.js (gate, per account)", y.js]\n'), { a: ['x.js (gate, per account)', 'y.js'] });
});
