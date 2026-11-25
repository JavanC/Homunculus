#!/usr/bin/env node
'use strict';
// pending.cjs — when nobody can be asked (a dispatched agent), record the sync items in
// purpose-tree.pending.yaml (the shared pending file, see purpose-tree/scripts/pending.cjs)
// and print them as a block to paste into a report. Never edits the tree. Zero dependencies.
// Usage: echo '{"items":[{"kind":"proposal|gap|review","text":"..."}]}' | node pending.cjs
// Prints the block, then `purpose-sync: pending proposed=<N> gaps=<N> reviews=<N>` as the
// last line. Exit 0 = ok, 1 = bad input, 2/3/4 as changes.cjs.

const fs = require('fs');
const path = require('path');
const { collect, Exit } = require('./changes.cjs');
const shared = require(path.join(__dirname, '..', '..', 'purpose-tree', 'scripts', 'pending.cjs'));

const KINDS = ['proposal', 'gap', 'review'];

function readItems() {
  let input;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { throw new Exit(1, `stdin is not JSON: ${e.message}`); }
  const items = input && input.items;
  if (!Array.isArray(items)) throw new Exit(1, 'expected {"items": [{"kind": "proposal|gap|review", "text": "..."}]}');
  items.forEach((it, j) => {
    if (!it || !KINDS.includes(it.kind)) throw new Exit(1, `items[${j}]: kind must be ${KINDS.join('|')}`);
    if (typeof it.text !== 'string' || !it.text.trim() || it.text.includes('\n')) throw new Exit(1, `items[${j}]: text must be one non-empty line`);
  });
  try { return shared.normalize(items, KINDS); } catch (e) { throw new Exit(1, e.message); }
}

function main() {
  try {
    const items = readItems();
    const count = (k) => items.filter((it) => it.kind === k).length;
    if (!items.length) {
      process.stdout.write('purpose-sync: proposed=0 accepted=0 rejected=0 gaps=0 reviews=0\n');
      return;
    }
    const c = collect();
    const onApply = c.over_limit
      ? `keep (${c.lag} files behind; the human resets it only on request)`
      : c.head;
    const doc = shared.addPending({ source: 'sync', items, head: c.head, tree: c.tree, extra: { last_synced_on_apply: onApply } });
    const out = [
      ...shared.renderBlock(doc, 'sync'),
      `purpose-sync: pending proposed=${count('proposal')} gaps=${count('gap')} reviews=${count('review')}`,
    ];
    process.stdout.write(out.join('\n') + '\n');
  } catch (e) {
    if (!(e instanceof Exit)) throw e;
    if (e.message) console.error(e.message);
    process.exit(e.code);
  }
}

main();
