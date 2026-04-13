#!/usr/bin/env node
// homunculus goal — View or define your project goal tree
// Reads architecture.yaml if present; guides creation if not.
// For interactive goal definition, use your AI assistant with:
//   "define goals" or "hm-goal"
//
// This CLI entry is a lightweight fallback that shows the goal tree
// and prints instructions for the full interactive flow.

'use strict';

const fs = require('fs');
const path = require('path');

const projectDir = process.cwd();
const archPath = path.join(projectDir, 'architecture.yaml');

if (!fs.existsSync(archPath)) {
  console.log('');
  console.log('  \x1b[33m!\x1b[0m No architecture.yaml found.');
  console.log('');
  console.log('  To define your goals interactively, tell your AI assistant:');
  console.log('    "define goals" or "hm-goal"');
  console.log('');
  console.log('  The AI will guide you through creating architecture.yaml');
  console.log('  based on your project\'s existing tech stack and your priorities.');
  console.log('');
  process.exit(0);
}

// Show goal tree summary from architecture.yaml
try {
  const content = fs.readFileSync(archPath, 'utf8');
  const goalCount = (content.match(/^\s{4,}\w[^:]+:$/gm) || []).length;
  const realizedCount = (content.match(/realized_by:/g) || []).filter((_, i, arr) => {
    return true;
  }).length;
  const evolveCount = (content.match(/# will evolve/g) || []).length;

  console.log('');
  console.log('  \x1b[1m🎯 architecture.yaml\x1b[0m');
  console.log('');
  console.log(`  Goals defined: ~${goalCount}`);
  console.log(`  Implementations: ${realizedCount - evolveCount} active, ${evolveCount} pending evolution`);
  console.log('');
  console.log('  To view or edit goals interactively, tell your AI assistant:');
  console.log('    "show goal tree" or "hm-goal"');
  console.log('');
} catch (e) {
  console.error('  Error reading architecture.yaml:', e.message);
  process.exit(1);
}
