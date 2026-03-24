#!/usr/bin/env node
// evaluate-session.js — Extract instincts from session observations
// Part of the Homunculus evolution pipeline
//
// Flow:
// 1. Read observations.jsonl, analyze tool usage patterns
// 2. Determine if session is worth extracting (enough activity)
// 3. Use Claude CLI to extract behavioral patterns as instincts
// 4. Write instincts to homunculus/instincts/personal/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration — adapt these to your setup
const BASE_DIR = process.env.HOMUNCULUS_BASE || process.cwd();
const HOMUNCULUS_DIR = path.join(BASE_DIR, 'homunculus');
const INSTINCTS_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'personal');
const OBS_FILE = path.join(HOMUNCULUS_DIR, 'observations.jsonl');

// Extraction thresholds (auto-tunable)
const CONFIG = {
  min_messages: parseInt(process.env.HOMUNCULUS_MIN_MESSAGES || '10'),
  min_tool_repeats: parseInt(process.env.HOMUNCULUS_MIN_TOOL_REPEATS || '5'),
  daily_limit: parseInt(process.env.HOMUNCULUS_DAILY_LIMIT || '3')
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDateString() {
  return new Date().toISOString().slice(0, 10);
}

function log(...args) {
  process.stderr.write('[evaluate-session] ' + args.join(' ') + '\n');
}

// Count today's extractions to respect daily limit
function getTodayExtractions() {
  const today = getDateString();
  try {
    const files = fs.readdirSync(INSTINCTS_DIR);
    return files.filter(f => {
      const content = fs.readFileSync(path.join(INSTINCTS_DIR, f), 'utf8');
      return content.includes(today);
    }).length;
  } catch {
    return 0;
  }
}

// Analyze observations to find patterns
function analyzeObservations() {
  if (!fs.existsSync(OBS_FILE)) {
    log('No observations file found');
    return null;
  }

  const lines = fs.readFileSync(OBS_FILE, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length < CONFIG.min_messages) {
    log(`Only ${lines.length} observations (need ${CONFIG.min_messages}), skipping`);
    return null;
  }

  // Count tool usage
  const toolCounts = {};
  for (const line of lines) {
    try {
      const obs = JSON.parse(line);
      const tool = obs.tool || 'unknown';
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    } catch {}
  }

  // Find high-frequency tools
  const frequentTools = Object.entries(toolCounts)
    .filter(([_, count]) => count >= CONFIG.min_tool_repeats)
    .sort((a, b) => b[1] - a[1]);

  if (frequentTools.length === 0) {
    log('No high-frequency tool patterns found, skipping');
    return null;
  }

  return {
    total_observations: lines.length,
    frequent_tools: frequentTools,
    tool_counts: toolCounts
  };
}

// Extract instinct using Claude CLI
function extractInstinct(analysis) {
  const toolSummary = analysis.frequent_tools
    .map(([tool, count]) => `${tool}: ${count} times`)
    .join(', ');

  // Read architecture.yaml goal names for goal_path tagging
  let goalHint = '';
  try {
    const archFile = path.join(BASE_DIR, 'architecture.yaml');
    if (fs.existsSync(archFile)) {
      const archContent = fs.readFileSync(archFile, 'utf8');
      const goals = [...archContent.matchAll(/^    (\w+):\s*$/gm)].map(m => m[1]).filter(g => !['goals', 'metrics', 'agents', 'health_check', 'test_config'].includes(g));
      goalHint = goals.length > 0 ? `\nGoal tree top-level goals: ${goals.join(', ')}` : '';
    }
  } catch {}

  const prompt = `Based on this session's tool usage patterns, extract ONE behavioral instinct that would be useful to remember for future sessions.

Tool usage: ${toolSummary}
Total observations: ${analysis.total_observations}
${goalHint}

Implementation mechanisms (pick the best fit for suggested_mechanism):
- hook: deterministic, every time, zero AI judgment (e.g. lint after edit)
- rule: path-scoped guidance for specific directories
- skill: reusable knowledge collection with eval spec
- script: periodic automation, no AI needed at runtime
- agent: isolated context, specialist role
- system: infrastructure-level

Write the instinct as a markdown file with this format:

---
name: descriptive-kebab-case-name
category: one of [coding, debugging, workflow, communication, tool-usage]
confidence: 0.7
extracted: "${getDateString()}"
source: "session observation"
suggested_mechanism: hook|rule|skill|script|agent|system
goal_path: "top_level_goal.sub_goal or unrooted if no match"
---

## Pattern
[Describe the behavioral pattern in 1-2 sentences]

## When to Apply
[When should this pattern be used]

## Anti-Patterns
[What to avoid]

IMPORTANT: Only output the markdown content, nothing else.`;

  try {
    const result = execSync(
      `claude -p "${prompt.replace(/"/g, '\\"')}" --model claude-sonnet-4-6 --max-budget-usd 0.50`,
      { encoding: 'utf8', timeout: 30000 }
    );

    // Extract name from frontmatter
    const nameMatch = result.match(/name:\s*(.+)/);
    if (!nameMatch) return null;

    const name = nameMatch[1].trim().replace(/[^a-z0-9-]/g, '-');
    const filename = `${name}.md`;
    const filepath = path.join(INSTINCTS_DIR, filename);

    if (fs.existsSync(filepath)) {
      log(`Instinct ${filename} already exists, skipping`);
      return null;
    }

    ensureDir(INSTINCTS_DIR);
    fs.writeFileSync(filepath, result.trim() + '\n');
    log(`Extracted instinct: ${filename}`);
    return filename;
  } catch (err) {
    log(`Extraction failed: ${err.message}`);
    return null;
  }
}

// Main
function main() {
  // Check daily limit
  const todayCount = getTodayExtractions();
  if (todayCount >= CONFIG.daily_limit) {
    log(`Daily limit reached (${todayCount}/${CONFIG.daily_limit}), skipping`);
    return;
  }

  const analysis = analyzeObservations();
  if (!analysis) return;

  const result = extractInstinct(analysis);
  if (result) {
    log(`Successfully extracted: ${result}`);
  }
}

main();
