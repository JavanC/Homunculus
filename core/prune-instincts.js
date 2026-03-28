#!/usr/bin/env node
// prune-instincts.js — Auto-archive low-value instincts
//
// v0.9.0: Reference frequency scoring, 3-tier skill coverage, grace period, --json
//
// Scoring dimensions:
// 0. Capacity pressure (soft limit)
// 1. Age (older = more likely outdated)
// 2. Reference frequency (actually used = higher value)
// 3. Skill coverage — 3 tiers: direct evolved / high overlap / partial overlap
// 4. Content size (tiny instincts = less valuable)
// 5. Confidence with time decay (half-life based, 14-day grace period)
//
// Usage:
//   node prune-instincts.js              # Dry run — list archive candidates
//   node prune-instincts.js --apply      # Execute archival
//   node prune-instincts.js --threshold 40  # Custom score threshold (default: 75)
//   node prune-instincts.js --json       # Output JSON for programmatic use

const fs = require('fs');
const path = require('path');

// Configuration — override with environment variables
const BASE_DIR = process.env.HOMUNCULUS_BASE || process.cwd();
const HOMUNCULUS_DIR = path.join(BASE_DIR, 'homunculus');
const PERSONAL_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'personal');
const ARCHIVED_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'archived');
const SKILLS_DIR = path.join(HOMUNCULUS_DIR, 'evolved', 'skills');
const REF_FILE = path.join(HOMUNCULUS_DIR, 'reference-tracking.jsonl');

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const jsonMode = args.includes('--json');
const thresholdIdx = args.indexOf('--threshold');
const ARCHIVE_THRESHOLD = thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1], 10) : 75;
const CAPACITY_SOFT_LIMIT = parseInt(process.env.HOMUNCULUS_CAPACITY_LIMIT || '80');

// Confidence decay: half-life in days
const CONFIDENCE_HALF_LIFE_DAYS = 90;
const DECAY_LAMBDA = Math.LN2 / CONFIDENCE_HALF_LIFE_DAYS;
const GRACE_PERIOD_DAYS = 14; // No decay for first 2 weeks

function safeRead(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch { return ''; }
}

function parseInstinct(filepath) {
  const content = safeRead(filepath);
  const name = path.basename(filepath, '.md');

  // Support both plain and markdown-bold metadata formats
  const confidence = parseFloat((content.match(/\*?\*?confidence\*?\*?:?\s*([\d.]+)/im) || [])[1] || '0.5');
  const createdMatch = content.match(/(?:extracted|created|date):\s*"?([^"\n]+)"?/im);
  const created = createdMatch ? new Date(createdMatch[1]) : null;
  const updatedMatch = content.match(/(?:updated|last_reinforced):\s*"?([^"\n]+)"?/im);
  const updated = updatedMatch ? new Date(updatedMatch[1]) : created;
  const source = (content.match(/\*?\*?source\*?\*?:?\s*"?([^"\n]+)"?/im) || [])[1]?.trim() || 'unknown';

  return { name, filepath, content, confidence, created, updated, source };
}

// Load reference tracking data (from observe.sh)
function loadReferenceData() {
  const refs = {};
  const content = safeRead(REF_FILE);
  if (!content) return refs;

  for (const line of content.split('\n').filter(l => l.trim())) {
    try {
      const entry = JSON.parse(line);
      const p = entry.path || '';
      if (!refs[p]) refs[p] = { count: 0, lastRef: null };
      refs[p].count++;
      const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;
      if (!refs[p].lastRef || ts > refs[p].lastRef) refs[p].lastRef = ts;
    } catch {}
  }
  return refs;
}

