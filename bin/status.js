#!/usr/bin/env node
// homunculus status — Show evolution system status dashboard
// Reads current state from filesystem — no AI required.

'use strict';

const fs = require('fs');
const path = require('path');

const projectDir = process.cwd();
const HOM_DIR = path.join(projectDir, 'homunculus');

function countFiles(dir, ext) {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter(f => !ext || f.endsWith(ext)).length;
  } catch { return 0; }
}

function countLines(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim()).length;
  } catch { return 0; }
}

function lastReport() {
  const reportsDir = path.join(HOM_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) return 'none';
  const reports = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();
  return reports[0] ? reports[0].replace('.md', '') : 'none';
}

const instinctsActive   = countFiles(path.join(HOM_DIR, 'instincts', 'personal'), '.md');
const instinctsArchived = countFiles(path.join(HOM_DIR, 'instincts', 'archived'), '.md');
const skills            = countFiles(path.join(HOM_DIR, 'evolved', 'skills'), '.md');
const agents            = countFiles(path.join(HOM_DIR, 'evolved', 'agents'), '.md');
const evals             = countFiles(path.join(HOM_DIR, 'evolved', 'evals'), '.yaml');
const observations      = countLines(path.join(HOM_DIR, 'observations.jsonl'));
const experiments       = countFiles(path.join(HOM_DIR, 'experiments'), '.md');
const hasArch           = fs.existsSync(path.join(projectDir, 'architecture.yaml'));

console.log('');
console.log('  \x1b[1m🧬 Homunculus Status\x1b[0m');
console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`  Goal Tree:     ${hasArch ? '\x1b[32m✓ architecture.yaml\x1b[0m' : '\x1b[33m✗ not defined yet\x1b[0m'}`);
console.log(`  Instincts:     ${instinctsActive} active / ${instinctsArchived} archived`);
console.log(`  Skills:        ${skills} evolved`);
console.log(`  Agents:        ${agents} specialized`);
console.log(`  Eval Specs:    ${evals}`);
console.log(`  Observations:  ${observations} recorded`);
console.log(`  Experiments:   ${experiments} completed`);
console.log(`  Last Report:   ${lastReport()}`);
console.log('');

if (!hasArch) {
  console.log('  Next: define your goals — tell your AI assistant "define goals" or run:');
  console.log('        npx homunculus-code goal');
} else if (instinctsActive === 0 && observations === 0) {
  console.log('  Next: use your AI assistant normally — observations accumulate automatically.');
} else if (instinctsActive > 0) {
  console.log('  Ready to evolve! Run: npx homunculus-code night');
}
console.log('');
