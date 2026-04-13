#!/usr/bin/env node
// homunculus init — Set up the evolution structure in your project

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const readline = require('readline');
const PKG_DIR = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(PKG_DIR, 'templates');
const CORE_DIR = path.join(PKG_DIR, 'core');
const COMMANDS_DIR = path.join(PKG_DIR, 'commands');

const pkgVersion = require(path.join(PKG_DIR, 'package.json')).version;
const STARTER_PACK_DIR = path.join(PKG_DIR, 'starter-pack');
const { detectHarness, getAdapter } = require(path.join(PKG_DIR, 'core', 'adapters'));

// Detect project language/framework from filesystem signals
function detectProjectStack(projectDir) {
  const stacks = [];
  if (fs.existsSync(path.join(projectDir, 'package.json'))) stacks.push('javascript');
  if (fs.existsSync(path.join(projectDir, 'go.mod'))) stacks.push('go');
  if (fs.existsSync(path.join(projectDir, 'Cargo.toml'))) stacks.push('rust');
  if (fs.existsSync(path.join(projectDir, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectDir, 'setup.py')) ||
      fs.existsSync(path.join(projectDir, 'requirements.txt'))) stacks.push('python');
  return stacks;
}

// Install starter pack instincts into the project
function installStarterPack(projectDir, stacks) {
  const instinctsDir = path.join(projectDir, 'homunculus', 'instincts', 'personal');
  ensureDir(instinctsDir);

  // Always install universal instincts
  const folders = ['universal', ...stacks];
  let installed = 0;

  for (const folder of folders) {
    const src = path.join(STARTER_PACK_DIR, folder);
    if (!fs.existsSync(src)) continue;
    for (const entry of fs.readdirSync(src)) {
      if (!entry.endsWith('.md')) continue;
      const destPath = path.join(instinctsDir, entry);
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(path.join(src, entry), destPath);
        installed++;
      }
    }
  }

  return { installed, stacks };
}

function sha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Track copied files for manifest generation
const copiedFiles = [];

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest, category, projectDir) {
  ensureDir(dest);
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, category, projectDir);
    } else {
      fs.copyFileSync(srcPath, destPath);
      copiedFiles.push({
        dest: path.relative(projectDir, destPath),
        hash: sha256(destPath),
        category,
      });
    }
  }
}

function trackFile(destPath, category, projectDir) {
  copiedFiles.push({
    dest: path.relative(projectDir, destPath),
    hash: sha256(destPath),
    category,
  });
}

