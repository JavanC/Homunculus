'use strict';
// Run: node --test skills/purpose-tree/tests/edit.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPTS = path.join(__dirname, '..', 'scripts');
const { setField, confirmNodes } = require(path.join(SCRIPTS, 'edit.cjs'));
const { parseYaml, validate } = require(path.join(SCRIPTS, 'validate.cjs'));
const { collectNodes } = require(path.join(SCRIPTS, 'tree.cjs'));

const TREE = `# keep this comment
version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: brief   # trailing comment
      purpose: >
        Know what matters
        each morning.
      realized_by:
        - scripts/brief.js
        - id: inner
          purpose: Inner one.
    - id: briefing
      purpose: Different node with a similar id.
      status: planned
      paused_reason: later
`;

const nodeOf = (text, id) => collectNodes(parseYaml(text).root).find((n) => n.id === id).node;

test('setField: inserts confirmed right after the node purpose, even a folded multi-line one', () => {
  const out = setField(TREE, 'brief', 'confirmed', ['by: Javan', 'on: 2026-11-20'], { after: 'purpose' });
  assert.deepStrictEqual(nodeOf(out, 'brief').confirmed, { by: 'Javan', on: '2026-11-20' });
  assert.strictEqual(nodeOf(out, 'brief').purpose, 'Know what matters each morning.\n');
  assert.strictEqual(nodeOf(out, 'briefing').confirmed, undefined, 'a similar id is a different node');
  assert.match(out, /^# keep this comment\n/);
  assert.match(out, /- id: brief   # trailing comment\n/);
  assert.deepStrictEqual(validate(parseYaml(out)).errors, []);
});

test('setField: root and a nested node are both addressable', () => {
  let out = setField(TREE, 'root', 'confirmed', ['by: J', 'on: 2026-11-20'], { after: 'purpose' });
  out = setField(out, 'inner', 'confirmed', ['by: J', 'on: 2026-11-20'], { after: 'purpose' });
  assert.strictEqual(nodeOf(out, 'root').confirmed.by, 'J');
  assert.strictEqual(nodeOf(out, 'inner').confirmed.by, 'J');
  assert.strictEqual(nodeOf(out, 'brief').confirmed, undefined);
});

test('setField: at the end of a node, after its children, not inside them', () => {
  const out = setField(TREE, 'brief', 'reviewed', ['- kind: split', '  said: "x"', '  answer: declined', '  on: 2026-11-20'], { after: 'end' });
  assert.strictEqual(nodeOf(out, 'brief').reviewed[0].kind, 'split');
  assert.strictEqual(nodeOf(out, 'inner').reviewed, undefined);
  assert.strictEqual(nodeOf(out, 'briefing').reviewed, undefined);
  assert.strictEqual(nodeOf(out, 'briefing').status, 'planned');
});

test('setField: an existing field is replaced, not duplicated', () => {
  const once = setField(TREE, 'inner', 'reviewed', ['- kind: stale', '  said: a', '  answer: kept', '  on: 2026-11-01'], { after: 'end' });
  const twice = setField(once, 'inner', 'reviewed', ['- kind: stale', '  said: b', '  answer: kept', '  on: 2026-11-20'], { after: 'end' });
  assert.strictEqual(nodeOf(twice, 'inner').reviewed.length, 1);
  assert.strictEqual(nodeOf(twice, 'inner').reviewed[0].said, 'b');
  assert.deepStrictEqual(validate(parseYaml(twice)).errors, []);
});

test('setField: an unknown node id throws', () => {
  assert.throws(() => setField(TREE, 'nope', 'confirmed', ['by: J'], { after: 'purpose' }), /node "nope" not found/);
});

test('confirmNodes: confirms only unconfirmed nodes, leaves the rest alone', () => {
  const first = confirmNodes(TREE, ['brief'], 'Javan', '2026-11-19');
  assert.deepStrictEqual(first.done, ['brief']);
  const second = confirmNodes(first.text, 'all', 'Javan', '2026-11-20');
  assert.deepStrictEqual(second.done, ['root', 'inner', 'briefing']);
  const all = second.text;
  assert.strictEqual(nodeOf(all, 'brief').confirmed.on, '2026-11-19', 'already confirmed: not overwritten');
  for (const id of ['root', 'inner', 'briefing']) assert.strictEqual(nodeOf(all, id).confirmed.on, '2026-11-20');
  assert.deepStrictEqual(validate(parseYaml(all)).warnings, []);
});

test('confirm.cjs CLI: writes the tree, validates, and reports what it confirmed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-confirm-'));
  const f = path.join(dir, 'purpose-tree.yaml');
  fs.writeFileSync(f, TREE);
  const out = execFileSync('node', [path.join(SCRIPTS, 'confirm.cjs'), f, '--by', 'Javan', '--on', '2026-11-20', '--all'], { stdio: 'pipe' }).toString();
  assert.match(out, /confirmed 4: root, brief, inner, briefing/);
  assert.deepStrictEqual(validate(parseYaml(fs.readFileSync(f, 'utf8'))).warnings, []);
  assert.throws(() => execFileSync('node', [path.join(SCRIPTS, 'confirm.cjs'), f, '--by', 'J', 'ghost'], { stdio: 'pipe' }), /not found|status 1/);
});

test('review round 1: a block scalar ending in a #-line keeps it inside the field', () => {
  const { setField } = require('../scripts/edit.cjs');
  const { parseYaml } = require('../scripts/validate.cjs');
  const t = 'version: "3.0"\nroot:\n  purpose: R.\n  status_note: |\n    multi\n    # not a comment\n';
  const out = setField(t, 'root', 'confirmed', ['by: J', 'on: 2026-11-20'], { after: 'end' });
  assert.strictEqual(parseYaml(out).root.status_note, 'multi\n# not a comment\n');
});
