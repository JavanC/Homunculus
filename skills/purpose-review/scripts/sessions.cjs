'use strict';
// sessions.cjs — de-identified signals from the host's local session transcripts for one
// repo, for spotting repeated manual work. Used only by review.cjs --sessions. Zero
// dependencies. Reads files; stores and sends nothing.
//
// Claude Code keeps transcripts under ~/.claude/projects/<slug>/*.jsonl in an undocumented
// format. We rely only on: one JSON object per line, `type`, `sessionId`, `cwd`, `timestamp`,
// `version`, `entrypoint` and `origin.kind` (to leave out automated runs), user `message.content` (string or [{type:'text', text}]), and assistant
// `tool_use` blocks named Bash with `input.command`. Anything else → supported: false.

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_REQUEST = 120;

// Secret-looking values become a placeholder. Patterns miss some secrets by nature, which is
// why --sessions is opt-in.
const SECRETS = [
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@\S+/gi,               // URL with credentials
  /\b[\w.+-]+@[\w-]+(\.[\w.-]+)?\b/g,                               // email, user@host
  /(?<=^|\s)@[A-Za-z0-9_.]{2,}/g,                                    // @handle
  /\b(sk|pk|rk)-[A-Za-z0-9_-]{16,}\b/g,                              // sk-… style API keys
  /\b(ghp|gho|ghu|ghs|github_pat|glpat|xox[abprs])[-_][A-Za-z0-9_-]{10,}\b/g, // GitHub, GitLab, Slack
  /\bAKIA[0-9A-Z]{16}\b/g,                                           // AWS access key id
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,                             // bearer tokens
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, // JWT
  /\b[A-Fa-f0-9]{32,}\b/g,                                           // long hex
  /\b(?=[A-Za-z0-9+/_-]*\d[A-Za-z0-9+/_-]*\d)(?=[A-Za-z0-9+/_-]*[A-Z][A-Za-z0-9+/_-]*[A-Z])(?=[A-Za-z0-9+/_-]*[a-z])[A-Za-z0-9+/_-]{32,}={0,2}/g, // long mixed-case token (not a path)
  /\b(password|passwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi,     // key=value
];
function redact(s) {
  return SECRETS.reduce((acc, re) => acc.replace(re, '[redacted]'), s);
}

// Text the host writes into the user turn: compaction summaries, interruptions, hook output.
const HOST_TEXT = /^(This session is being continued from a previous conversation|\[Request interrupted by user|PostCompact |PreCompact |SessionStart |Stop hook )/i;

// First line of a user request, without wrappers the host adds (<command-name>, reminders).
function requestLine(content) {
  const text = typeof content === 'string' ? content
    : Array.isArray(content) ? content.filter((c) => c && c.type === 'text').map((c) => c.text).join('\n')
    : '';
  const line = text.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('<'));
  if (line && HOST_TEXT.test(line)) return null;
  if (!line) return null;
  return redact(line).slice(0, MAX_REQUEST);
}

// Each simple command in a shell line, reduced to its command and subcommand. Heredoc
// bodies and quoted strings are dropped first: they hold data (commit messages, scripts),
// not commands.
const SHELL_WORDS = new Set(['while', 'until', 'do', 'done', 'if', 'then', 'elif', 'else', 'fi', 'esac', '{', '}', '!', 'time']);
const LOOP_HEADS = new Set(['for', 'case', 'select']);
function commandShapes(cmd) {
  const text = String(cmd)
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g, '')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
  const out = [];
  for (const part of text.split(/&&|\|\||[;|\n()`]/)) {
    const toks = part.trim().split(/\s+/).filter((t) => t && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)); // drop VAR=x
    while (toks.length && SHELL_WORDS.has(toks[0])) toks.shift();
    if (!toks.length || LOOP_HEADS.has(toks[0])) continue;
    let name = path.basename(toks[0]);
    if (!/^[A-Za-z_][\w.+-]*$/.test(name)) continue;
    if (toks[1] && /^[a-z][a-z0-9-]*$/.test(toks[1])) name += ' ' + toks[1];
    out.push(name);
  }
  return out;
}

function slug(p) {
  return p.replace(/[^A-Za-z0-9]/g, '-');
}

// roots: the repo root and every worktree of it. Returns { supported, ... }.
function sessionSignals({ roots, sinceMs, dir = process.env.PURPOSE_REVIEW_TRANSCRIPTS || path.join(os.homedir(), '.claude', 'projects') }) {
  if (!fs.existsSync(dir)) return { supported: false, reason: `no transcript directory at ${dir} (only Claude Code is supported)` };
  const inRepo = (cwd) => typeof cwd === 'string' && roots.some((r) => cwd === r || cwd.startsWith(r + '/'));
  const slugs = roots.map(slug);
  const dirs = fs.readdirSync(dir).filter((d) => slugs.some((s) => d === s || d.startsWith(s + '-')));

  const sessions = new Map();
  const versions = new Set();
  let lines = 0;
  let understood = 0;
  for (const d of dirs) {
    const full = path.join(dir, d);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full).filter((x) => x.endsWith('.jsonl'))) {
      const file = path.join(full, f);
      if (fs.statSync(file).mtimeMs < sinceMs) continue;
      for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!raw.trim()) continue;
        lines++;
        let o;
        try { o = JSON.parse(raw); } catch { continue; }
        if (!o || typeof o.type !== 'string' || typeof o.sessionId !== 'string') continue;
        understood++;
        if (o.version) versions.add(String(o.version));
        if (!inRepo(o.cwd)) continue;
        const t = Date.parse(o.timestamp);
        if (!Number.isFinite(t) || t < sinceMs) continue;
        const s = sessions.get(o.sessionId) || { date: null, requests: [], commands: [], seen: new Set(), headless: false, origins: new Set() };
        if (typeof o.entrypoint === 'string' && o.entrypoint.startsWith('sdk')) s.headless = true;
        if (o.type === 'user' && o.origin && o.origin.kind) s.origins.add(o.origin.kind);
        if (o.uuid && s.seen.has(o.uuid)) continue; // the same line copied into a resumed session
        if (o.uuid) s.seen.add(o.uuid);
        const day = new Date(t).toISOString().slice(0, 10);
        if (!s.date || day < s.date) s.date = day;
        const content = o.message && o.message.content;
        if (o.type === 'user' && !o.isMeta && !o.isSidechain) {
          const r = requestLine(content);
          if (r) s.requests.push(r);
        } else if (o.type === 'assistant' && Array.isArray(content)) {
          for (const c of content) {
            if (c && c.type === 'tool_use' && c.name === 'Bash' && c.input && c.input.command) s.commands.push(...commandShapes(c.input.command));
          }
        }
        sessions.set(o.sessionId, s);
      }
    }
  }
  if (lines > 0 && understood === 0) return { supported: false, reason: 'transcript format not recognised' };
  // Scheduled and scripted runs (claude -p, the SDK) are automation already, not manual work
  // to spot: leave them out, and say how many.
  const all = [...sessions.values()].filter((s) => s.requests.length || s.commands.length);
  const automated = (s) => s.headless || (s.origins.size > 0 && !s.origins.has('human'));
  const list = all.filter((s) => !automated(s))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(({ date, requests, commands }) => ({ date, requests, commands: [...new Set(commands)] }));
  return { supported: true, host: 'claude-code', format_versions: [...versions].sort(), automated_skipped: all.length - list.length, sessions: list };
}

module.exports = { sessionSignals, redact, commandShapes, requestLine };
