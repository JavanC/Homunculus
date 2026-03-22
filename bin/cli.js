#!/usr/bin/env node
// homunculus-code CLI — entry point

const command = process.argv[2];

switch (command) {
  case 'init':
    require('./init.js');
    break;
  case 'night':
    require('./night.js');
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    console.log('');
    console.log('  \x1b[1mHomunculus\x1b[0m — Self-evolving AI Assistant for Claude Code');
    console.log('');
    console.log('  Usage:');
    console.log('    npx homunculus-code <command>');
    console.log('');
    console.log('  Commands:');
    console.log('    init     Set up Homunculus in your project');
    console.log('    night    Run one evolution cycle (health check → evolve → report)');
    console.log('    help     Show this help message');
    console.log('');
    console.log('  After init, use Claude Code normally. Evolution happens automatically.');
    console.log('  Run "night" anytime to trigger a manual evolution cycle.');
    console.log('');
    break;
  default:
    console.error(`  Unknown command: ${command}`);
    console.error('  Run "npx homunculus-code help" for available commands.');
    process.exit(1);
}
