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
        fails_when: HEALTH_EMPTY=1
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

test('review fixes: bad reviewed entries and duplicate ids do not crash; @@ file names are files', () => {
  const r = repo();
  r.write('purpose-tree.yaml', TREE.replace('      paused_reason: later', '      paused_reason: later\n      reviewed:\n        -\n      realized_by:\n        - id: empty_one\n          purpose: dup\n          realized_by: [scripts/brief.js]'));
  r.write('scripts/brief.js', '1'); r.write('@@oops.js', '1');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  const out = r.run();
  assert.ok(out.problems.length > 0);
  assert.ok(out.commits_by_node.brief.count >= 1);
});

// ── confirmed, changes_since_synced, --record, pending ───────────────────

const CTREE = `# project tree
version: "3.0"
root:
  purpose: Root.
  confirmed:
    by: Javan
    on: 2026-11-19
  realized_by:
    - id: brief
      purpose: Know what matters each morning.
      realized_by:
        - scripts/brief.js
    - id: export
      purpose: Data can leave the system.
      confirmed:
        by: Javan
        on: 2026-11-19
      realized_by:
        - scripts/export.js
`;

function crepo(tree = CTREE) {
  const r = repo();
  r.write('scripts/brief.js', '1'); r.write('scripts/export.js', '1'); r.write('purpose-tree.yaml', tree);
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  r.raw = (...args) => {
    try { return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { cwd: r.dir, stdio: 'pipe' }).toString() }; }
    catch (e) { return { code: e.status, out: String(e.stdout), err: String(e.stderr) }; }
  };
  return r;
}

test('unconfirmed nodes are the first health fact, shallowest first; confirming one removes it', () => {
  const r = crepo();
  const out = r.run();
  assert.deepStrictEqual(Object.keys(out).slice(0, 3), ['mode', 'tree', 'unconfirmed']);
  assert.deepStrictEqual(out.unconfirmed, [{ id: 'brief', depth: 1, purpose: 'Know what matters each morning.' }]);
  r.write('purpose-tree.yaml', CTREE.replace('      confirmed:\n        by: Javan\n        on: 2026-11-19\n', ''));
  const out2 = r.run();
  assert.deepStrictEqual(out2.unconfirmed.map((u) => u.id), ['brief', 'export']);
  assert.ok(out2.warnings.some((w) => /export: draft \(no confirmed\)/.test(w)));
});

test('a fully confirmed tree reports an empty unconfirmed list', () => {
  const r = crepo(CTREE.replace('    - id: brief\n      purpose: Know what matters each morning.\n', '    - id: brief\n      purpose: Know what matters each morning.\n      confirmed:\n        by: J\n        on: 2026-11-19\n'));
  assert.deepStrictEqual(r.run().unconfirmed, []);
});

