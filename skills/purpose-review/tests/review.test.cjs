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

test('non-ASCII file names are not split into a separate quoted entry', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE); r.write('scripts/brief.js', '1'); r.write('app/簡報.pptx', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const unowned = r.run().unowned;
  assert.deepStrictEqual(unowned.map((e) => e.entry), ['app/']);
  assert.strictEqual(unowned[0].files, 1);
});

test('unowned entries named in a status_note or paused_reason carry noted_by', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE.replace('      paused_reason: later', '      paused_reason: "move app/ out of git first"')
    .replace('    - id: brief\n', '    - id: brief\n      status_note: "vendor stays here; myapp is unrelated"\n'));
  for (const f of ['scripts/brief.js', 'app/x.js', 'vendor/y.js', 'my/z.js']) r.write(f, '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const by = Object.fromEntries(r.run().unowned.map((e) => [e.entry, e.noted_by]));
  assert.deepStrictEqual(by, { 'app/': ['empty_one'], 'vendor/': ['brief'], 'my/': undefined });
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

test('pathTokens keeps real paths and drops routes, commands, slugs, emails, versions, globs', () => {
  const { pathTokens } = require(SCRIPT);
  const toks = pathTokens('scripts/a.js; /api/timer /end JavanC/Homunculus me@x.com v2.0.1 example.com src/*.js docs/ ~/other/x.md ~/proj/lib/y.ts core/p/{index,util}.js', 'proj');
  assert.deepStrictEqual([...toks].sort(), ['core/p/index.js', 'core/p/util.js', 'docs/', 'lib/y.ts', 'scripts/a.js']);
});

test('review resolves subdirectory-relative paths and does not flag prose tokens', () => {
  const r = repo();
  r.write('daily-news/sources/twitter.sh', '1'); r.write('scripts/real.js', '1');
  r.write('purpose-tree.yaml', `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: news
      purpose: Know the news.
      realized_by:
        - twitter.sh, scripts/real.js, /api/timer, JavanC/Homunculus, scripts/gone.js
`);
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.deepStrictEqual(out.missing_paths, [{ id: 'news', path: 'scripts/gone.js' }]);
  assert.deepStrictEqual(out.unowned, []);
});

test('unparseable tree → exit 4 with mode unparseable and bootstrap facts', () => {
  const r = repo();
  r.write('purpose-tree.yaml', 'root:\n  realized_by:\n    - {id: x}\n'); r.write('README.md', '# x');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  let e;
  try { execFileSync('node', [SCRIPT], { cwd: r.dir, stdio: 'pipe' }); } catch (x) { e = x; }
  assert.strictEqual(e && e.status, 4);
  const out = JSON.parse(e.stdout.toString());
  assert.strictEqual(out.mode, 'unparseable');
  assert.strictEqual(out.tree, 'purpose-tree.yaml');
  assert.match(out.error, /flow mappings/);
  assert.ok(out.intent_docs.includes('README.md'));
});

test('coarse_implementations: a directory implementation holding 3+ feature areas', () => {
  const r = repo();
  r.write('purpose-tree.yaml', `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: analysis
      purpose: Understand quotes.
      realized_by:
        - scripts/analysis/
    - id: small
      purpose: Small one.
      realized_by:
        - lib/
`);
  for (const a of ['gap', 'fill', 'route']) for (let i = 0; i < 3; i++) r.write(`scripts/analysis/${a}/f${i}.js`, '1');
  r.write('scripts/analysis/thin/one.js', '1');                 // < 3 files: not an area
  for (const a of ['x', 'y']) for (let i = 0; i < 3; i++) r.write(`lib/${a}/f${i}.js`, '1');   // only 2 areas
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.deepStrictEqual(out.coarse_implementations.map((c) => c.id), ['analysis']);
  assert.deepStrictEqual(out.coarse_implementations[0].areas.map((a) => a.entry).sort(),
    ['scripts/analysis/fill/', 'scripts/analysis/gap/', 'scripts/analysis/route/']);
});

test('commits_by_node, reviewed with stale re-ask, and node depth', () => {
  const r = repo();
  r.write('purpose-tree.yaml', `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: brief
      purpose: Morning.
      realized_by:
        - scripts/brief.js
        - id: brief_mail
          purpose: Mail it.
          realized_by:
            - scripts/mail.js
      reviewed:
        - kind: stale
          said: purpose still true
          answer: kept
          on: 2026-01-01
        - kind: split
          said: split mail out
          answer: declined
          on: 2099-01-01
`);
  r.write('scripts/brief.js', '1'); r.write('scripts/mail.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.write('scripts/brief.js', '2'); r.sh('commit', '-qam', 'fix brief again');
  r.write('scripts/brief.js', '3'); r.write('scripts/mail.js', '2'); r.sh('commit', '-qam', 'fix both');
  r.write('purpose-tree.yaml', require('fs').readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8') + '\n'); r.sh('commit', '-qam', 'tree only');
  const out = r.run('--days', '30');
  assert.strictEqual(out.window_days, 30);
  assert.strictEqual(out.commits_by_node.brief.count, 3);
  assert.deepStrictEqual(out.commits_by_node.brief.subjects, ['init', 'fix brief again', 'fix both']);
  assert.strictEqual(out.commits_by_node.brief_mail.count, 2);
  assert.ok(!Object.values(out.commits_by_node).some((e) => e.subjects.includes('tree only')));
  assert.deepStrictEqual(out.reviewed.brief.map((e) => [e.kind, e.reask]), [['stale', true], ['split', false]]);
  assert.strictEqual(out.reviewed.brief_mail, undefined);
  assert.deepStrictEqual(out.nodes.brief_mail, { parent: 'brief', depth: 2 });
  assert.deepStrictEqual(out.nodes.root, { parent: null, depth: 0 });
  assert.strictEqual(out.session_signals, undefined);
});

test('structure signals: spread over 3+ areas, siblings sharing a path, unowned areas', () => {
  const r = repo();
  r.write('purpose-tree.yaml', `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: wide
      purpose: Does many things.
      realized_by:
        - src/sync/a.js
        - src/auth/b.js
        - src/billing/c.js
    - id: nested
      purpose: Not spread, only nested.
      realized_by:
        - scripts/one.js
        - scripts/sub/two.js
        - src/sync/d.js
    - id: narrow
      purpose: One thing.
      realized_by:
        - src/sync/a.js
        - src/sync/d.js
`);
  for (const f of ['src/sync/a.js', 'src/sync/d.js', 'src/auth/b.js', 'src/billing/c.js']) r.write(f, '1');
  for (const d of ['sync', 'auth', 'billing']) for (let i = 0; i < 3; i++) r.write(`src/${d}/pad${i}.js`, '1'); // each a feature area
  r.write('scripts/one.js', '1'); r.write('scripts/sub/two.js', '1');   // nested, not a feature area
  for (let i = 0; i < 3; i++) r.write(`tools/gen/f${i}.js`, '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.deepStrictEqual(out.spread, [{ id: 'wide', areas: ['src/auth/', 'src/billing/', 'src/sync/'] }]);
  assert.deepStrictEqual(out.shared_implementations, [
    { ids: ['wide', 'narrow'], paths: ['src/sync/a.js'] },
    { ids: ['nested', 'narrow'], paths: ['src/sync/d.js'] },
  ]);
  const tools = out.unowned.find((e) => e.entry === 'tools/');
  assert.deepStrictEqual(tools.areas, [{ entry: 'tools/gen/', files: 3 }]);
});
