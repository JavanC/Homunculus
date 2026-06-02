#!/usr/bin/env node
// homunculus report — Generate a shareable evolution report
// Usage:
//   node report.js           → rich terminal output (ANSI colors)
//   node report.js --share   → anonymized plain-text (safe to post online)

const fs = require('fs');
const path = require('path');

const SHARE_MODE = process.argv.includes('--share');
const PROJECT_DIR = process.cwd();
const HOMUNCULUS_DIR = path.join(PROJECT_DIR, 'homunculus');

// ── helpers ─────────────────────────────────────────────────────────────────

function c(ansiCode, text) {
  if (SHARE_MODE) return text;
  return `\x1b[${ansiCode}m${text}\x1b[0m`;
}
const bold   = (t) => c('1', t);
const dim    = (t) => c('2', t);
const green  = (t) => c('32', t);
const cyan   = (t) => c('36', t);
const yellow = (t) => c('33', t);

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      result[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
    }
  }
  return result;
}

function countFiles(dir, ext = '.md') {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith(ext)).length;
  } catch { return 0; }
}

function anonymize(text) {
  // Remove absolute paths containing usernames
  return text
    .replace(/\/Users\/[^/\s]+/g, '[project]')
    .replace(/\/home\/[^/\s]+/g, '[project]')
    .replace(/C:\\Users\\[^\\s]+/g, '[project]');
}

// ── data collection ──────────────────────────────────────────────────────────

function collectInstincts() {
  const personalDir = path.join(HOMUNCULUS_DIR, 'instincts', 'personal');
  const archivedDir = path.join(HOMUNCULUS_DIR, 'instincts', 'archived');

  const active = countFiles(personalDir);
  const archived = countFiles(archivedDir);

  // Categorize by confidence
  const categories = {};
  if (fs.existsSync(personalDir)) {
    for (const file of fs.readdirSync(personalDir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(personalDir, file), 'utf8');
      const fm = parseFrontmatter(content);
      const cat = fm.category || 'uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    }
  }

  return { active, archived, categories };
}

function collectSkills() {
  const skillsDir = path.join(HOMUNCULUS_DIR, 'evolved', 'skills');
  const skills = [];

  if (fs.existsSync(skillsDir)) {
    for (const file of fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(skillsDir, file), 'utf8');
      const fm = parseFrontmatter(content);

      // Parse eval_stats: "v1.4 | 100% pass | 25 scenarios | 2026-03-26"
      let passRate = null;
      let version = fm.version || fm['  version'] || '1.0';
      let scenarios = null;
      let discrimination = null;

      const evalStats = fm['  eval_stats'] || fm.eval_stats || '';
      const rateMatch = evalStats.match(/(\d+(?:\.\d+)?)%\s*pass/);
      const scenMatch = evalStats.match(/(\d+)\s*scenarios?/);
      const discMatch = evalStats.match(/discrim(?:ination)?[:\s]+(\d+(?:\.\d+)?)%/i);
      if (rateMatch) passRate = Math.round(parseFloat(rateMatch[1]));
      if (scenMatch) scenarios = parseInt(scenMatch[1]);
      if (discMatch) discrimination = Math.round(parseFloat(discMatch[1]));

      const name = fm.name || path.basename(file, '.md');
      skills.push({ name, version, passRate, scenarios, discrimination });
    }
  }

  const avgPassRate = skills.length && skills.some(s => s.passRate !== null)
    ? Math.round(skills.filter(s => s.passRate !== null).reduce((s, sk) => s + sk.passRate, 0) /
        skills.filter(s => s.passRate !== null).length)
    : null;

  const discriminations = skills.map(s => s.discrimination).filter(d => d !== null);
  const avgDiscrimination = discriminations.length
    ? Math.round(discriminations.reduce((a, b) => a + b, 0) / discriminations.length)
    : null;

  return { skills, avgPassRate, avgDiscrimination };
}

function collectObservations() {
  const obsFile = path.join(HOMUNCULUS_DIR, 'observations.jsonl');
  if (!fs.existsSync(obsFile)) return { total: 0, byWeek: [], topTools: [] };

  const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n').filter(Boolean);
  const total = lines.length;

  // Count by ISO week
  const weekCounts = {};
  const toolCounts = {};
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.timestamp) {
        const ts = new Date(obj.timestamp).getTime();
        const weeksAgo = Math.floor((now - ts) / WEEK_MS);
        if (weeksAgo >= 0 && weeksAgo < 8) {
          const label = weeksAgo === 0 ? 'This week' : `${weeksAgo}w ago`;
          weekCounts[label] = (weekCounts[label] || 0) + 1;
        }
      }
      const toolName = obj.tool_name || obj.tool;
      if (toolName) {
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      }
    } catch { /* skip malformed */ }
  }

  const byWeek = Object.entries(weekCounts)
    .sort((a, b) => {
      const rank = (k) => k === 'This week' ? 0 : parseInt(k);
      return rank(a[0]) - rank(b[0]);
    });

  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { total, byWeek, topTools };
}

function collectGoals() {
  const archFile = path.join(PROJECT_DIR, 'architecture.yaml');
  if (!fs.existsSync(archFile)) return 0;
  const content = fs.readFileSync(archFile, 'utf8');
  // Count lines with "purpose:" as proxy for goal nodes
  return (content.match(/^\s+purpose:/gm) || []).length;
}

