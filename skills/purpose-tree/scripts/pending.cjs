#!/usr/bin/env node
'use strict';
// pending.cjs — the shared "nobody to ask" path for purpose-sync, purpose-review and bootstrap.
// A skill that cannot ask a human writes its questions to purpose-tree.pending.yaml at the repo
// root (commit it with the work). Any later session reads the file, asks or applies the
// answers, then deletes it. Zero dependencies.
// Usage: echo '{"items":[{"kind":"question","node":"billing","text":"..."}]}' \
//          | node pending.cjs --source sync|bootstrap|review
//        node pending.cjs --clear     (after the answers are applied: delete the file)
// kind: proposal | gap | review (sync), question | draft | proposal (bootstrap, review).
// A second run adds new items to the file (duplicates dropped, items renumbered).
// Never edits the tree. Exit 0 = ok, 1 = bad input.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseYaml } = require('./validate.cjs');
const { findTree } = require('./tree.cjs');

const PENDING_FILE = 'purpose-tree.pending.yaml';
const SOURCES = ['sync', 'bootstrap', 'review'];
const KINDS = ['proposal', 'gap', 'review', 'question', 'draft'];

class BadInput extends Error {}

function normalize(items, kinds = KINDS) {
  if (!Array.isArray(items)) throw new BadInput(`expected {"items": [{"kind": "${kinds.join('|')}", "text": "..."}]}`);
  return items.map((it, j) => {
    if (!it || !kinds.includes(it.kind)) throw new BadInput(`items[${j}]: kind must be ${kinds.join('|')}`);
    if (typeof it.text !== 'string' || !it.text.trim() || /[\r\n]/.test(it.text)) throw new BadInput(`items[${j}]: text must be one non-empty line`);
    if (it.node !== undefined && (typeof it.node !== 'string' || !it.node.trim())) throw new BadInput(`items[${j}]: node must be a node id`);
    return { kind: it.kind, text: it.text.trim(), ...(it.node ? { node: it.node.trim() } : {}) };
  });
}

function readPending(file = PENDING_FILE) {
  if (!fs.existsSync(file)) return null;
  const doc = parseYaml(fs.readFileSync(file, 'utf8'));
  return doc && Array.isArray(doc.items) ? doc : null;
}

const q = (s) => JSON.stringify(String(s));
const ANSWER_HELP = '"accept all", or e.g. "reject 2", "3: serves <id>"; unanswered items count as rejected';

function serialize(doc) {
  const out = [
    '# Unanswered purpose-tree questions. Read them, ask the human, apply the answers, then',
    '# delete this file: node <purpose-tree-skill>/scripts/pending.cjs --clear',
    'version: 1',
    `repo: ${q(doc.repo)}`,
    `tree: ${q(doc.tree)}`,
    `head: ${q(doc.head)}`,
  ];
  if (doc.last_synced_on_apply) out.push(`last_synced_on_apply: ${q(doc.last_synced_on_apply)}`);
  out.push('items:');
  for (const it of doc.items) {
    out.push(`  - n: ${it.n}`, `    source: ${it.source}`, `    kind: ${it.kind}`);
    if (it.node) out.push(`    node: ${q(it.node)}`);
    out.push(`    text: ${q(it.text)}`);
  }
  out.push(`answer: ${q(ANSWER_HELP)}`);
  return out.join('\n') + '\n';
}

// Add `items` (already normalized) from `source` to the file at the current directory.
// `extra` may carry last_synced_on_apply. Returns the merged document.
function addPending({ source, items, extra = {}, head = null, tree = null }) {
  const old = readPending();
  const kept = old ? old.items.map((it) => ({ source: it.source, kind: it.kind, text: it.text, ...(it.node ? { node: it.node } : {}) })) : [];
  const key = (it) => `${it.kind}\u0000${it.node || ''}\u0000${it.text}`;
  const have = new Set(kept.map(key));
  for (const it of items) {
    const full = { source, ...it };
    if (!have.has(key(full))) { kept.push(full); have.add(key(full)); }
  }
  const doc = {
    repo: path.basename(process.cwd()),
    tree: tree || (old && old.tree) || findTree() || 'purpose-tree.yaml',
    head: head || (old && old.head) || null,
    last_synced_on_apply: extra.last_synced_on_apply || (old && old.last_synced_on_apply) || null,
    items: kept.map((it, j) => ({ n: j + 1, ...it })),
  };
  fs.writeFileSync(PENDING_FILE, serialize(doc));
  return doc;
}

// The block a dispatched agent pastes into its report to its lead.
function renderBlock(doc, source) {
  const tag = source === 'sync' ? 'purpose-sync-pending' : 'purpose-review-pending';
  return [
    '```' + tag,
    `repo: ${doc.repo}`,
    `tree: ${doc.tree}`,
    `file: ${PENDING_FILE}`,
    `head: ${doc.head}`,
    ...(doc.last_synced_on_apply ? [`last_synced_on_apply: ${doc.last_synced_on_apply}`] : []),
    ...doc.items.map((it) => `${it.n}. ${it.kind === 'proposal' || it.kind === 'question' ? '' : it.kind + ': '}${it.node ? `[${it.node}] ` : ''}${it.text}`),
    `answer: ${ANSWER_HELP}`,
    '```',
  ];
}

function headOf() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

function main() {
  const args = process.argv.slice(2);
  const fail = (m) => { console.error(m); process.exit(1); };
  try { process.chdir(execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()); } catch { fail('Not inside a git repository.'); }
  if (args.includes('--clear')) {
    if (fs.existsSync(PENDING_FILE)) { fs.unlinkSync(PENDING_FILE); console.log(`removed ${PENDING_FILE}`); } else console.log('nothing pending');
    return;
  }
  const i = args.indexOf('--source');
  const source = i === -1 ? null : args[i + 1];
  if (!SOURCES.includes(source)) fail(`--source must be ${SOURCES.join('|')}`);
  let items;
  try {
    let input;
    try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { throw new BadInput(`stdin is not JSON: ${e.message}`); }
    items = normalize(input && input.items);
  } catch (e) { if (e instanceof BadInput) fail(e.message); throw e; }
  const label = source === 'sync' ? 'purpose-sync' : 'purpose-review';
  if (!items.length) { console.log(`${label}: pending items=0`); return; }
  const doc = addPending({ source, items, head: headOf() });
  console.log([...renderBlock(doc, source), `${label}: pending items=${doc.items.length}`].join('\n'));
}

if (require.main === module) main();
module.exports = { PENDING_FILE, SOURCES, KINDS, BadInput, normalize, readPending, addPending, renderBlock };
