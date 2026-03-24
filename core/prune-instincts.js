#!/usr/bin/env node
// prune-instincts.js — Auto-archive low-value instincts
//
// Scoring dimensions:
// 1. Age (older = more likely outdated)
// 2. Confidence with time decay (half-life based)
// 3. Skill coverage (already covered by a skill = lower value)
//
// Usage:
//   node prune-instincts.js              # Dry run — list archive candidates
//   node prune-instincts.js --apply      # Execute archival
//   node prune-instincts.js --threshold 40  # Custom score threshold (default: 75)

const fs = require('fs');
const path = require('path');

// Configuration — override with environment variables
const BASE_DIR = process.env.HOMUNCULUS_BASE || process.cwd();
const PERSONAL_DIR = path.join(BASE_DIR, 'homunculus', 'instincts', 'personal');
const ARCHIVED_DIR = path.join(BASE_DIR, 'homunculus', 'instincts', 'archived');
const SKILLS_DIR = path.join(BASE_DIR, 'homunculus', 'evolved', 'skills');

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const thresholdIdx = args.indexOf('--threshold');
const ARCHIVE_THRESHOLD = thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1], 10) : 75;
const CAPACITY_SOFT_LIMIT = 80;

// Confidence decay: half-life in days
const CONFIDENCE_HALF_LIFE_DAYS = 90;
const DECAY_LAMBDA = Math.LN2 / CONFIDENCE_HALF_LIFE_DAYS;

function safeRead(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch { return ''; }
}

function parseInstinct(filepath) {
  const content = safeRead(filepath);
  const name = path.basename(filepath, '.md');

  const confidence = parseFloat((content.match(/confidence:\s*([\d.]+)/im) || [])[1] || '0.5');
  const createdMatch = content.match(/(?:extracted|created|date):\s*"?([^"\n]+)"?/im);
  const created = createdMatch ? new Date(createdMatch[1]) : null;
  const updatedMatch = content.match(/(?:updated|last_reinforced):\s*"?([^"\n]+)"?/im);
  const updated = updatedMatch ? new Date(updatedMatch[1]) : created;

  // Confidence decay
  const daysSinceUpdate = updated ? (Date.now() - updated.getTime()) / 86400000 : 180;
  const effectiveConfidence = confidence * Math.exp(-DECAY_LAMBDA * daysSinceUpdate);

  return { name, confidence, effectiveConfidence, created, updated, daysSinceUpdate, content };
}

function getSkillCoverage() {
  const coverage = new Set();
  if (!fs.existsSync(SKILLS_DIR)) return coverage;

  for (const file of fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'))) {
    const content = safeRead(path.join(SKILLS_DIR, file));
    // Skills often reference instinct names they were derived from
    const sourceMatch = content.match(/source_instincts?:(.+)/gim);
    if (sourceMatch) {
      for (const match of sourceMatch) {
        const names = match.replace(/source_instincts?:/i, '').split(/[,\s]+/);
        names.forEach(n => coverage.add(n.trim()));
      }
    }
  }
  return coverage;
}

function scoreInstinct(instinct, skillCoverage, totalCount) {
  let score = 100;
  const reasons = [];

  // Effective confidence (with decay)
  if (instinct.effectiveConfidence < 0.5) {
    score -= 30;
    reasons.push(`low effective confidence: ${instinct.effectiveConfidence.toFixed(2)}`);
  } else if (instinct.effectiveConfidence < 0.7) {
    score -= 15;
    reasons.push(`medium confidence: ${instinct.effectiveConfidence.toFixed(2)}`);
  }

  // Age penalty
  if (instinct.daysSinceUpdate > 60) {
    score -= 20;
    reasons.push(`old: ${Math.floor(instinct.daysSinceUpdate)} days`);
  } else if (instinct.daysSinceUpdate > 30) {
    score -= 10;
    reasons.push(`aging: ${Math.floor(instinct.daysSinceUpdate)} days`);
  }

  // Skill coverage
  if (skillCoverage.has(instinct.name)) {
    score -= 25;
    reasons.push('covered by skill');
  }

  // Capacity pressure
  if (totalCount > CAPACITY_SOFT_LIMIT) {
    score -= Math.min(10, totalCount - CAPACITY_SOFT_LIMIT);
    reasons.push(`capacity pressure: ${totalCount}/${CAPACITY_SOFT_LIMIT}`);
  }

  return { score: Math.max(0, score), reasons };
}

function main() {
  if (!fs.existsSync(PERSONAL_DIR)) {
    console.log('No instincts directory found. Nothing to prune.');
    return;
  }

  const files = fs.readdirSync(PERSONAL_DIR).filter(f => f.endsWith('.md'));
  const skillCoverage = getSkillCoverage();
  const candidates = [];

  for (const file of files) {
    const instinct = parseInstinct(path.join(PERSONAL_DIR, file));
    const { score, reasons } = scoreInstinct(instinct, skillCoverage, files.length);

    if (score < ARCHIVE_THRESHOLD) {
      candidates.push({ ...instinct, score, reasons });
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  console.log(`\nInstincts: ${files.length} active | Threshold: ${ARCHIVE_THRESHOLD} | Candidates: ${candidates.length}`);
  console.log('─'.repeat(60));

  if (candidates.length === 0) {
    console.log('No archive candidates found.');
    return;
  }

  for (const c of candidates) {
    console.log(`  ${c.score.toString().padStart(3)} | ${c.name}`);
    console.log(`      ${c.reasons.join(', ')}`);
  }

  if (applyMode) {
    console.log('\nArchiving...');
    if (!fs.existsSync(ARCHIVED_DIR)) fs.mkdirSync(ARCHIVED_DIR, { recursive: true });

    for (const c of candidates) {
      const src = path.join(PERSONAL_DIR, `${c.name}.md`);
      const dest = path.join(ARCHIVED_DIR, `${c.name}.md`);
      // Append archive metadata before moving
      const note = `\n\n---\n_Archived: ${new Date().toISOString().slice(0, 10)} | Covered-by: ${c.reason || 'low-score'} | Score: ${c.score}_\n`;
      fs.appendFileSync(src, note);
      fs.renameSync(src, dest);
      console.log(`  Archived: ${c.name}`);
    }
    console.log(`\nDone. Archived ${candidates.length} instincts.`);
  } else {
    console.log(`\nDry run. Use --apply to archive these ${candidates.length} instincts.`);
  }
}

main();
