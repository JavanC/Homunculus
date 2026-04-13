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
  case 'goal':
    require('./goal.js');
    break;
  case 'status':
    require('./status.js');
    break;
  case 'upgrade':
    require('./upgrade.js');
    break;
  case 'tour':
    require('./tour.js');
    break;
  case 'report':
    require('./report.js');
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
    console.log('    tour     Interactive walkthrough of how Homunculus works');
    console.log('    report   Show evolution report (--share for anonymized version)');
    console.log('    upgrade  Update managed files to latest version');
    console.log('    night    Run one evolution cycle (health check → evolve → report)');
    console.log('    goal     View or define your project goal tree');
    console.log('    status   Show evolution system status dashboard');
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
