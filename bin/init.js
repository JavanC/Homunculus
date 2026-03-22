#!/usr/bin/env node
// homunculus init — Set up a self-evolving AI assistant in your project

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const CORE_DIR = path.join(__dirname, '..', 'core');
const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

const YES_MODE = process.argv.includes('--yes') || process.argv.includes('-y');

let rl;
if (!YES_MODE) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function ask(question, defaultVal) {
  if (YES_MODE) return Promise.resolve(process.env[`HOMUNCULUS_${question.replace(/[^A-Z]/gi, '_').toUpperCase()}`] || defaultVal || '');
  return new Promise(resolve => {
    const suffix = defaultVal ? ` (${defaultVal})` : '';
    rl.question(`${question}${suffix}: `, answer => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
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

function replaceTemplateVars(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

async function main() {
  console.log('');
  console.log('  \x1b[1mHomunculus\x1b[0m — Self-evolving AI Assistant');
  console.log('  A seed that grows into your own AI assistant.');
  console.log('');

  const projectDir = process.cwd();

  // Check if already initialized
  if (fs.existsSync(path.join(projectDir, 'homunculus'))) {
    console.log('  \x1b[33m!\x1b[0m homunculus/ already exists. Re-running will skip existing files.');
    console.log('');
  }

  // Gather info
  const projectName = await ask('  Project name', path.basename(projectDir));
  const purpose = await ask('  What is this project\'s main goal?', 'My evolving AI assistant');

  console.log('');

  const vars = {
    PROJECT_NAME: projectName,
    PROJECT_PURPOSE: purpose
  };

  // 1. Create directory structure
  const dirs = [
    'homunculus/instincts/personal',
    'homunculus/instincts/archived',
    'homunculus/evolved/skills',
    'homunculus/evolved/agents',
    'homunculus/evolved/evals',
    'homunculus/experiments',
    'scripts',
    '.claude/rules',
    '.claude/commands'
  ];

  for (const dir of dirs) {
    ensureDir(path.join(projectDir, dir));
  }
  console.log('  \x1b[32m✓\x1b[0m Created homunculus/ directory structure');

  // 2. Copy architecture template
  const archDest = path.join(projectDir, 'architecture.yaml');
  if (!fs.existsSync(archDest)) {
    const template = fs.readFileSync(
      path.join(TEMPLATES_DIR, 'architecture.template.yaml'), 'utf8'
    );
    fs.writeFileSync(archDest, replaceTemplateVars(template, vars));
    console.log('  \x1b[32m✓\x1b[0m Created architecture.yaml (edit this to define your goals)');
  } else {
    console.log('  \x1b[33m-\x1b[0m architecture.yaml already exists, skipping');
  }

  // 3. Copy CLAUDE.md template (append if exists)
  const claudeDest = path.join(projectDir, 'CLAUDE.md');
  if (!fs.existsSync(claudeDest)) {
    const template = fs.readFileSync(
      path.join(TEMPLATES_DIR, 'CLAUDE.md.template'), 'utf8'
    );
    fs.writeFileSync(claudeDest, replaceTemplateVars(template, vars));
    console.log('  \x1b[32m✓\x1b[0m Created CLAUDE.md');
  } else {
    console.log('  \x1b[33m-\x1b[0m CLAUDE.md already exists, skipping');
  }

  // 4. Copy evolution rules
  const rulesDest = path.join(projectDir, '.claude', 'rules', 'evolution-system.md');
  if (!fs.existsSync(rulesDest)) {
    copyFile(
      path.join(TEMPLATES_DIR, 'rules', 'evolution-system.md'),
      rulesDest
    );
    console.log('  \x1b[32m✓\x1b[0m Created .claude/rules/evolution-system.md');
  }

  // 5. Copy core scripts
  if (fs.existsSync(CORE_DIR)) {
    copyDir(CORE_DIR, path.join(projectDir, 'scripts'));
    console.log('  \x1b[32m✓\x1b[0m Copied evolution scripts to scripts/');
  }

  // 6. Copy slash commands
  if (fs.existsSync(COMMANDS_DIR)) {
    copyDir(COMMANDS_DIR, path.join(projectDir, '.claude', 'commands'));
    console.log('  \x1b[32m✓\x1b[0m Copied slash commands to .claude/commands/');
  }

  // 7. Configure Claude Code hooks (if settings exist)
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [{
      type: "command",
      command: "bash scripts/observe.sh post",
      description: "Homunculus: observe tool usage"
    }];
    ensureDir(path.join(projectDir, '.claude'));
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    console.log('  \x1b[32m✓\x1b[0m Configured Claude Code observation hook');
  }

  // 8. Create .gitignore additions
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

  console.log('');
  console.log('  \x1b[1m\x1b[32mDone!\x1b[0m Your assistant is ready to evolve.');
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Edit \x1b[1marchitecture.yaml\x1b[0m to define your goals');
  console.log('  2. Use Claude Code normally — the system observes automatically');
  console.log('  3. Run \x1b[1mclaude "/eval-skill"\x1b[0m to check evolution progress');
  console.log('');

  if (rl) rl.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