async function main() {
  const skipStarterPack = process.argv.includes('--no-starter-pack');

  console.log('');
  console.log('  \x1b[1mHomunculus\x1b[0m — Self-evolving AI Assistant');
  console.log('');

  const projectDir = process.cwd();

  // Check if already initialized
  if (fs.existsSync(path.join(projectDir, 'homunculus'))) {
    console.log('  \x1b[33m!\x1b[0m homunculus/ already exists. Re-running will skip existing files.');
    console.log('');
  }

  // 0. Detect host harness and get adapter
  const harness = detectHarness(projectDir);
  const adapter = getAdapter(harness);
  const harnessLabels = { 'claude-code': 'Claude Code', 'cursor': 'Cursor', 'codex': 'Codex CLI' };
  console.log(`  \x1b[2mDetected harness: ${harnessLabels[harness] || harness}\x1b[0m`);
  console.log('');

  // 1. Create directory structure
  const dirs = [
    'homunculus/instincts/personal',
    'homunculus/instincts/archived',
    'homunculus/evolved/skills',
    'homunculus/evolved/agents',
    'homunculus/evolved/evals',
    'homunculus/experiments',
    'homunculus/reports',
    'homunculus/scripts',
  ];

  // Add harness-specific config/rules dirs
  const configDirRel = path.relative(projectDir, adapter.configDir(projectDir));
  const rulesDirRel  = path.relative(projectDir, adapter.rulesDir(projectDir));
  if (!dirs.includes(configDirRel)) dirs.push(configDirRel);
  if (!dirs.includes(rulesDirRel))  dirs.push(rulesDirRel);
  // Claude Code also needs commands dir
  if (harness === 'claude-code') dirs.push('.claude/commands');

  for (const dir of dirs) {
    ensureDir(path.join(projectDir, dir));
  }
  console.log('  \x1b[32m✓\x1b[0m Created homunculus/ directory structure');

  // 2. Install starter pack (contextual, based on project stack)
  if (!skipStarterPack && fs.existsSync(STARTER_PACK_DIR)) {
    const stacks = detectProjectStack(projectDir);
    const { installed } = installStarterPack(projectDir, stacks);
    if (installed > 0) {
      const stackLabel = stacks.length > 0 ? ` (${stacks.join(', ')})` : '';
      console.log(`  \x1b[32m✓\x1b[0m Installed ${installed} starter instincts${stackLabel}`);
      console.log(`  \x1b[2m    These are starter patterns (confidence: 0.6). The system will`);
      console.log(`  \x1b[2m    validate and strengthen them as it observes your real usage.\x1b[0m`);
    } else {
      console.log('  \x1b[33m-\x1b[0m Starter instincts already present');
    }
  } else if (skipStarterPack) {
    console.log('  \x1b[33m-\x1b[0m Skipped starter pack (--no-starter-pack)');
  }

  // 4. Install evolution rule (harness-aware: .claude/rules/, .cursor/rules/, or AGENTS.md)
  const { installRules: installRulesFn, installSkill: installSkillFn } = require(path.join(PKG_DIR, 'core', 'adapters'));
  const rulesResult = installRulesFn(projectDir, TEMPLATES_DIR, harness);
  if (rulesResult.installed) {
    trackFile(rulesResult.path, 'rule', projectDir);
    console.log('  \x1b[32m✓\x1b[0m Added evolution rules');
  } else if (fs.existsSync(rulesResult.path)) {
    trackFile(rulesResult.path, 'rule', projectDir);
    console.log('  \x1b[33m-\x1b[0m Evolution rules already present');
  }

  // 4b. Install Homunculus skill (harness-aware: .claude/commands/, .cursor/rules/, or .codex/)
  const SKILLS_DIR = path.join(PKG_DIR, 'skills');
  if (fs.existsSync(SKILLS_DIR)) {
    const skillResult = installSkillFn(projectDir, SKILLS_DIR, harness);
    if (skillResult.installed) {
      trackFile(skillResult.path, 'skill', projectDir);
      console.log('  \x1b[32m✓\x1b[0m Added Homunculus skill');
    }
  }

  // 5. Add Homunculus section to CLAUDE.md
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
    copyDir(CORE_DIR, path.join(projectDir, 'homunculus', 'scripts'), 'core', projectDir);
    console.log('  \x1b[32m✓\x1b[0m Copied evolution scripts');
  }

  // 5. Copy slash commands (skip existing files)
  if (fs.existsSync(COMMANDS_DIR)) {
    const commandsDest = path.join(projectDir, '.claude', 'commands');
    ensureDir(commandsDest);
    let commandsCopied = 0;
    let commandsSkipped = 0;
    for (const entry of fs.readdirSync(COMMANDS_DIR, { withFileTypes: true })) {
      if (entry.isFile()) {
        const destFile = path.join(commandsDest, entry.name);
        if (fs.existsSync(destFile)) {
          console.log(`  \x1b[33m!\x1b[0m Skipped ${entry.name} (already exists)`);
          trackFile(destFile, 'command', projectDir);
          commandsSkipped++;
        } else {
          fs.copyFileSync(path.join(COMMANDS_DIR, entry.name), destFile);
          trackFile(destFile, 'command', projectDir);
          commandsCopied++;
        }
      }
    }
    if (commandsCopied > 0) {
      console.log('  \x1b[32m✓\x1b[0m Added slash commands (/hm-goal, /hm-night, /hm-status)');
    }
    if (commandsSkipped > 0 && commandsCopied === 0) {
      console.log('  \x1b[33m-\x1b[0m All slash commands already exist, skipped');
    }
  }

  // 6. Configure observation hooks (harness-aware)
  const observeCommand = "bash homunculus/scripts/observe.sh post";
  const hooksCfg = adapter.hooksConfig(projectDir, observeCommand);

  ensureDir(path.dirname(hooksCfg.settingsPath));

  if (harness === 'claude-code') {
    // Claude Code: merge into .claude/settings.json under hooks.PostToolUse
    let settings = {};
    if (fs.existsSync(hooksCfg.settingsPath)) {
      try { settings = JSON.parse(fs.readFileSync(hooksCfg.settingsPath, 'utf8')); } catch {}
    }
    if (!settings.hooks) settings.hooks = {};
    const eventKey = hooksCfg.hookEventKey;  // 'PostToolUse'
    if (!settings.hooks[eventKey]) {
      settings.hooks[eventKey] = [hooksCfg.hookEntry];
      fs.writeFileSync(hooksCfg.settingsPath, JSON.stringify(settings, null, 2) + '\n');
      console.log('  \x1b[32m✓\x1b[0m Configured observation hook');
    } else {
      const alreadyPresent = hooksCfg.alreadyPresentCheck(settings.hooks[eventKey]);
      if (!alreadyPresent) {
        settings.hooks[eventKey].push(hooksCfg.hookEntry);
        fs.writeFileSync(hooksCfg.settingsPath, JSON.stringify(settings, null, 2) + '\n');
        console.log('  \x1b[32m✓\x1b[0m Merged observation hook into existing PostToolUse hooks');
      } else {
        console.log('  \x1b[33m-\x1b[0m Observation hook already present in PostToolUse');
      }
    }
  } else {
    // Cursor / Codex: write hooks.json or codex.json with array of hook entries
    let existing = [];
    if (fs.existsSync(hooksCfg.settingsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(hooksCfg.settingsPath, 'utf8'));
        // Cursor/Codex: hooks may be top-level array or nested under "hooks" key
        existing = hooksCfg.hookEventKey ? (raw[hooksCfg.hookEventKey] || []) : (Array.isArray(raw) ? raw : []);
      } catch {}
    }

    const alreadyPresent = hooksCfg.alreadyPresentCheck(existing);
    if (!alreadyPresent) {
      const entries = [hooksCfg.hookEntry, ...(hooksCfg.extraHookEntries || [])];
      const merged = [...existing, ...entries];
      let output;
      if (hooksCfg.hookEventKey) {
        // Merge into existing file object
        let fileObj = {};
        if (fs.existsSync(hooksCfg.settingsPath)) {
          try { fileObj = JSON.parse(fs.readFileSync(hooksCfg.settingsPath, 'utf8')); } catch {}
        }
        fileObj[hooksCfg.hookEventKey] = merged;
        output = JSON.stringify(fileObj, null, 2) + '\n';
      } else {
        // Top-level array format (Cursor hooks.json)
        output = JSON.stringify(merged, null, 2) + '\n';
      }
      fs.writeFileSync(hooksCfg.settingsPath, output);
      console.log(`  \x1b[32m✓\x1b[0m Configured observation hooks (${harnessLabels[harness]})`);
    } else {
      console.log(`  \x1b[33m-\x1b[0m Observation hooks already present (${harnessLabels[harness]})`);
    }
  }

  // 7. Create .gitignore additions
  const gitignorePath = path.join(projectDir, '.gitignore');
  const gitignoreEntries = [
    '',
    '# Homunculus runtime data',
    'homunculus/observations.jsonl*',
    'homunculus/.manifest.json',
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
    console.log('    3) \x1b[1mfull\x1b[0m     — + deeper research + bonus loop (~$5-10/night)');
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

  // 9. Write manifest for upgrade tracking
  const manifestData = {
    version: pkgVersion,
    installed_at: new Date().toISOString(),
    files: {},
  };
  for (const f of copiedFiles) {
    manifestData.files[f.dest] = { hash: f.hash, category: f.category };
  }
  const manifestPath = path.join(projectDir, 'homunculus', '.manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2) + '\n');
  console.log('  \x1b[32m✓\x1b[0m Generated upgrade manifest');

  // Done
  const harnessOpenCmd = harness === 'cursor' ? 'cursor .' : harness === 'codex' ? 'codex' : 'claude';
  console.log('');
  console.log('  \x1b[1m\x1b[32mDone!\x1b[0m Homunculus is installed.');
  console.log('');
  console.log('  Next steps:');
  console.log(`    1. Run \x1b[1m${harnessOpenCmd}\x1b[0m to open ${harnessLabels[harness] || harness}`);
  console.log('    2. Type \x1b[1m/hm-goal\x1b[0m to define your goals (AI-guided)');
  console.log('    3. Type \x1b[1m/hm-night\x1b[0m to run your first evolution cycle');
  console.log('');
}

main();
