'use strict';
// edit.cjs — line-level edits to a purpose tree file that keep its comments, ordering and
// quoting. The tree is hand-edited YAML and the parser here cannot write, so a field is
// inserted or replaced as text inside the node it belongs to. Zero dependencies.
// Used by confirm.cjs and by purpose-review's --record.

const { parseYaml, validate } = require('./validate.cjs');
const { collectNodes } = require('./tree.cjs');

const indentOf = (s) => s.match(/^ */)[0].length;
const skippable = (s) => s.trim() === '' || s.trim().startsWith('#');

// Where a node's own keys live: {head, keys, from, to}. `from` is the first line that can be
// one of its keys and `to` is the line after its last line (children included). `keys` is
// the indent of its keys. Throws when the id is not written as `id: <id>` (or `root:`).
function locate(lines, id) {
  let from;
  let keys;
  if (id === 'root') {
    const r = lines.findIndex((l) => /^root:\s*(#.*)?$/.test(l));
    if (r === -1) throw new Error('node "root" not found');
    from = lines.findIndex((l, k) => k > r && !skippable(l));
    if (from === -1) throw new Error('node "root" has no fields');
    keys = indentOf(lines[from]);
  } else {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^( *)(- +)?id:\\s*(["']?)${esc}\\3\\s*(#.*)?$`);
    const hits = lines.map((l, k) => (re.test(l) ? k : -1)).filter((k) => k !== -1);
    if (!hits.length) throw new Error(`node "${id}" not found (is it written as "id: ${id}"?)`);
    if (hits.length > 1) throw new Error(`node "${id}" is ambiguous: ${hits.length} lines say "id: ${id}"`);
    from = hits[0];
    const m = lines[from].match(re);
    keys = m[1].length + (m[2] ? m[2].length : 0);
  }
  let to = from + 1;
  while (to < lines.length) {
    if (!skippable(lines[to]) && indentOf(lines[to]) < keys) break;
    to++;
  }
  return { keys, from, to };
}

// The line range of one key of the node: [start, end). A list written at the key's own indent
// ("key:\n- a") still belongs to the key.
function keyRange(lines, loc, key) {
  const re = new RegExp(`^ {${loc.keys}}${key}:(\\s|$)`);
  let start = -1;
  for (let k = loc.from; k < loc.to; k++) if (re.test(lines[k])) { start = k; break; }
  if (start === -1) return null;
  let end = start + 1;
  let last = start;
  while (end < loc.to) {
    const l = lines[end];
    if (!skippable(l)) {
      const d = indentOf(l);
      if (d < loc.keys || (d === loc.keys && !l.trim().startsWith('- '))) break;
      last = end;
    }
    end++;
  }
  return { start, end: last + 1 };
}

// Last line of the node that holds content (not a trailing blank or comment line), plus one.
function contentEnd(lines, loc) {
  let last = loc.from;
  for (let k = loc.from; k < loc.to; k++) {
    if (!skippable(lines[k]) || (lines[k].trim() !== '' && indentOf(lines[k]) > loc.keys)) last = k;
  }
  return last + 1;
}

// Set `key` on node `id` to the block `valueLines` (written one level deeper than the key).
// An existing key is replaced; a new one goes right after `purpose` (after: 'purpose') or at
// the end of the node (after: 'end').
function setField(text, id, key, valueLines, { after = 'end' } = {}) {
  const lines = text.split('\n');
  const loc = locate(lines, id);
  const pad = ' '.repeat(loc.keys);
  const block = [`${pad}${key}:`, ...valueLines.map((v) => `${pad}  ${v}`)];
  const old = keyRange(lines, loc, key);
  if (old) {
    lines.splice(old.start, old.end - old.start, ...block);
  } else {
    let at = contentEnd(lines, loc);
    if (after === 'purpose') {
      const p = keyRange(lines, loc, 'purpose');
      if (p) at = p.end;
    }
    lines.splice(at, 0, ...block);
  }
  return lines.join('\n');
}

// Confirm nodes: `ids` is a list, or 'all' for every node that has no confirmed yet.
// A node that already has confirmed is left as it is.
function confirmNodes(text, ids, by, on) {
  const nodes = collectNodes(parseYaml(text).root);
  const want = ids === 'all' ? nodes.map((n) => n.id) : ids;
  const done = [];
  for (const id of want) {
    const n = nodes.find((x) => x.id === id);
    if (!n) throw new Error(`node "${id}" not found`);
    if (n.node.confirmed) continue;
    text = setField(text, id, 'confirmed', [`by: ${JSON.stringify(by)}`, `on: ${on}`], { after: 'purpose' });
    done.push(id);
  }
  return { text, done };
}

module.exports = { locate, setField, confirmNodes, validate };
