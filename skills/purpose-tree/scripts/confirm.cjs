#!/usr/bin/env node
'use strict';
// confirm.cjs — record a human's sign-off on purpose-tree nodes: writes `confirmed: {by, on}`.
// Usage: node confirm.cjs [tree] --by <name> [--on YYYY-MM-DD] (--all | <node-id>...)
// Only unconfirmed nodes are written; the file is validated after and restored if it breaks.
// Run it only on the human's say-so: confirming is theirs, not the agent's.
// Exit 0 = ok, 1 = bad arguments or the edit would break the tree, 2 = no tree.

const fs = require('fs');
const { findTree } = require('./tree.cjs');
const { parseYaml, validate } = require('./validate.cjs');
const { confirmNodes } = require('./edit.cjs');

function fail(code, msg) { console.error(msg); process.exit(code); }

function main() {
  const args = process.argv.slice(2);
  let by = null;
  let on = new Date().toISOString().slice(0, 10);
  let all = false;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--by') by = args[++i];
    else if (args[i] === '--on') on = args[++i];
    else if (args[i] === '--all') all = true;
    else rest.push(args[i]);
  }
  const file = rest.length && /\.(ya?ml|md)$/.test(rest[0]) ? rest.shift() : findTree();
  if (!file || !fs.existsSync(file)) fail(2, 'No tree found: pass a path or run at the repo root.');
  if (!by) fail(1, 'Usage: confirm.cjs [tree] --by <name> [--on YYYY-MM-DD] (--all | <node-id>...)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) fail(1, `--on must be YYYY-MM-DD (got "${on}")`);
  if (!all && !rest.length) fail(1, 'Name the nodes to confirm, or pass --all.');

  const before = fs.readFileSync(file, 'utf8');
  let result;
  try { result = confirmNodes(before, all ? 'all' : rest, by, on); } catch (e) { fail(1, `${file}: ${e.message}`); }
  const known = new Set(validate(parseYaml(before)).errors);
  const errs = validate(parseYaml(result.text)).errors.filter((e) => !known.has(e));
  if (errs.length) fail(1, `${file}: the edit would add errors, nothing written:\n${errs.join('\n')}`);
  if (result.done.length) fs.writeFileSync(file, result.text);
  console.log(`${file}: confirmed ${result.done.length}${result.done.length ? ': ' + result.done.join(', ') : ''}`);
}

main();