// Build token sets + evolved-from lists for each skill (3-tier coverage detection)
function loadSkillData() {
  const skills = {};
  if (!fs.existsSync(SKILLS_DIR)) return skills;
  try {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      let content;
      if (entry.isFile() && entry.name.endsWith('.md')) {
        content = safeRead(path.join(SKILLS_DIR, entry.name)).toLowerCase();
      } else if (entry.isDirectory()) {
        const indexPath = path.join(SKILLS_DIR, entry.name, 'index.md');
        if (fs.existsSync(indexPath)) content = safeRead(indexPath).toLowerCase();
      }
      if (!content) continue;
      const skillName = entry.name.replace('.md', '');
      const tokens = new Set(content.split(/[\s\-_,./:()\[\]{}#*>|]+/).filter(w => w.length > 4));
      // Extract "evolved from" instinct names
      const evolvedFrom = new Set();
      const matches = content.matchAll(/`([^`]+\.md)`/g);
      for (const m of matches) evolvedFrom.add(m[1].replace('.md', ''));
      skills[skillName] = { tokens, evolvedFrom };
    }
  } catch {}
  return skills;
}

function scoreInstinct(instinct, refs, skillData, now, totalRefs, activeCount) {
  let score = 100;
  const reasons = [];

  // 0. Capacity pressure
  if (activeCount > CAPACITY_SOFT_LIMIT) {
    const pressure = Math.min((activeCount - CAPACITY_SOFT_LIMIT) * 2, 20);
    score -= pressure;
    reasons.push(`capacity ${activeCount}/${CAPACITY_SOFT_LIMIT} (-${pressure})`);
  }

  // 1. Age penalty
  if (instinct.created) {
    const ageDays = (now - instinct.created.getTime()) / 86400000;
    if (ageDays > 30) {
      const penalty = Math.min(Math.floor((ageDays - 30) / 7) * 5, 30);
      if (penalty > 0) {
        score -= penalty;
        reasons.push(`age ${Math.round(ageDays)}d (-${penalty})`);
      }
    }
  }

  // 2. Reference frequency bonus/penalty
  const refData = refs[instinct.filepath];
  if (refData && refData.count > 0) {
    const bonus = Math.min(refData.count * 5, 25);
    score += bonus;
    reasons.push(`refs ${refData.count} (+${bonus})`);
  } else if (totalRefs > 50) {
    // Only penalize if we have enough data to be confident
    score -= 15;
    reasons.push('no refs (-15)');
  }

  // 3. Skill coverage — 3 tiers
  const instinctContent = (instinct.name + ' ' + instinct.content).toLowerCase();
  const instTokens = new Set(instinctContent.split(/[\s\-_,./:()\[\]{}#*>|]+/).filter(w => w.length > 4));

  let bestSkill = null, bestRatio = 0, directlyEvolved = false;
  for (const [skillName, { tokens: skillTokens, evolvedFrom }] of Object.entries(skillData)) {
    if (evolvedFrom.has(instinct.name)) {
      directlyEvolved = true;
      bestSkill = skillName;
      bestRatio = 1.0;
      break;
    }
    let overlap = 0;
    for (const t of instTokens) { if (skillTokens.has(t)) overlap++; }
    const ratio = instTokens.size > 0 ? overlap / instTokens.size : 0;
    if (ratio > bestRatio) { bestRatio = ratio; bestSkill = skillName; }
  }

  if (directlyEvolved) {
    score -= 35;
    reasons.push(`directly evolved into ${bestSkill} (-35)`);
  } else if (bestRatio >= 0.45) {
    const penalty = Math.min(Math.round(bestRatio * 50), 35);
    score -= penalty;
    reasons.push(`${Math.round(bestRatio * 100)}% covered by ${bestSkill} (-${penalty})`);
  } else if (bestRatio >= 0.30) {
    const penalty = Math.min(Math.round(bestRatio * 25), 15);
    score -= penalty;
    reasons.push(`${Math.round(bestRatio * 100)}% partial overlap with ${bestSkill} (-${penalty})`);
  }

  // 4. Content size penalty
  if (instinct.content.length < 300) {
    score -= 10;
    reasons.push(`tiny ${instinct.content.length}c (-10)`);
  }

  // 5. Confidence decay (with grace period)
  let effectiveConfidence = instinct.confidence;
  if (instinct.updated) {
    const daysSinceUpdate = (now - instinct.updated.getTime()) / 86400000;
    if (daysSinceUpdate > GRACE_PERIOD_DAYS) {
      const decayFactor = Math.exp(-DECAY_LAMBDA * (daysSinceUpdate - GRACE_PERIOD_DAYS));
      effectiveConfidence = instinct.confidence * decayFactor;
    }
  }
  if (effectiveConfidence < 0.3) {
    score -= 20;
    reasons.push(`confidence decayed ${instinct.confidence.toFixed(2)}→${effectiveConfidence.toFixed(2)} (-20)`);
  } else if (effectiveConfidence < 0.5) {
    score -= 15;
    reasons.push(`low effective confidence ${effectiveConfidence.toFixed(2)} (-15)`);
  } else if (effectiveConfidence < 0.7) {
    score -= 5;
    reasons.push(`mid effective confidence ${effectiveConfidence.toFixed(2)} (-5)`);
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, effectiveConfidence };
}

function main() {
  if (!fs.existsSync(PERSONAL_DIR)) {
    console.log('No instincts directory found. Nothing to prune.');
    return;
  }

  const now = Date.now();
  const files = fs.readdirSync(PERSONAL_DIR).filter(f => f.endsWith('.md'));
  const activeCount = files.length;

  console.log(`\n=== Instinct Pruning Analysis ===`);
  console.log(`Active: ${activeCount} | Soft limit: ${CAPACITY_SOFT_LIMIT} | Threshold: ${ARCHIVE_THRESHOLD}`);
  console.log(`Confidence decay: half-life ${CONFIDENCE_HALF_LIFE_DAYS}d, grace ${GRACE_PERIOD_DAYS}d`);
  console.log(`Mode: ${applyMode ? 'APPLY (will archive)' : 'DRY RUN (preview only)'}\n`);

  const refs = loadReferenceData();
  const totalRefs = Object.values(refs).reduce((a, b) => a + b.count, 0);
  console.log(`Reference tracking: ${totalRefs} total reads`);
  if (totalRefs < 50) {
    console.log(`  (Low data — reference scoring will be conservative)\n`);
  } else {
    console.log();
  }

  const skillData = loadSkillData();
  console.log(`Skills loaded: ${Object.keys(skillData).length}\n`);

  // Score all instincts
  const scored = files.map(f => {
    const instinct = parseInstinct(path.join(PERSONAL_DIR, f));
    const { score, reasons, effectiveConfidence } = scoreInstinct(instinct, refs, skillData, now, totalRefs, activeCount);
    return { ...instinct, score, reasons, effectiveConfidence };
  }).sort((a, b) => a.score - b.score);

  const candidates = scored.filter(i => i.score < ARCHIVE_THRESHOLD);
  const atRisk = scored.filter(i => i.score >= ARCHIVE_THRESHOLD && i.score < 50);

  // Display candidates
  if (candidates.length > 0) {
    console.log(`--- Archive Candidates (score < ${ARCHIVE_THRESHOLD}) ---\n`);
    for (const c of candidates) {
      console.log(`  [${c.score.toString().padStart(3)}] ${c.name}`);
      console.log(`        ${c.reasons.join(' | ')}`);
    }
    console.log();
  } else {
    console.log(`No archive candidates (all scores >= ${ARCHIVE_THRESHOLD})\n`);
  }

  // Display at-risk
  if (atRisk.length > 0) {
    console.log(`--- At Risk (${ARCHIVE_THRESHOLD}–49) ---\n`);
    for (const c of atRisk) {
      console.log(`  [${c.score.toString().padStart(3)}] ${c.name}`);
      console.log(`        ${c.reasons.join(' | ')}`);
    }
    console.log();
  }

  // Summary
  const afterArchive = activeCount - candidates.length;
  console.log(`--- Summary ---`);
  console.log(`Would archive: ${candidates.length} instincts`);
  console.log(`After pruning: ${afterArchive} active (${afterArchive > CAPACITY_SOFT_LIMIT ? 'above soft limit' : 'within capacity'})`);

  // Apply
  if (applyMode && candidates.length > 0) {
    console.log(`\nArchiving ${candidates.length} instincts...\n`);
    if (!fs.existsSync(ARCHIVED_DIR)) fs.mkdirSync(ARCHIVED_DIR, { recursive: true });

    for (const c of candidates) {
      const src = c.filepath;
      const dst = path.join(ARCHIVED_DIR, path.basename(src));
      const coveredBy = c.reasons
        .filter(r => r.includes('evolved into') || r.includes('covered by') || r.includes('overlap with'))
        .map(r => r.replace(/\s*\(-\d+\)/, ''))
        .join('; ') || 'low score';
      const note = `\n\n---\n_Archived: ${new Date().toISOString().slice(0, 10)} | Score: ${c.score} | Covered-by: ${coveredBy}_\n`;
      const content = safeRead(src) + note;
      fs.writeFileSync(dst, content);
      fs.unlinkSync(src);
      console.log(`  Archived: ${c.name} (score: ${c.score})`);
    }
    console.log(`\nDone. ${candidates.length} instincts archived.`);
  } else if (!applyMode && candidates.length > 0) {
    console.log(`\nDry run. Use --apply to archive these ${candidates.length} instincts.`);
  }

  // JSON output
  if (jsonMode) {
    const output = {
      active: activeCount,
      candidates: candidates.map(c => ({ name: c.name, score: c.score, reasons: c.reasons })),
      at_risk: atRisk.map(c => ({ name: c.name, score: c.score, reasons: c.reasons })),
      after_pruning: afterArchive
    };
    console.log('\n' + JSON.stringify(output, null, 2));
  }
}

main();
