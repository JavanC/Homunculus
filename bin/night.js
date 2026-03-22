#!/usr/bin/env node
// homunculus night — Run one evolution cycle
// Simulates what the nightly agent does: health check → evolve → research → report

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = process.cwd();
const HOMUNCULUS_DIR = path.join(projectDir, 'homunculus');
const ARCH_FILE = path.join(projectDir, 'architecture.yaml');
const INSTINCTS_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'personal');
const ARCHIVED_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'archived');
const SKILLS_DIR = path.join(HOMUNCULUS_DIR, 'evolved', 'skills');
const EVALS_DIR = path.join(HOMUNCULUS_DIR, 'evolved', 'evals');
const OBS_FILE = path.join(HOMUNCULUS_DIR, 'observations.jsonl');
const SCRIPTS_DIR = path.join(projectDir, 'scripts');

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

function countFiles(dir, ext = '.md') {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith(ext)).length;
  } catch { return 0; }
}

function countLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseGoals(yamlContent) {
  const goals = [];
  const lines = yamlContent.split('\n');
  let currentGoal = null;
  let indent = 0;

  for (const line of lines) {
    // Match top-level goals (direct children of "goals:")
    const goalMatch = line.match(/^    (\w+):$/);
    if (goalMatch && !line.includes('purpose') && !line.includes('metrics') &&
        !line.includes('health_check') && !line.includes('realized_by') &&
        !line.includes('goals:') && !line.includes('command') &&
        !line.includes('expected') && !line.includes('healthy') &&
        !line.includes('name:') && !line.includes('source')) {
      currentGoal = goalMatch[1];
    }

    const purposeMatch = line.match(/purpose:\s*"(.+)"/);
    if (purposeMatch && currentGoal) {
      goals.push({ name: currentGoal, purpose: purposeMatch[1] });
      currentGoal = null;
    }
  }
  return goals;
}

