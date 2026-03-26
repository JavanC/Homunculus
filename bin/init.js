#!/usr/bin/env node
// homunculus init — Set up the evolution structure in your project

const fs = require('fs');
const path = require('path');

const readline = require('readline');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const CORE_DIR = path.join(__dirname, '..', 'core');
const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('');
  console.log('  \x1b[1mHomunculus\x1b[0m — Self-evolving AI Assistant');
  console.log('');

  const projectDir = process.cwd();

  // Check if already initialized
  if (fs.existsSync(path.join(projectDir, 'homunculus'))) {
    console.log('  \x1b[33m!\x1b[0m homunculus/ already exists. Re-running will skip existing files.');
    console.log('');
  }

  // 1. Create directory structure
  const dirs = [
    'homunculus/instincts/personal',
    'homunculus/instincts/archived',
    'homunculus/evolved/skills',
    'homunculus/evolved/agents',
    'homunculus/evolved/evals',
    'homunculus/experiments',
    'homunculus/reports',
    'scripts',
    '.claude/rules',
    '.claude/commands'
  ];

  for (const dir of dirs) {
    ensureDir(path.join(projectDir, dir));
  }
  console.log('  \x1b[32m✓\x1b[0m Created homunculus/ directory structure');

  // 2. Copy evolution rules
  const rulesSrc = path.join(TEMPLATES_DIR, 'rules', 'evolution-system.md');
  const rulesDest = path.join(projectDir, '.claude', 'rules', 'evolution-system.md');
  if (!fs.existsSync(rulesDest) && fs.existsSync(rulesSrc)) {
    fs.copyFileSync(rulesSrc, rulesDest);
    console.log('  \x1b[32m✓\x1b[0m Added evolution rules');
  }

  // 3. Add Homunculus section to CLAUDE.md
  const claudeDest = path.join(projectDir, 'CLAUDE.md');
  const homunculusSection = `
## Homunculus — Self-Evolving AI Assistant

This project uses Homunculus for goal-driven evolution.

- **Goal Tree**: \`architecture.yaml\` — defines goals, metrics, and health checks
- **Instincts**: \`homunculus/instincts/personal/\` — auto-extracted patterns
- **Skills**: \`homunculus/evolved/skills/\` — tested, versioned knowledge
- **Commands**: \`/hm-goal\` (define goals) | \`/hm-night\` (evolution cycle) | \`/hm-status\` (dashboard)
`;

  if (fs.existsSync(claudeDest)) {
    const existing = fs.readFileSync(claudeDest, 'utf8');
    if (!existing.includes('Homunculus')) {
      fs.appendFileSync(claudeDest, '\n' + homunculusSection);
      console.log('  \x1b[32m✓\x1b[0m Added Homunculus section to existing CLAUDE.md');
    } else {
      console.log('  \x1b[33m-\x1b[0m CLAUDE.md already has Homunculus section');
    }
  } else {
    const claudeSrc = path.join(TEMPLATES_DIR, 'CLAUDE.md.template');
    if (fs.existsSync(claudeSrc)) {
      const template = fs.readFileSync(claudeSrc, 'utf8');
      const projectName = path.basename(projectDir);
      fs.writeFileSync(claudeDest, template.replace(/\{\{PROJECT_NAME\}\}/g, projectName));
      console.log('  \x1b[32m✓\x1b[0m Created CLAUDE.md');
    }
  }

  // 4. Copy core scripts
  if (fs.existsSync(CORE_DIR)) {
    copyDir(CORE_DIR, path.join(projectDir, 'scripts'));
    console.log('  \x1b[32m✓\x1b[0m Copied evolution scripts');
  }

  // 5. Copy slash commands
  if (fs.existsSync(COMMANDS_DIR)) {
    copyDir(COMMANDS_DIR, path.join(projectDir, '.claude', 'commands'));
    console.log('  \x1b[32m✓\x1b[0m Added slash commands (/hm-goal, /hm-night, /hm-status)');
  }

  // 6. Configure Claude Code hooks
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [{
      matcher: "",
      hooks: [{
        type: "command",
        command: "bash scripts/observe.sh post"
      }]
    }];
    ensureDir(path.join(projectDir, '.claude'));
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    console.log('  \x1b[32m✓\x1b[0m Configured observation hook');
  }

  // 7. Create .gitignore additions
  const gitignorePath = path.join(projectDir, '.gitignore');
  const gitignoreEntries = [
    '',
    '# Homunculus runtime data',
    'homunculus/observations.jsonl*',
    'data/hook-profile*',
    'data/auto-learn-cooldown.json'
  ].join('\n');

  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    if (!existing.includes('Homunculus runtime')) {
      fs.appendFileSync(gitignorePath, '\n' + gitignoreEntries + '\n');
      console.log('  \x1b[32m✓\x1b[0m Updated .gitignore');
    }
  } else {
    fs.writeFileSync(gitignorePath, gitignoreEntries.trim() + '\n');
    console.log('  \x1b[32m✓\x1b[0m Created .gitignore');
  }

  // 8. Evolution config — tier selection
  const configDest = path.join(projectDir, 'evolution-config.yaml');
  if (!fs.existsSync(configDest)) {
    console.log('');
    console.log('  \x1b[1mEvolution intensity:\x1b[0m');
    console.log('    1) \x1b[2mminimal\x1b[0m  — instinct harvest + sync only (~$0.5/night)');
    console.log('    2) \x1b[1mstandard\x1b[0m — + research + experiments (~$2-3/night) \x1b[32m[recommended]\x1b[0m');
    console.log('    3) \x1b[1mfull\x1b[0m     — + TDD backfill + bonus loop (~$5-10/night)');
    console.log('');

    const answer = await ask('  Choose (1/2/3, default=2): ');
    const tierMap = { '1': 'minimal', '2': 'standard', '3': 'full' };
    const tier = tierMap[answer] || 'standard';

    const templateSrc = path.join(TEMPLATES_DIR, 'evolution-config.template.yaml');
    if (fs.existsSync(templateSrc)) {
      let config = fs.readFileSync(templateSrc, 'utf8');
      // Apply tier-specific defaults
      config = config.replace(/^tier: standard/m, `tier: ${tier}`);
      if (tier === 'minimal') {
        config = config.replace(/research: true/g, 'research: false');
        config = config.replace(/experiments: true/g, 'experiments: false');
      } else if (tier === 'full') {
        config = config.replace(/tdd_backfill: false/, 'tdd_backfill: true');
        config = config.replace(/bonus_loop: false/, 'bonus_loop: true');
        config = config.replace(/topics_min: 2/, 'topics_min: 3');
        config = config.replace(/topics_max: 2/, 'topics_max: 5');
        config = config.replace(/max_per_night: 1/, 'max_per_night: 3');
        config = config.replace(/max_rounds: 5/, 'max_rounds: 10');
      }
      fs.writeFileSync(configDest, config);
      console.log(`  \x1b[32m✓\x1b[0m Created evolution-config.yaml (tier: ${tier})`);
    }
  } else {
    console.log('  \x1b[33m-\x1b[0m evolution-config.yaml already exists');
  }

  // Done
  console.log('');
  console.log('  \x1b[1m\x1b[32mDone!\x1b[0m Homunculus is installed.');
  console.log('');
  console.log('  Next steps:');
  console.log('    1. Run \x1b[1mclaude\x1b[0m to open Claude Code');
  console.log('    2. Type \x1b[1m/hm-goal\x1b[0m to define your goals (AI-guided)');
  console.log('    3. Type \x1b[1m/hm-night\x1b[0m to run your first evolution cycle');
  console.log('');
}

main();
