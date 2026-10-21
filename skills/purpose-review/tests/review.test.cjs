'use strict';
// Run: node --test skills/purpose-review/tests/review.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'review.cjs');

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-review-'));
  const sh = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' }).toString().trim();
  sh('init', '-q');
  sh('config', 'user.email', 't@example.com');
  sh('config', 'user.name', 't');
  const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
  const run = (...args) => JSON.parse(execFileSync('node', [SCRIPT, ...args], { cwd: dir, stdio: 'pipe' }).toString());
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
        - scripts/gone.js
      health_check:
        command: "exit 1"
        expected: exit 0
    - id: empty_one
      purpose: Has nothing yet.
      status: planned
      paused_reason: later
`;

test('no tree → bootstrap inventory without plumbing', () => {
  const r = repo();
  r.write('src/a.js', '1'); r.write('src/b.js', '1'); r.write('README.md', 'x'); r.write('tests/t.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.strictEqual(out.mode, 'bootstrap');
  assert.deepStrictEqual(out.inventory, [{ entry: 'src/', files: 2 }]);
  assert.deepStrictEqual(out.intent_docs, ['README.md']);
});

test('bootstrap inventory goes one level deeper into feature areas', () => {
  const r = repo();
  r.write('src/compliance/a.js', '1'); r.write('src/compliance/b.js', '1');
  r.write('src/sync/c.js', '1'); r.write('src/main.js', '1'); r.write('ops/deploy.sh', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.deepStrictEqual(out.inventory, [
    { entry: 'ops/', files: 1 },
    { entry: 'src/', files: 4, areas: [{ entry: 'src/compliance/', files: 2 }, { entry: 'src/sync/', files: 1 }] },
  ]);
});

test('bootstrap lists intent docs: README, agent files, briefs, ADRs, docs/', () => {
  const r = repo();
  for (const f of ['README.md', 'CLAUDE.md', 'AGENTS.md', 'docs/product-brief.md', 'docs/adr/0001-db.md',
    'app/README.md', 'PRD.md', 'src/x.js', 'notes.txt']) r.write(f, 'x');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.deepStrictEqual(out.intent_docs.sort(), ['AGENTS.md', 'CLAUDE.md', 'PRD.md', 'README.md', 'app/README.md',
    'docs/adr/0001-db.md', 'docs/product-brief.md']);
});

test('review finds missing paths, empty nodes, unowned entries', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1'); r.write('app/x.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.strictEqual(out.mode, 'review');
  assert.deepStrictEqual(out.problems, []);
  assert.deepStrictEqual(out.missing_paths, [{ id: 'brief', path: 'scripts/gone.js' }]);
  assert.deepStrictEqual(out.nodes_without_implementation, ['empty_one']);
  assert.deepStrictEqual(out.unowned.map((e) => e.entry), ['app/']);
  assert.strictEqual(out.health_checks[0].exit, undefined);
});

test('--run-checks records a failing health check', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run('--run-checks');
  assert.strictEqual(out.health_checks[0].id, 'brief');
  assert.strictEqual(out.health_checks[0].exit, 1);
});

test('stale: nodes unchanged for longer than --stale-days', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1');
  r.sh('add', '.');
  execFileSync('git', ['commit', '-qm', 'old'], { cwd: r.dir, env: { ...process.env, GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z', GIT_AUTHOR_DATE: '2020-01-01T00:00:00Z' } });
  const out = r.run();
  const ids = out.stale.map((s) => s.id).sort();
  assert.deepStrictEqual(ids, ['brief', 'empty_one', 'root']);
  assert.strictEqual(out.stale.find((s) => s.id === 'empty_one').status, 'planned');
  assert.deepStrictEqual(r.run('--stale-days', '100000').stale, []);
});