async function main() {
  console.log('');
  console.log(`  ${bold('🌙 Homunculus — Evolution Cycle')}`);
  console.log(`  ${dim(new Date().toISOString().replace('T', ' ').slice(0, 19))}`);
  console.log('');

  // Check if initialized
  if (!fs.existsSync(HOMUNCULUS_DIR)) {
    console.log(`  ${red('✗')} Not initialized. Run ${bold('npx homunculus-code init')} first.`);
    process.exit(1);
  }

  // ─────────────────────────────────────────
  // Phase 1: Health Check
  // ─────────────────────────────────────────
  console.log(`  ${bold('[1/5] Health Check')}`);
  await sleep(300);

  if (fs.existsSync(ARCH_FILE)) {
    const yaml = fs.readFileSync(ARCH_FILE, 'utf8');
    const goals = parseGoals(yaml);

    if (goals.length > 0) {
      for (const goal of goals) {
        // Simple heuristic: if realized_by exists and points to real file = healthy
        const status = yellow('○ no data yet');
        console.log(`        ${goal.name}: ${status}`);
        console.log(`        ${dim(goal.purpose)}`);
      }
    } else {
      console.log(`        ${yellow('○')} No goals defined in architecture.yaml`);
    }
  } else {
    console.log(`        ${red('✗')} architecture.yaml not found`);
  }

  console.log('');
  await sleep(200);

  // ─────────────────────────────────────────
  // Phase 2: Scan Instincts
  // ─────────────────────────────────────────
  console.log(`  ${bold('[2/5] Scan Instincts')}`);
  await sleep(300);

  const activeInstincts = countFiles(INSTINCTS_DIR);
  const archivedInstincts = countFiles(ARCHIVED_DIR);
  const observations = countLines(OBS_FILE);

  if (activeInstincts > 0) {
    console.log(`        ${green('✓')} ${activeInstincts} active instincts (${archivedInstincts} archived)`);

    // Run prune check
    try {
      const pruneScript = path.join(SCRIPTS_DIR, 'prune-instincts.js');
      if (fs.existsSync(pruneScript)) {
        const result = execSync(`node "${pruneScript}"`, {
          encoding: 'utf8', timeout: 10000, cwd: projectDir
        });
        const candidateMatch = result.match(/Candidates:\s*(\d+)/);
        if (candidateMatch && parseInt(candidateMatch[1]) > 0) {
          console.log(`        ${yellow('△')} ${candidateMatch[1]} instincts eligible for archival`);
        }
      }
    } catch {}
  } else if (observations > 0) {
    console.log(`        ${yellow('○')} ${observations} observations recorded, no instincts extracted yet`);
    console.log(`        ${dim('Tip: instincts are extracted at session end when enough patterns emerge')}`);
  } else {
    console.log(`        ${yellow('○')} No instincts yet — use Claude Code normally, patterns will emerge`);
    console.log(`        ${dim('The observation hook is watching. Keep using Claude Code.')}`);
  }

  console.log('');
  await sleep(200);

  // ─────────────────────────────────────────
  // Phase 3: Eval Skills
  // ─────────────────────────────────────────
  console.log(`  ${bold('[3/5] Eval Skills')}`);
  await sleep(300);

  const skillCount = countFiles(SKILLS_DIR);
  const evalCount = countFiles(EVALS_DIR, '.yaml');

  if (skillCount > 0) {
    console.log(`        ${green('✓')} ${skillCount} evolved skills found`);

    // List skills
    try {
      const skills = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
      for (const skill of skills) {
        const name = skill.replace('.md', '');
        const hasEval = fs.existsSync(path.join(EVALS_DIR, `${name}.eval.yaml`));
        if (hasEval) {
          console.log(`          ${green('✓')} ${name} — has eval spec`);
        } else {
          console.log(`          ${yellow('○')} ${name} — no eval spec yet`);
        }
      }
    } catch {}

    if (evalCount > 0) {
      console.log(`        ${dim(`Run 'claude "/eval-skill"' to evaluate, or let the nightly agent handle it`)}`);
    }
  } else {
    console.log(`        ${yellow('○')} No skills yet — instincts converge into skills over time`);
    console.log(`        ${dim(`Once you have 3+ related instincts, run 'claude "/evolve"'`)}`);
  }

  console.log('');
  await sleep(200);

  // ─────────────────────────────────────────
  // Phase 4: Research
  // ─────────────────────────────────────────
  console.log(`  ${bold('[4/5] Research')}`);
  await sleep(300);

  // Check Claude Code version
  try {
    const version = execSync('claude --version 2>/dev/null', {
      encoding: 'utf8', timeout: 5000
    }).trim();
    console.log(`        ${green('✓')} Claude Code ${version}`);
  } catch {
    console.log(`        ${yellow('○')} Claude Code version check skipped`);
  }

  // Check Node version
  const nodeVersion = process.version;
  console.log(`        ${green('✓')} Node.js ${nodeVersion}`);

  // Check architecture health
  if (fs.existsSync(ARCH_FILE)) {
    const yaml = fs.readFileSync(ARCH_FILE, 'utf8');
    const goalCount = (yaml.match(/purpose:/g) || []).length;
    const healthChecks = (yaml.match(/health_check:/g) || []).length;
    const realizedBy = (yaml.match(/realized_by:/g) || []).length;

    if (healthChecks < goalCount / 2) {
      console.log(`        ${yellow('△')} ${healthChecks}/${goalCount} goals have health checks — add more for better evolution`);
    }
    if (realizedBy < goalCount / 2) {
      console.log(`        ${yellow('△')} ${realizedBy}/${goalCount} goals have implementations — some are waiting to evolve`);
    }
  }

  console.log('');
  await sleep(200);

  // ─────────────────────────────────────────
  // Phase 5: Report
  // ─────────────────────────────────────────
  console.log(`  ${bold('[5/5] Report')}`);
  await sleep(300);

  const reportDate = new Date().toISOString().slice(0, 10);
  const reportLines = [];

  console.log('');
  console.log(`  ┌${'─'.repeat(52)}┐`);
  console.log(`  │ ${bold(`  Evolution Report — ${reportDate}`)}              │`);
  console.log(`  ├${'─'.repeat(52)}┤`);

  // Summary
  const goalCount = fs.existsSync(ARCH_FILE)
    ? (fs.readFileSync(ARCH_FILE, 'utf8').match(/purpose:/g) || []).length
    : 0;

  console.log(`  │                                                    │`);
  console.log(`  │  ${cyan('Goals:')}          ${String(goalCount).padStart(3)}                              │`);
  console.log(`  │  ${cyan('Instincts:')}      ${String(activeInstincts).padStart(3)} active / ${String(archivedInstincts).padStart(3)} archived       │`);
  console.log(`  │  ${cyan('Skills:')}          ${String(skillCount).padStart(3)} (${evalCount} with eval specs)          │`);
  console.log(`  │  ${cyan('Observations:')}  ${String(observations).padStart(5)}                              │`);
  console.log(`  │                                                    │`);

  if (activeInstincts === 0 && skillCount === 0) {
    console.log(`  │  ${bold('Status:')} Fresh install — ready to evolve          │`);
    console.log(`  │                                                    │`);
    console.log(`  │  ${dim('Next steps:')}                                      │`);
    console.log(`  │  ${dim('1. Use Claude Code on your project')}                │`);
    console.log(`  │  ${dim('2. Patterns will be auto-extracted')}                │`);
    console.log(`  │  ${dim('3. Run this command again to see progress')}         │`);
  } else if (skillCount === 0) {
    console.log(`  │  ${bold('Status:')} Collecting patterns...                   │`);
    console.log(`  │                                                    │`);
    console.log(`  │  ${dim('You have instincts! When 3+ are related,')}         │`);
    console.log(`  │  ${dim('run claude "/evolve" to create your first skill.')} │`);
  } else {
    console.log(`  │  ${bold('Status:')} ${green('Evolving')}                                  │`);
    console.log(`  │                                                    │`);
    console.log(`  │  ${dim('Run claude "/eval-skill" to check quality,')}       │`);
    console.log(`  │  ${dim('or set up the nightly agent for autonomy.')}        │`);
  }

  console.log(`  │                                                    │`);
  console.log(`  └${'─'.repeat(52)}┘`);
  console.log('');

  // Save report to file
  const reportDir = path.join(HOMUNCULUS_DIR, 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const reportContent = [
    `# Evolution Report — ${reportDate}`,
    '',
    '## Summary',
    `- Goals: ${goalCount}`,
    `- Instincts: ${activeInstincts} active / ${archivedInstincts} archived`,
    `- Skills: ${skillCount} (${evalCount} with eval specs)`,
    `- Observations: ${observations}`,
    '',
    `Generated by \`npx homunculus-code night\``,
  ].join('\n');

  fs.writeFileSync(path.join(reportDir, `${reportDate}.md`), reportContent + '\n');
  console.log(`  ${dim(`Report saved to homunculus/reports/${reportDate}.md`)}`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
