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
