#!/usr/bin/env node
// evaluate-session.js — Extract instincts, memory suggestions, and research topics from sessions
// Part of the Homunculus evolution pipeline
//
// v0.9.0: Three-layer extraction, dynamic daily cap, semantic dedup, Write Gate
//
// Flow:
// 1. Read observations.jsonl OR session transcript, analyze tool usage patterns
// 2. Check daily cooldown + dynamic limit based on session size
// 3. Use Claude CLI to extract behavioral patterns as instincts + memory + research
// 4. Write instincts to homunculus/instincts/personal/
// 5. Write memory/research suggestions to homunculus/reports/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration — adapt these to your setup
const BASE_DIR = process.env.HOMUNCULUS_BASE || process.cwd();
const HOMUNCULUS_DIR = path.join(BASE_DIR, 'homunculus');
const INSTINCTS_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'personal');
const ARCHIVE_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'archived');
const OBS_FILE = path.join(HOMUNCULUS_DIR, 'observations.jsonl');
const REPORTS_DIR = path.join(HOMUNCULUS_DIR, 'reports');
const COOLDOWN_FILE = path.join(HOMUNCULUS_DIR, '.cooldown.json');
const SCAN_STATE_FILE = path.join(HOMUNCULUS_DIR, '.scan-state.json');

// Extraction thresholds
const CONFIG = {
  min_messages: parseInt(process.env.HOMUNCULUS_MIN_MESSAGES || '10'),
  min_tool_repeats: parseInt(process.env.HOMUNCULUS_MIN_TOOL_REPEATS || '5'),
  // Dynamic daily cap: scales with session size
  daily_limit_thresholds: [0, 30, 60, 100],
  daily_limit_values:     [1,  2,  3,   5],
  hard_cap: 5
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

// Dynamic daily limit based on session size
function getDailyLimit(msgCount) {
  const { daily_limit_thresholds: thresholds, daily_limit_values: limits } = CONFIG;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (msgCount >= thresholds[i]) return limits[i] || 1;
  }
  return 1;
}

// Cooldown state file (O(1) lookup instead of scanning all instinct files)
function getCooldown() {
  try {
    return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
  } catch {
    return { date: null, count: 0 };
  }
}

function updateCooldown(count) {
  const today = getDateString();
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify({ date: today, count }));
}

