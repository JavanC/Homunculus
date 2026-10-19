#!/usr/bin/env node
'use strict';
// validate.js — check a purpose tree against schema v3.0. Zero dependencies.
// Usage: node validate.js [path]   (default: ./purpose-tree.yaml, then ./architecture.yaml)
// A .md path validates the first ```yaml block in it.
// Exit 0 = valid, 1 = problems found, 2 = file missing or unparseable.

const fs = require('fs');
const path = require('path');

// ── Minimal YAML subset parser ────────────────────────────────────────────
// Supports: block mappings, block sequences (of scalars or mappings), quoted and
// plain scalars, flow sequences of scalars ([a, b]), empty flow {} / [],
// folded/literal block scalars (> >- | |-), and # comments.

function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}

function scalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === '{}') return {};
  if (s === '[]') return [];
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== null);
  }
  if (s.length > 1 && s.startsWith('"') && s.endsWith('"')) {
    const esc = { n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/', r: '\r', '0': '\0' };
    return s.slice(1, -1).replace(/\\(.)/g, (m, c) => (c in esc ? esc[c] : m));
  }
  if (s.length > 1 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s)) return Number(s);
  return s;
}

function parseYaml(text) {
  const lines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    lines.push({ raw, n: i + 1 });
  });
  let i = 0;

  const indentOf = (s) => s.match(/^ */)[0].length;
  const isBlank = (s) => stripComment(s).trim() === '';

  function skipBlank() { while (i < lines.length && isBlank(lines[i].raw)) i++; }

  function blockScalar(style, parentIndent) {
    const out = [];
    let ind = null;
    while (i < lines.length) {
      const { raw } = lines[i];
      if (raw.trim() === '') { out.push(''); i++; continue; }
      const d = indentOf(raw);
      if (d <= parentIndent) break;
      if (ind === null) ind = d;
      out.push(raw.slice(ind));
      i++;
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    const keep = style.endsWith('-') ? '' : '\n';
    if (style.startsWith('|')) return out.join('\n') + keep;
    // folded: single newlines become spaces, blank lines become newlines
    return out.reduce((acc, l, k) => (k === 0 ? l : l === '' ? acc + '\n' : acc.endsWith('\n') ? acc + l : acc + ' ' + l), '') + keep;
  }

  function value(rest, indent) {
    const r = stripComment(rest).trim();
    if (r === '') { skipBlank(); return i < lines.length && indentOf(lines[i].raw) > indent ? node(indentOf(lines[i].raw)) : (i < lines.length && indentOf(lines[i].raw) === indent && lines[i].raw.trim().startsWith('- ') ? node(indent) : null); }
    if (/^[>|]-?$/.test(r)) return blockScalar(r, indent);
    return scalar(r);
  }

  function node(indent) {
    skipBlank();
    if (i >= lines.length) return null;
    const first = lines[i].raw.slice(indent);
    return first.startsWith('- ') || first === '-' ? seq(indent) : map(indent);
  }

  function map(indent, obj = {}) {
    while (true) {
      skipBlank();
      if (i >= lines.length) return obj;
      const { raw, n } = lines[i];
      const d = indentOf(raw);
      if (d < indent) return obj;
      if (d > indent) throw new Error(`line ${n}: unexpected indent`);
      const body = raw.slice(d);
      if (body.startsWith('- ')) return obj;
      const m = body.match(/^("[^"]*"|'[^']*'|[^:#]+?)\s*:(\s+|$)(.*)$/);
      if (!m) throw new Error(`line ${n}: expected "key: value"`);
      const key = scalar(m[1]);
      if (Object.prototype.hasOwnProperty.call(obj, key)) throw new Error(`line ${n}: duplicate key "${key}"`);
      i++;
      obj[key] = value(m[3], indent);
    }
  }

  function seq(indent) {
    const arr = [];
    while (true) {
      skipBlank();
      if (i >= lines.length) return arr;
      const { raw, n } = lines[i];
      const d = indentOf(raw);
      if (d < indent) return arr;
      const body = raw.slice(d);
      if (d > indent || !(body.startsWith('- ') || body === '-')) {
        if (d === indent) return arr;
        throw new Error(`line ${n}: unexpected indent`);
      }
      const rest = body === '-' ? '' : body.slice(2);
      const itemIndent = d + 2;
      if (/^("[^"]*"|'[^']*'|[^:#\[{"']+?)\s*:(\s+|$)/.test(stripComment(rest))) {
        // mapping item: rewrite this line as the first key at itemIndent
        lines[i] = { raw: ' '.repeat(itemIndent) + rest, n };
        arr.push(map(itemIndent));
      } else {
        i++;
        arr.push(value(rest, d));
      }
    }
  }

  const doc = node(0);
  skipBlank();
  if (i < lines.length) throw new Error(`line ${lines[i].n}: could not parse`);
  return doc;
}

// ── Validation ────────────────────────────────────────────────────────────

const NODE_KEYS = new Set([
  'id', 'purpose', 'realized_by', 'status', 'status_note', 'paused_reason',
  'metrics', 'tests', 'health_check', 'agents', 'goals',
]);
const STATUSES = new Set(['active', 'paused', 'planned']);
// A health_check that is only an existence/count probe passes on empty data.
const WEAK_CHECK = /^\s*(test\s+-[efxsd]\s+\S+|\[\s+-[efxsd]\s+\S+\s+\]|ls\b[^|]*\|\s*head\b.*|wc\s+-l\b.*)\s*$/;

function validate(doc) {
  const errors = [];
  const warnings = [];
  const ids = new Map();

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { errors: ['document is not a mapping'], warnings };
  if (String(doc.version) !== '3.0') errors.push(`version must be "3.0" (got ${JSON.stringify(doc.version)})`);
  if (!doc.root) { errors.push('missing root'); return { errors, warnings }; }

  function checkNode(n, where, isRoot) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) { errors.push(`${where}: not a node`); return; }
    for (const k of Object.keys(n)) if (!NODE_KEYS.has(k)) errors.push(`${where}: unknown field "${k}"`);
    if (typeof n.purpose !== 'string' || !n.purpose.trim()) errors.push(`${where}: missing purpose`);
    if (!isRoot && !n.id) errors.push(`${where}: sub-purpose needs an id`);
    if (n.id) {
      if (ids.has(n.id)) errors.push(`${where}: duplicate id "${n.id}" (also at ${ids.get(n.id)})`);
      else ids.set(n.id, where);
    }
    const st = n.status === undefined ? 'active' : n.status;
    if (!STATUSES.has(st)) errors.push(`${where}: status must be active|paused|planned (got "${st}")`);
    if ((st === 'paused' || st === 'planned') && !n.paused_reason) errors.push(`${where}: ${st} without paused_reason`);

    if (n.metrics !== undefined && n.metrics !== null) {
      if (!Array.isArray(n.metrics)) errors.push(`${where}: metrics must be a list`);
      else n.metrics.forEach((m, j) => {
        if (!m || typeof m !== 'object' || !m.name) errors.push(`${where}.metrics[${j}]: needs a name`);
      });
    }
    if (n.health_check !== undefined && n.health_check !== null) {
      const hc = n.health_check;
      if (typeof hc !== 'object' || !hc.command) errors.push(`${where}: health_check needs a command`);
      else if (WEAK_CHECK.test(String(hc.command))) {
        errors.push(`${where}: health_check only probes existence/count and passes on empty data: ${hc.command}`);
      }
    }

    const rb = n.realized_by;
    const means = rb === undefined || rb === null ? [] : Array.isArray(rb) ? rb : [rb];
    means.forEach((m, j) => {
      if (typeof m === 'string') return;
      if (m && typeof m === 'object' && !Array.isArray(m) && 'purpose' in m) {
        checkNode(m, `${where} > ${m.id || `realized_by[${j}]`}`, false);
      } else {
        errors.push(`${where}.realized_by[${j}]: must be a string (implementation) or an object with purpose (sub-purpose)`);
      }
    });

    if (n.goals !== undefined && n.goals !== null) {
      if (typeof n.goals !== 'object' || Array.isArray(n.goals)) errors.push(`${where}: legacy goals must be a mapping`);
      else {
        warnings.push(`${where}: legacy "goals:" map; sub-purposes now live in realized_by`);
        for (const [k, child] of Object.entries(n.goals)) {
          if (child && typeof child === 'object' && !child.id) child.id = k;
          checkNode(child, `${where} > ${k}`, false);
        }
      }
    }
  }

  checkNode(doc.root, 'root', true);
  return { errors, warnings };
}

// ── CLI ───────────────────────────────────────────────────────────────────

function main() {
  let file = process.argv[2];
  if (!file) file = ['purpose-tree.yaml', 'architecture.yaml'].find((f) => fs.existsSync(f));
  if (!file || !fs.existsSync(file)) {
    console.error('No tree found: expected purpose-tree.yaml (or legacy architecture.yaml), or pass a path.');
    process.exit(2);
  }
  let text = fs.readFileSync(file, 'utf8');
  if (path.extname(file) === '.md') {
    const m = text.match(/```yaml\n([\s\S]*?)```/);
    if (!m) { console.error(`${file}: no \`\`\`yaml block`); process.exit(2); }
    text = m[1];
  }
  let doc;
  try { doc = parseYaml(text); } catch (e) { console.error(`${file}: ${e.message}`); process.exit(2); }

  const { errors, warnings } = validate(doc);
  warnings.forEach((w) => console.log(`warn  ${w}`));
  errors.forEach((e) => console.log(`FAIL  ${e}`));
  console.log(errors.length ? `${file}: ${errors.length} problem(s)` : `${file}: valid`);
  process.exit(errors.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { parseYaml, validate };
