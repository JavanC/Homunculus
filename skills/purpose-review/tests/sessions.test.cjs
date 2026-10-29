'use strict';
// Run: node --test skills/purpose-review/tests/sessions.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sessionSignals, redact, commandShapes } = require('../scripts/sessions.cjs');

const NOW = Date.parse('2026-10-29T12:00:00Z');
const SINCE = NOW - 30 * 86400000;
const ROOT = '/work/proj';

function transcripts(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purpose-sessions-'));
  for (const [rel, lines] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n');
  }
  return dir;
}
const user = (sid, cwd, text, extra = {}) => ({ type: 'user', sessionId: sid, cwd, timestamp: '2026-10-20T10:00:00Z', version: '2.1.308', uuid: `${sid}-${text}`, message: { content: text }, ...extra });
const bash = (sid, cwd, command) => ({ type: 'assistant', sessionId: sid, cwd, timestamp: '2026-10-20T10:01:00Z', version: '2.1.308', uuid: `${sid}-${command}`, message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } });

test('redact: keys, tokens, credential URLs, emails, user@host and handles', () => {
  const s = redact('use sk-abcdefghijklmnopqrstu and ghp_abcdefghijklmnop, https://u:pw@host/x, a@b.com, alex@Work-Laptop, @someone, token=xyz123, AKIAABCDEFGHIJKLMNOP');
  for (const leak of ['sk-abc', 'ghp_', 'u:pw', 'a@b.com', 'alex@', '@someone', 'xyz123', 'AKIA']) assert.ok(!s.includes(leak), `${leak} leaked: ${s}`);
  assert.match(s, /^use \[redacted\] and/);
});

test('commandShapes: command and subcommand only; heredocs, quotes and loops dropped', () => {
  assert.deepStrictEqual(
    commandShapes(`cd ~/x && python3 - <<'EOF'\nimport re\nEOF\ngit commit -qm "fix: a; b" && for f in a b; do rm "$f"; done; X=1 npm run test --secret=abc | head -3`),
    ['cd', 'python3', 'git commit', 'rm', 'npm run', 'head']);
});

test('matches sessions by cwd, including a worktree; other repos are ignored', () => {
  const dir = transcripts({
    '-work-proj/a.jsonl': [user('s1', ROOT, 'deploy the docs again'), bash('s1', ROOT + '/sub', 'npm run deploy -- --token abc')],
    '-work-proj-wt/b.jsonl': [user('s2', '/work/proj-wt', 'deploy the docs again')],
    '-work-projector/c.jsonl': [user('s3', '/work/projector', 'not this repo')],
    '-work-other/d.jsonl': [user('s4', '/work/other', 'not this repo')],
  });
  const r = sessionSignals({ roots: [ROOT, '/work/proj-wt'], sinceMs: SINCE, dir });
  assert.strictEqual(r.supported, true);
  assert.deepStrictEqual(r.format_versions, ['2.1.308']);
  assert.strictEqual(r.sessions.length, 2);
  assert.deepStrictEqual(r.sessions.map((s) => s.requests[0]), ['deploy the docs again', 'deploy the docs again']);
  assert.deepStrictEqual(r.sessions.flatMap((s) => s.commands), ['npm run']);
  assert.ok(!JSON.stringify(r).includes('abc'));
});

test('a session copied into a resumed transcript is counted once', () => {
  const lines = [user('s1', ROOT, 'run the release'), bash('s1', ROOT, 'git push origin main')];
  const dir = transcripts({ '-work-proj/a.jsonl': lines, '-work-proj/b.jsonl': lines });
  const r = sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir });
  assert.strictEqual(r.sessions.length, 1);
  assert.deepStrictEqual(r.sessions[0].requests, ['run the release']);
});

test('host wrappers, meta and sidechain messages are not requests', () => {
  const dir = transcripts({ '-work-proj/a.jsonl': [
    user('s1', ROOT, '<command-name>/end</command-name>'),
    user('s1', ROOT, 'meta', { isMeta: true }),
    user('s1', ROOT, 'subagent prompt', { isSidechain: true }),
    user('s1', ROOT, 'real request\nsecond line'),
  ] });
  assert.deepStrictEqual(sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir }).sessions[0].requests, ['real request']);
});

test('unknown format or no transcript directory → supported: false, not an empty list', () => {
  const dir = transcripts({ '-work-proj/a.jsonl': ['{"kind":"something else"}', 'not json'] });
  const r = sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir });
  assert.strictEqual(r.supported, false);
  assert.match(r.reason, /format/);
  assert.strictEqual(r.sessions, undefined);
  const none = sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir: path.join(dir, 'missing') });
  assert.strictEqual(none.supported, false);
});

test('sessions older than the window are left out', () => {
  const old = { ...user('s1', ROOT, 'old work'), timestamp: '2026-08-01T10:00:00Z' };
  const dir = transcripts({ '-work-proj/a.jsonl': [old] });
  assert.deepStrictEqual(sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir }).sessions, []);
});

test('automated runs (sdk entrypoint, non-human origin) are left out and counted', () => {
  const dir = transcripts({ '-work-proj/a.jsonl': [
    user('h1', ROOT, 'fix the release script', { entrypoint: 'claude-desktop', origin: { kind: 'human' } }),
    user('a1', ROOT, 'Time: 2026-10-20 | budget_level: full', { entrypoint: 'sdk-cli' }),
    user('a2', ROOT, 'scheduled digest', { entrypoint: 'claude-desktop', origin: { kind: 'scheduled' } }),
    user('h2', ROOT, 'no origin recorded', { entrypoint: 'cli' }),
  ] });
  const r = sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir });
  assert.deepStrictEqual(r.sessions.map((s) => s.requests[0]), ['fix the release script', 'no origin recorded']);
  assert.strictEqual(r.automated_skipped, 2);
});

test('paths survive redaction; mixed-case tokens do not', () => {
  assert.strictEqual(redact('讀 ~/proj/docs/handoffs/cross-session-handoff-2026-10-28.md 接手'),
    '讀 ~/proj/docs/handoffs/cross-session-handoff-2026-10-28.md 接手');
  assert.strictEqual(redact('key aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3z here'), 'key [redacted] here');
});

test('host-written text in the user turn is not a request', () => {
  const dir = transcripts({ '-work-proj/a.jsonl': [
    user('s1', ROOT, 'This session is being continued from a previous conversation that ran out of context.'),
    user('s1', ROOT, '[Request interrupted by user]'),
    user('s1', ROOT, 'PostCompact [bash ~/x.sh]: ok'),
    user('s1', ROOT, 'push it'),
  ] });
  assert.deepStrictEqual(sessionSignals({ roots: [ROOT], sinceMs: SINCE, dir }).sessions[0].requests, ['push it']);
});