// Get existing instinct names (for duplicate check)
function getExistingInstincts() {
  ensureDir(INSTINCTS_DIR);
  return fs.readdirSync(INSTINCTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

// Get existing instincts with titles for semantic supersede detection
function getExistingInstinctsWithTitles() {
  ensureDir(INSTINCTS_DIR);
  const results = [];
  for (const f of fs.readdirSync(INSTINCTS_DIR).filter(f => f.endsWith('.md'))) {
    const name = f.replace(/\.md$/, '');
    try {
      const content = fs.readFileSync(path.join(INSTINCTS_DIR, f), 'utf8');
      const titleMatch = content.match(/^# Instinct: (.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : name;
      results.push(`${name}: ${title}`);
    } catch { results.push(name); }
  }
  return results;
}

// Archive an instinct that has been superseded by a newer one
function archiveSupersededInstinct(name, supersededBy) {
  ensureDir(ARCHIVE_DIR);
  const src = path.join(INSTINCTS_DIR, `${name}.md`);
  const dst = path.join(ARCHIVE_DIR, `${name}.md`);
  if (!fs.existsSync(src)) return false;
  let content = fs.readFileSync(src, 'utf8');
  content += `\n\n---\n**Archived:** ${new Date().toISOString()}\n**Covered-by:** ${supersededBy} (supersede)\n`;
  fs.writeFileSync(dst, content);
  fs.unlinkSync(src);
  return true;
}

// Save memory suggestion to reports (non-invasive — user decides what to adopt)
function saveMemorySuggestion(entry) {
  ensureDir(REPORTS_DIR);
  const file = path.join(REPORTS_DIR, 'memory-suggestions.jsonl');
  const record = {
    ...entry,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
}

// Save research topic to reports
function saveResearchTopic(entry) {
  ensureDir(REPORTS_DIR);
  const file = path.join(REPORTS_DIR, 'research-queue.jsonl');
  const record = {
    ...entry,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
}

// Analyze observations.jsonl for tool patterns
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

  const toolCounts = {};
  for (const line of lines) {
    try {
      const obs = JSON.parse(line);
      const tool = obs.tool || 'unknown';
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    } catch {}
  }

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
    tool_counts: toolCounts,
    user_msg_count: lines.length  // approximate
  };
}

// Read goal tree names for goal_path tagging
function getGoalHint() {
  try {
    const archFile = path.join(BASE_DIR, 'architecture.yaml');
    if (fs.existsSync(archFile)) {
      const content = fs.readFileSync(archFile, 'utf8');
      const goals = [...content.matchAll(/^    (\w+):\s*$/gm)]
        .map(m => m[1])
        .filter(g => !['goals', 'metrics', 'agents', 'health_check', 'test_config'].includes(g));
      return goals.length > 0 ? goals.join(', ') : '';
    }
  } catch {}
  return '';
}

// Extract instincts + memory + research using Claude CLI
function extractFromSession(analysis) {
  const toolSummary = analysis.frequent_tools
    .map(([tool, count]) => `${tool}: ${count} times`)
    .join(', ');

  const goalHint = getGoalHint();
  const existingWithTitles = getExistingInstinctsWithTitles();

  const prompt = `Analyze this Claude Code session and extract reusable behavioral patterns.

## Session Stats
- Observations: ${analysis.total_observations}
- Frequent tools: ${toolSummary}
${goalHint ? `\n## Goal Tree (for goal_path)\n${goalHint}` : ''}

## Existing Instincts (avoid duplicates)
${existingWithTitles.length > 0 ? existingWithTitles.join('\n') : '(none yet)'}

## Write Gate (must pass at least one to record)
An observation must meet at least one criterion to become an instinct:
- **Changes future behavior**: Would this pattern make future sessions different?
- **Commitment**: User explicitly stated a preference ("always use CLI not MCP")
- **Decision rationale**: Why A not B (key reasoning worth preserving)
- **Stable fact**: System knowledge unlikely to change
- **Explicit instruction**: User said "remember this" or "always do this"

Observations that fail all criteria → no instinct (output empty line).

## Implementation Mechanisms (for suggested_mechanism)
hook (deterministic, every time) | rule (path-scoped guidance) | skill (reusable knowledge with eval) | script (periodic automation) | agent (isolated context specialist) | system (infrastructure)

## Output Format

### A. Instincts (behavioral patterns)
Find 1-2 reusable patterns (confidence > 0.7, must pass Write Gate):
{"type": "instinct", "name": "kebab-case-name", "confidence": 0.8, "title": "Pattern title", "content": "Full instinct description", "suggested_mechanism": "hook|rule|skill|script|agent|system", "goal_path": "top_goal.sub_goal or unrooted", "supersedes": []}

- supersedes: if this new pattern semantically replaces an existing instinct, list its name. Leave [] if unsure.

### B. Memory Suggestions (important context to preserve)
Check if the session contains information worth long-term storage (not instincts, but facts):
- User preferences or corrections
- Project decisions or direction changes
- External resources discovered
- User background updates

{"type": "memory", "category": "user|feedback|project|reference", "title": "Short title", "content": "Content to save"}

### C. Research Topics (mentioned but not explored)
Check for topics the user mentioned but didn't dive into:
- Questions deferred ("look into this later")
- Tools/tech mentioned but not explored

{"type": "research", "topic": "Topic name", "context": "Why this is interesting", "goal_path": "goal path or unrooted"}

### Rules
- One JSON per line, must include "type" field
- No instinct if Write Gate fails, no memory if nothing worth saving, no research if nothing deferred
- Output ONLY JSON lines or empty lines, no other text`;

  try {
    const env = { ...process.env };
    delete env.CLAUDECODE;  // Prevent recursive session
    const model = process.env.HOMUNCULUS_HARVEST_MODEL || 'claude-sonnet-4-6';
    const result = execSync(
      `claude --print --model ${model} --max-turns 1 --no-session-persistence`,
      {
        input: prompt,
        encoding: 'utf8',
        timeout: 120000,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();

    return result;
  } catch (err) {
    log(`Extraction failed: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

// Process extraction result — parse JSON lines and route to appropriate handlers
function processResult(result, { existing, todayCount, dynamicLimit }) {
  if (!result) return { instincts: 0, memory: 0, research: 0 };

  const stats = { instincts: 0, memory: 0, research: 0 };

  for (const line of result.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('{')) continue;

    let entry;
    try { entry = JSON.parse(trimmed); } catch { continue; }

    switch (entry.type) {
      case 'instinct': {
        if (todayCount + stats.instincts >= dynamicLimit) break;
        if (!entry.name || !entry.content || (entry.confidence || 0) < 0.7) break;

        const name = entry.name.replace(/[^a-z0-9-]/g, '-');
        if (existing.includes(name)) {
          log(`  Skip duplicate: ${name}`);
          break;
        }

        // Handle supersedes
        const supersedes = Array.isArray(entry.supersedes) ? entry.supersedes : [];
        for (const oldName of supersedes) {
          if (archiveSupersededInstinct(oldName, name)) {
            log(`  Superseded: ${oldName} → archived (replaced by ${name})`);
          }
        }

        // Write instinct file
        const mechanism = entry.suggested_mechanism || 'skill';
        const goalPath = entry.goal_path || 'unrooted';
        const supersedesNote = supersedes.length > 0 ? `\n**Supersedes:** ${supersedes.join(', ')}` : '';
        const content = `# Instinct: ${entry.title || name}

**Confidence:** ${entry.confidence}
**Source:** auto-learn (evaluate-session)
**Extracted:** ${new Date().toISOString()}
**Suggested mechanism:** ${mechanism}
**Goal path:** ${goalPath}${supersedesNote}

${entry.content}
`;
        ensureDir(INSTINCTS_DIR);
        fs.writeFileSync(path.join(INSTINCTS_DIR, `${name}.md`), content);
        stats.instincts++;
        log(`  Extracted instinct: ${name} (confidence: ${entry.confidence})`);
        break;
      }

      case 'memory': {
        if (entry.title && entry.content && entry.category) {
          saveMemorySuggestion(entry);
          stats.memory++;
          log(`  Memory suggestion: [${entry.category}] ${entry.title}`);
        }
        break;
      }

      case 'research': {
        if (entry.topic) {
          saveResearchTopic(entry);
          stats.research++;
          log(`  Research topic: ${entry.topic}`);
        }
        break;
      }
    }
  }

  return stats;
}

// Main
function main() {
  // Idempotency: check scan state to avoid reprocessing
  try {
    if (fs.existsSync(SCAN_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(SCAN_STATE_FILE, 'utf8'));
      const obsModified = fs.existsSync(OBS_FILE) ? fs.statSync(OBS_FILE).mtimeMs : 0;
      if (state.last_obs_mtime && obsModified <= state.last_obs_mtime) {
        log('Observations unchanged since last evaluation, skipping');
        return;
      }
    }
  } catch {}

  // Daily cooldown check
  const cooldown = getCooldown();
  const today = getDateString();
  const todayCount = cooldown.date === today ? cooldown.count : 0;
  if (todayCount >= CONFIG.hard_cap) {
    log(`Hard cap reached (${todayCount}/${CONFIG.hard_cap}), skipping`);
    return;
  }

  const analysis = analyzeObservations();
  if (!analysis) return;

  // Apply dynamic daily limit
  const dynamicLimit = getDailyLimit(analysis.user_msg_count);
  if (todayCount >= dynamicLimit) {
    log(`Dynamic limit reached (${todayCount}/${dynamicLimit}), skipping`);
    return;
  }

  const existing = getExistingInstincts();

  log(`Analyzing: ${analysis.total_observations} observations, ${analysis.frequent_tools.length} patterns (limit: ${dynamicLimit})`);

  const result = extractFromSession(analysis);
  const stats = processResult(result, { existing, todayCount, dynamicLimit });

  if (stats.instincts > 0) {
    updateCooldown(todayCount + stats.instincts);
  }

  // Update scan state
  try {
    const obsModified = fs.existsSync(OBS_FILE) ? fs.statSync(OBS_FILE).mtimeMs : 0;
    const tmp = SCAN_STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({
      last_scan_time: new Date().toISOString(),
      last_obs_mtime: obsModified,
      last_stats: stats
    }, null, 2) + '\n');
    fs.renameSync(tmp, SCAN_STATE_FILE);
  } catch {}

  log(`Done: ${stats.instincts} instincts, ${stats.memory} memory suggestions, ${stats.research} research topics`);
}

main();