function getProjectName() {
  const pkgFile = path.join(PROJECT_DIR, 'package.json');
  if (fs.existsSync(pkgFile)) {
    try { return JSON.parse(fs.readFileSync(pkgFile, 'utf8')).name || path.basename(PROJECT_DIR); }
    catch { /* */ }
  }
  return path.basename(PROJECT_DIR);
}

// ── rendering ────────────────────────────────────────────────────────────────

function barChart(value, max, width = 20) {
  if (max === 0) return '░'.repeat(width);
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function renderReport(instincts, skillData, obs, goalCount, projectName) {
  const lines = [];
  const now = new Date().toISOString().slice(0, 10);

  lines.push('');
  lines.push(bold(`# Evolution Report — ${projectName}`));
  lines.push(dim(`Generated: ${now}`));
  lines.push('');
  lines.push('─'.repeat(50));

  // ── Overview ─────────────────────────────────────────────
  lines.push('');
  lines.push(bold('## Overview'));
  lines.push('');
  lines.push(`  🧠 Active instincts   ${green(String(instincts.active).padStart(4))}`);
  lines.push(`  📦 Archived instincts ${dim(String(instincts.archived).padStart(4))}  (graduated to skills)`);
  lines.push(`  ⚡ Skills evolved     ${cyan(String(skillData.skills.length).padStart(4))}` +
    (skillData.avgPassRate !== null ? `  (avg pass rate: ${skillData.avgPassRate}%)` : ''));
  if (skillData.avgDiscrimination !== null) {
    lines.push(`  🎯 Discrimination     ${String(skillData.avgDiscrimination + '%').padStart(4)}  (how often skills change behavior)`);
  } else if (skillData.skills.length > 0) {
    lines.push(`  🎯 Discrimination     ${dim(' N/A')}  (run /eval-skill to measure)`);
  }
  lines.push(`  👁️  Observations       ${String(obs.total).padStart(4)}`);
  if (goalCount > 0) {
    lines.push(`  🎯 Goals defined      ${String(goalCount).padStart(4)}`);
  }

  // ── Skills ────────────────────────────────────────────────
  if (skillData.skills.length > 0) {
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');
    lines.push(bold('## Evolved Skills'));
    lines.push('');
    for (const sk of skillData.skills.sort((a, b) => (b.passRate || 0) - (a.passRate || 0))) {
      const rateStr = sk.passRate !== null ? `${sk.passRate}% pass` : 'no eval';
      const scenStr = sk.scenarios ? ` · ${sk.scenarios} scenarios` : '';
      const vStr = sk.version ? ` v${sk.version}` : '';
      lines.push(`  ${green('⚡')} ${bold(sk.name)}${dim(vStr)}  ${dim('·')}  ${rateStr}${dim(scenStr)}`);
    }
  }

  // ── Instinct categories ───────────────────────────────────
  if (Object.keys(instincts.categories).length > 0) {
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');
    lines.push(bold('## Instinct Categories'));
    lines.push('');
    const maxCat = Math.max(...Object.values(instincts.categories));
    for (const [cat, count] of Object.entries(instincts.categories).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${barChart(count, maxCat, 15)}  ${count.toString().padStart(2)}  ${cat}`);
    }
  }

  // ── Weekly timeline ───────────────────────────────────────
  if (obs.byWeek.length > 0) {
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');
    lines.push(bold('## Observation Timeline'));
    lines.push('');
    const maxObs = Math.max(...obs.byWeek.map(([, c]) => c));
    for (const [label, count] of obs.byWeek) {
      const bar = barChart(count, maxObs, 25);
      lines.push(`  ${label.padEnd(10)}  ${bar}  ${count}`);
    }
  }

  // ── Top observations ──────────────────────────────────────
  if (obs.topTools.length > 0) {
    lines.push('');
    lines.push('─'.repeat(50));
    lines.push('');
    lines.push(bold('## Top Observations (by tool)'));
    lines.push('');
    const maxTool = obs.topTools[0][1];
    for (const [tool, count] of obs.topTools) {
      lines.push(`  ${barChart(count, maxTool, 20)}  ${count.toString().padStart(4)}  ${tool}`);
    }
  }

  // ── Footer ────────────────────────────────────────────────
  lines.push('');
  lines.push('─'.repeat(50));
  lines.push('');
  if (SHARE_MODE) {
    lines.push(dim('Generated with Homunculus — https://github.com/[owner]/homunculus'));
    lines.push(dim('Your AI assistant gets better every night, without you lifting a finger.'));
  } else {
    lines.push(dim('Generated with Homunculus — npx homunculus-code init'));
  }
  lines.push('');

  return lines.join('\n');
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(HOMUNCULUS_DIR)) {
    console.error('  ⚠️  No homunculus/ directory found. Run: npx homunculus-code init');
    process.exit(1);
  }

  const instincts = collectInstincts();
  const skillData = collectSkills();
  const obs = collectObservations();
  const goalCount = collectGoals();
  const projectName = getProjectName();

  let report = renderReport(instincts, skillData, obs, goalCount, projectName);

  if (SHARE_MODE) {
    report = anonymize(report);
  }

  console.log(report);
}

main();