test('changes_since_synced: the diff since last_synced, noise directories left out', () => {
  const r = crepo(CTREE.replace('version: "3.0"\n', `version: "3.0"\nlast_synced: PLACEHOLDER\n`).replace('PLACEHOLDER', 'x'));
  const base = r.sh('rev-parse', 'HEAD');
  r.write('purpose-tree.yaml', fs.readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8').replace('last_synced: x', `last_synced: ${base}`));
  r.write('scripts/brief.js', '2'); r.write('scripts/new.js', '1'); r.write('data/out.json', '{}');
  r.sh('add', '.'); r.sh('commit', '-qm', 'more');
  const c = r.run().changes_since_synced;
  assert.strictEqual(c.base, base);
  assert.strictEqual(c.base_source, 'last_synced');
  assert.deepStrictEqual(c.changes.map((x) => [x.path, x.nodes]).sort(), [['scripts/brief.js', ['brief']], ['scripts/new.js', []]]);
  assert.strictEqual(c.lag, 1);
  assert.deepStrictEqual(c.unmatched, ['scripts/new.js']);
});

const answersFile = (r, body) => { const f = path.join(r.dir, 'answers.json'); fs.writeFileSync(f, JSON.stringify(body)); return f; };

test('--record writes reviewed entries; the next review lists them and the tree stays valid', () => {
  const r = crepo();
  const f = answersFile(r, { on: '2026-11-20', answers: [
    { node: 'brief', kind: 'split', said: 'split brief into daily vs weekly', answer: 'declined', evidence: 'scripts/' },
    { node: 'export', kind: 'stale', said: 'purpose still true', answer: 'kept' },
  ] });
  const res = r.raw('--record', f);
  assert.strictEqual(res.code, 0, res.err);
  assert.deepStrictEqual(JSON.parse(res.out), { recorded: 2, confirmed: 0, tree: 'purpose-tree.yaml' });
  const text = fs.readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8');
  assert.match(text, /^# project tree\n/);
  const next = r.run();
  assert.deepStrictEqual(next.problems, []);
  assert.strictEqual(next.reviewed.brief[0].kind, 'split');
  assert.strictEqual(next.reviewed.brief[0].answer, 'declined');
  assert.strictEqual(next.reviewed.brief[0].on, '2026-11-20');
  assert.strictEqual(next.reviewed.brief[0].evidence, 'scripts/');
  assert.strictEqual(next.reviewed.export[0].answer, 'kept');
});

test('--record: the same suggestion answered again updates its entry, other entries stay', () => {
  const r = crepo();
  const a = (said, answer, on) => answersFile(r, { on, answers: [{ node: 'brief', kind: 'split', said, answer }] });
  r.raw('--record', a('split it', 'declined', '2026-11-01'));
  r.raw('--record', a('merge it', 'declined', '2026-11-02'));
  r.raw('--record', a('split it', 'accepted', '2026-11-20'));
  const reviewed = r.run().reviewed.brief;
  assert.deepStrictEqual(reviewed.map((x) => [x.said, x.answer, x.on]), [['split it', 'accepted', '2026-11-20'], ['merge it', 'declined', '2026-11-02']]);
});

test('--record can also confirm nodes when the human said so', () => {
  const r = crepo();
  const res = r.raw('--record', answersFile(r, { on: '2026-11-20', answers: [], confirm: [{ node: 'brief', by: 'Javan' }] }));
  assert.strictEqual(res.code, 0, res.err);
  assert.strictEqual(JSON.parse(res.out).confirmed, 1);
  assert.deepStrictEqual(r.run().unconfirmed, []);
});

test('--record: an unknown node or a bad answer exits 1 and leaves the tree untouched', () => {
  const r = crepo();
  const before = fs.readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8');
  const ghost = r.raw('--record', answersFile(r, { answers: [{ node: 'ghost', kind: 'split', said: 'x', answer: 'declined' }] }));
  assert.strictEqual(ghost.code, 1);
  assert.match(ghost.err, /ghost/);
  const bad = r.raw('--record', answersFile(r, { answers: [{ node: 'brief', kind: 'split', said: 'x', answer: 'maybe' }] }));
  assert.strictEqual(bad.code, 1);
  assert.strictEqual(fs.readFileSync(path.join(r.dir, 'purpose-tree.yaml'), 'utf8'), before);
});

test('pending: items in purpose-tree.pending.yaml are listed in the review output', () => {
  const r = crepo();
  assert.strictEqual(r.run().pending, null);
  r.write('purpose-tree.pending.yaml', 'version: 1\nrepo: "x"\ntree: "purpose-tree.yaml"\nhead: "abc"\nitems:\n  - n: 1\n    source: sync\n    kind: proposal\n    text: "brief: add \\"scripts/x.js\\""\n');
  const p = r.run().pending;
  assert.strictEqual(p.file, 'purpose-tree.pending.yaml');
  assert.strictEqual(p.items[0].text, 'brief: add "scripts/x.js"');
});

// --- negative control: a health_check must be able to fail ---
const hcTree = (hc) => `version: "3.0"
root:
  purpose: Root.
  realized_by:
    - id: logs
      purpose: The log keeps growing.
      realized_by:
        - scripts/a.js
      health_check:
${hc}
`;
const hcRepo = (hc) => {
  const r = repo();
  r.write('purpose-tree.yaml', hcTree(hc)); r.write('scripts/a.js', '1'); r.write('data/log.jsonl', '{}\n');
  r.sh('add', '.'); r.sh('commit', '-qm', 'init');
  return r;
};
const status = (hc) => hcRepo(hc).run('--run-checks').health_checks[0];

for (const cmd of ['test -f data/log.jsonl && true', 'cat data/log.jsonl > /dev/null', 'true', 'grep -c . data/log.jsonl || true']) {
  test(`bypass is a false green: ${cmd}`, () => {
    const c = status(`        command: "${cmd}"\n        fails_when: ": > data/log.jsonl"`);
    assert.strictEqual(c.status, 'false_green');
  });
}

test('a check that really needs entries survives the same negative control', () => {
  const c = status('        command: "test -s data/log.jsonl"\n        fails_when: ": > data/log.jsonl"');
  assert.strictEqual(c.status, 'ok');
});

test('positive control: test -f with a real fails_when passes', () => {
  const c = status('        command: "test -f data/log.jsonl"\n        fails_when: "rm -f data/log.jsonl"');
  assert.strictEqual(c.status, 'ok');
  assert.strictEqual(c.exit, 0);
  assert.notStrictEqual(c.negative_exit, 0);
});

test('fails_when negative run happens in a copy: real data survives', () => {
  const r = hcRepo('        command: "test -f data/log.jsonl"\n        fails_when: "rm -f data/log.jsonl"');
  r.run('--run-checks');
  assert.ok(fs.existsSync(path.join(r.dir, 'data/log.jsonl')));
});

test('fails_when as env assignment is passed to the check', () => {
  const ok = status('        command: "test -z \\"$HEALTH_EMPTY\\""\n        fails_when: HEALTH_EMPTY=1');
  assert.strictEqual(ok.status, 'ok');
  const bad = status('        command: "true"\n        fails_when: HEALTH_EMPTY=1');
  assert.strictEqual(bad.status, 'false_green');
});

test('no fails_when = no check, not run, not green', () => {
  const c = status('        command: "true"');
  assert.strictEqual(c.status, 'no_check');
  assert.strictEqual(c.exit, undefined);
});

test('a failing check is reported failing without a negative run', () => {
  const c = status('        command: "exit 1"\n        fails_when: HEALTH_EMPTY=1');
  assert.strictEqual(c.status, 'failing');
});

test('manual check: fresh vs overdue by last_run', () => {
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const fresh = status(`        kind: manual\n        owner: javan\n        last_run: ${day(3)}`);
  assert.strictEqual(fresh.status, 'manual_ok');
  assert.strictEqual(fresh.owner, 'javan');
  const old = status(`        kind: manual\n        owner: javan\n        last_run: ${day(90)}`);
  assert.strictEqual(old.status, 'manual_overdue');
  const every = status(`        kind: manual\n        owner: javan\n        every_days: 2\n        last_run: ${day(3)}`);
  assert.strictEqual(every.status, 'manual_overdue');
});

// --- review round 1 ---
test('F1: negative run never truncates data reached through a symlink', () => {
  const r = hcRepo('        command: "test -s data/latest.jsonl"\n        fails_when: ": > data/latest.jsonl"');
  fs.symlinkSync('log.jsonl', path.join(r.dir, 'data/latest.jsonl'));
  r.sh('add', '.'); r.sh('commit', '-qm', 'link');
  const c = r.run('--run-checks').health_checks[0];
  assert.strictEqual(fs.statSync(path.join(r.dir, 'data/log.jsonl')).size, 3);
  assert.strictEqual(c.status, 'negative_error');
});

test('F3: a check that fails in the copy for unrelated reasons is not "ok"', () => {
  const c = status('        command: "git log -1 | grep -q ."\n        fails_when: "true"');
  assert.strictEqual(c.status, 'negative_error');
});

test('F4: a FIFO in the project does not crash review', () => {
  const r = hcRepo('        command: "test -s data/log.jsonl"\n        fails_when: ": > data/log.jsonl"');
  execFileSync('mkfifo', [path.join(r.dir, 'data/pipe')]);
  const c = r.run('--run-checks').health_checks[0];
  assert.strictEqual(c.status, 'ok');
});

test('F6: non-string fails_when is no check', () => {
  assert.strictEqual(status('        command: "true"\n        fails_when: true').status, 'no_check');
});

test('F7: env form is linear-time and a quoted value is not mistaken for a command', () => {
  const t = Date.now();
  const c = status('        command: "true"\n        fails_when: "' + 'A= '.repeat(30) + 'x"');
  assert.ok(Date.now() - t < 5000);
  assert.notStrictEqual(c.status, 'ok');
});

test('F8: a future last_run is not fresh', () => {
  const f = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  assert.strictEqual(status(`        kind: manual\n        owner: j\n        last_run: ${f}`).status, 'manual_overdue');
});

test('acceptance 4: continuity over target fails the check, within target passes', () => {
  const mk = (days) => {
    const r = repo();
    r.write('purpose-tree.yaml', hcTree('        command: "node scripts/c.js"\n        fails_when: \'echo {"days":5} > data/continuity.json\''));
    r.write('scripts/a.js', '1');
    r.write('scripts/c.js', "const d=JSON.parse(require('fs').readFileSync('data/continuity.json','utf8')).days;process.exit(d<=2?0:1)");
    r.write('data/continuity.json', JSON.stringify({ days }));
    r.sh('add', '.'); r.sh('commit', '-qm', 'i');
    return r.run('--run-checks').health_checks[0];
  };
  assert.strictEqual(mk(5).status, 'failing');
  assert.strictEqual(mk(1).status, 'ok');
});
