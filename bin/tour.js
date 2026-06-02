#!/usr/bin/env node
// homunculus tour — Interactive walkthrough of how Homunculus works

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const STEPS = [
  {
    title: '1. Goal Tree',
    icon: '🎯',
    content: [
      'Everything starts with goals. Homunculus doesn\'t decide what to improve — you do.',
      '',
      'You define goals in architecture.yaml:',
      '',
      '  my-project:',
      '    code_quality:',
      '      purpose: "Ship fewer bugs"',
      '      testing:',
      '        purpose: "Every change has tests"',
      '        realized_by: # will evolve ○',
      '',
      'Goals are permanent. Implementations are temporary.',
      'The system figures out the best way to reach each goal — and replaces implementations',
      'when better ones emerge.',
    ],
    prompt: 'Press Enter to continue →',
  },
  {
    title: '2. Observation',
    icon: '👁️',
    content: [
      'Every time Claude uses a tool in your session, observe.sh records what happened.',
      '',
      'Not everything — noise is filtered out (reads, searches). The hook focuses on',
      'meaningful actions: writes, edits, decisions, patterns.',
      '',
      'This builds up in homunculus/observations.jsonl. You never need to look at it.',
      'The extraction engine reads it automatically.',
      '',
      'You use Claude Code normally. Observation is invisible.',
    ],
    prompt: 'Press Enter to continue →',
  },
  {
    title: '3. Instincts',
    icon: '💡',
    content: [
      'At the end of each session, evaluate-session.js reads the observations and',
      'extracts behavioral patterns — called instincts.',
      '',
      'Example instinct:',
      '',
      '  title: Always run tests before marking a task complete',
      '  confidence: 0.78',
      '  mechanism: hook (pre-commit, deterministic)',
      '  goal: code_quality.testing',
      '',
      'Instincts have confidence scores. Low confidence = weak pattern, needs more evidence.',
      'High confidence = seen repeatedly, worth implementing.',
      '',
      'Starter instincts (like the ones just installed) begin at 0.6 — they\'re hypotheses',
      'based on your stack, not observed patterns yet. Real usage will confirm or discard them.',
    ],
    prompt: 'Press Enter to continue →',
  },
  {
    title: '4. Evolution',
    icon: '⚡',
    content: [
      'When enough instincts accumulate around a theme, /evolve aggregates them into a Skill.',
      '',
      'Each skill goes through an eval loop:',
      '  → Write scenario tests',
      '  → Run eval (pass rate must reach 100%)',
      '  → Improve until it passes',
      '  → Track discrimination (does the skill actually change behavior?)',
      '',
      'Once a skill passes eval, the instincts that created it are archived.',
      'The skill is the source of truth now.',
      '',
      'The same pattern applies to hooks, rules, scripts, and agents.',
      'The lightest mechanism that works wins.',
    ],
    prompt: 'Press Enter to continue →',
  },
  {
    title: '5. Nightly Agent',
    icon: '🌙',
    content: [
      'The nightly agent runs while you sleep:',
      '',
      '  1. Health check — which goals are unhealthy?',
      '  2. Evolve — route instincts, improve skills, replace what\'s stale',
      '  3. Research — scan for better approaches',
      '  4. Experiment — test hypotheses in isolated git worktrees',
      '  5. Report — morning summary of what changed',
      '',
      'You wake up to a smarter assistant and a report.',
      '',
      'In the reference system: 1,500+ autonomous commits over 5 weeks.',
      'All while the developer slept.',
      '',
      '─────────────────────────────────────────',
      'That\'s the loop: Observe → Extract → Evolve → Validate → Replace.',
      'Goals stay. Implementations get better.',
    ],
    prompt: 'Done! Press Enter to finish →',
  },
];

function rl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function waitForEnter(prompt) {
  return new Promise(resolve => {
    const iface = rl();
    iface.question(`\n  \x1b[2m${prompt}\x1b[0m `, () => {
      iface.close();
      resolve();
    });
  });
}

function detectStack(projectDir) {
  const stacks = [];
  if (fs.existsSync(path.join(projectDir, 'package.json'))) stacks.push('JavaScript/TypeScript');
  if (fs.existsSync(path.join(projectDir, 'go.mod'))) stacks.push('Go');
  if (fs.existsSync(path.join(projectDir, 'Cargo.toml'))) stacks.push('Rust');
  if (fs.existsSync(path.join(projectDir, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectDir, 'requirements.txt'))) stacks.push('Python');
  return stacks;
}

async function main() {
  const projectDir = process.cwd();
  const stacks = detectStack(projectDir);
  const hasHomunculus = fs.existsSync(path.join(projectDir, 'homunculus'));
  const hasArch = fs.existsSync(path.join(projectDir, 'architecture.yaml'));

  console.log('');
  console.log('  \x1b[1mHomunculus Tour\x1b[0m — How it works in 5 steps');
  console.log('');

  if (stacks.length > 0) {
    console.log(`  \x1b[32m✓\x1b[0m Detected: \x1b[1m${stacks.join(', ')}\x1b[0m project`);
  }
  if (hasHomunculus) {
    console.log(`  \x1b[32m✓\x1b[0m Homunculus is installed in this project`);
    if (!hasArch) {
      console.log(`  \x1b[33m→\x1b[0m Next step after tour: run \x1b[1m/hm-goal\x1b[0m to define your goals`);
    }
  } else {
    console.log(`  \x1b[33m→\x1b[0m Not installed here. Run \x1b[1mnpx homunculus-code init\x1b[0m first.`);
  }
  console.log('');

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    console.log(`  \x1b[1m${step.icon}  Step ${step.title}\x1b[0m`);
    console.log('  ' + '─'.repeat(50));
    for (const line of step.content) {
      console.log(`  ${line}`);
    }
    if (i < STEPS.length - 1) {
      await waitForEnter(step.prompt);
      console.log('');
    } else {
      await waitForEnter(step.prompt);
    }
  }

  console.log('');
  console.log('  \x1b[1m\x1b[32mTour complete!\x1b[0m');
  console.log('');
  if (!hasArch) {
    console.log('  Next: open Claude Code and run \x1b[1m/hm-goal\x1b[0m to define your goals.');
  } else {
    console.log('  Next: run \x1b[1m/hm-night\x1b[0m to trigger an evolution cycle.');
  }
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
