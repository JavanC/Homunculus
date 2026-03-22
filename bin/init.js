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
  console.log('  Select areas you want your AI to improve in:');
  console.log('');

  const goalOptions = [
    { key: '1', name: 'code_quality', label: 'Code Quality', desc: 'Ship fewer bugs, better tests' },
    { key: '2', name: 'productivity', label: 'Productivity', desc: 'Complete tasks faster' },
    { key: '3', name: 'debugging', label: 'Debugging', desc: 'Faster root cause analysis' },
    { key: '4', name: 'documentation', label: 'Documentation', desc: 'Keep docs up to date' },
    { key: '5', name: 'automation', label: 'Automation', desc: 'Automate repetitive work' },
    { key: '6', name: 'learning', label: 'Continuous Learning', desc: 'Stay up to date with tools and patterns' },
  ];

  for (const opt of goalOptions) {
    console.log(`    ${opt.key}. ${opt.label} — ${opt.desc}`);
  }
  console.log('');

  const selectedStr = await ask('  Select areas (enter numbers, e.g. 1,2,5)', '1,2');
  const selectedKeys = selectedStr.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
  const selectedGoals = goalOptions.filter(o => selectedKeys.includes(o.key));
  if (selectedGoals.length === 0) selectedGoals.push(goalOptions[0], goalOptions[1]);

  console.log('');

  const vars = {
    PROJECT_NAME: projectName,
    PROJECT_PURPOSE: purpose
  };

  // Generate architecture.yaml from selected goals
  function generateArchitecture(goals, rootPurpose) {
    let yaml = `# architecture.yaml — Your goal tree\n`;
    yaml += `# Goals are stable. Implementations evolve.\n`;
    yaml += `# See: https://github.com/JavanC/Homunculus\n\n`;
    yaml += `version: "1.0"\n\n`;
    yaml += `root:\n`;
    yaml += `  purpose: "${rootPurpose}"\n\n`;
    yaml += `  goals:\n`;

    const goalTemplates = {
      code_quality: {
        purpose: 'Ship fewer bugs, write more maintainable code',
        goals: {
          testing: { purpose: 'Every change has tests', realized_by: '# will evolve' },
          review: { purpose: 'Catch issues before merge', realized_by: '# will evolve' }
        },
        metrics: [{ name: 'test_pass_rate', healthy: '> 90%' }]
      },
      productivity: {
        purpose: 'Complete tasks faster with fewer iterations',
        goals: {
          task_completion: { purpose: 'Finish tasks in fewer cycles', realized_by: '# will evolve' },
          tool_mastery: { purpose: 'Use the right tool on first try', realized_by: '# will evolve' }
        },
        metrics: [{ name: 'avg_iterations_per_task', healthy: 'decreasing trend' }]
      },
      debugging: {
        purpose: 'Find and fix bugs faster',
        goals: {
          root_cause: { purpose: 'Identify root causes, not symptoms', realized_by: '# will evolve' },
          diagnosis_tools: { purpose: 'Use the right debugging approach', realized_by: '# will evolve' }
        },
        metrics: [{ name: 'avg_debug_time', healthy: 'decreasing trend' }]
      },
      documentation: {
        purpose: 'Keep documentation accurate and up to date',
        goals: {
          api_docs: { purpose: 'API docs match implementation', realized_by: '# will evolve' },
          decision_records: { purpose: 'Document why, not just what', realized_by: '# will evolve' }
        },
        metrics: [{ name: 'doc_freshness', healthy: '< 1 week behind code' }]
      },
      automation: {
        purpose: 'Automate repetitive work',
        goals: {
          ci_cd: { purpose: 'Automated build, test, deploy', realized_by: '# will evolve' },
          workflows: { purpose: 'Common sequences as one command', realized_by: '# will evolve' }
        },
        metrics: [{ name: 'manual_steps_per_deploy', healthy: '< 3' }]
      },
      learning: {
        purpose: 'Stay up to date with tools and best practices',
        goals: {
          tool_updates: { purpose: 'Track and adopt useful updates', realized_by: '# will evolve' },
          pattern_discovery: { purpose: 'Find better ways to do things', realized_by: '# will evolve' }
        },
        metrics: [{ name: 'patterns_adopted_per_month', healthy: '> 2' }]
      }
    };

    for (const goal of goals) {
      const tmpl = goalTemplates[goal.name];
      if (!tmpl) continue;
      yaml += `    ${goal.name}:\n`;
      yaml += `      purpose: "${tmpl.purpose}"\n`;
      if (tmpl.metrics) {
        yaml += `      metrics:\n`;
        for (const m of tmpl.metrics) {
          yaml += `        - name: ${m.name}\n`;
          yaml += `          healthy: "${m.healthy}"\n`;
        }
      }
      if (tmpl.goals) {
        yaml += `      goals:\n`;
        for (const [subName, sub] of Object.entries(tmpl.goals)) {
          yaml += `        ${subName}:\n`;
          yaml += `          purpose: "${sub.purpose}"\n`;
          yaml += `          realized_by: ${sub.realized_by}\n`;
        }
      }
      yaml += `\n`;
    }

    yaml += `    # Add more goals as your system evolves...\n`;
    return yaml;
  }

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

  // 2. Generate architecture.yaml from selected goals
  const archDest = path.join(projectDir, 'architecture.yaml');
  if (!fs.existsSync(archDest)) {
    const archContent = generateArchitecture(selectedGoals, purpose);
    fs.writeFileSync(archDest, archContent);
    console.log(`  \x1b[32m✓\x1b[0m Created architecture.yaml with ${selectedGoals.length} goals: ${selectedGoals.map(g => g.label).join(', ')}`);
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
