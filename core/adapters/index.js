// adapters/index.js — Host adapter factory
// Detects the AI coding harness (Claude Code / Cursor / Codex) and returns the right adapter.
//
// Usage:
//   const { detectHarness, getAdapter, normalizeToolName } = require('./adapters');
//   const harness = detectHarness();           // 'claude-code' | 'cursor' | 'codex'
//   const adapter = getAdapter(harness);       // adapter module
//   const toolName = normalizeToolName('run_terminal_cmd', harness); // 'Bash'
//
// Detection order (first match wins):
//   1. .cursor/  → cursor
//   2. codex.json → codex
//   3. .claude/  → claude-code (default / fallback)
//
// Override with HOMUNCULUS_HARNESS env var.

'use strict';

const fs = require('fs');
const path = require('path');

const ADAPTERS = {
  'claude-code': require('./claude-code'),
  'cursor':      require('./cursor'),
  'codex':       require('./codex'),
};

/**
 * Auto-detect the host harness from filesystem signals.
 * @param {string} [projectDir] — defaults to process.cwd()
 * @returns {'claude-code'|'cursor'|'codex'}
 */
function detectHarness(projectDir) {
  if (process.env.HOMUNCULUS_HARNESS) {
    const override = process.env.HOMUNCULUS_HARNESS;
    if (ADAPTERS[override]) return override;
    throw new Error(`Unknown harness override: ${override}. Supported: ${Object.keys(ADAPTERS).join(', ')}`);
  }

  const dir = projectDir || process.cwd();

  if (fs.existsSync(path.join(dir, '.cursor'))) return 'cursor';
  if (fs.existsSync(path.join(dir, 'codex.json'))) return 'codex';
  return 'claude-code';
}

/**
 * Returns the adapter for the given harness name.
 */
function getAdapter(harness) {
  if (!ADAPTERS[harness]) {
    throw new Error(`Unknown harness: ${harness}. Supported: ${Object.keys(ADAPTERS).join(', ')}`);
  }
  return ADAPTERS[harness];
}

/**
 * Normalize a host-specific tool name to the CC-canonical form.
 * Falls back to the original name if no mapping found.
 */
function normalizeToolName(toolName, harness) {
  if (!toolName) return 'unknown';
  harness = harness || detectHarness();
  const adapter = ADAPTERS[harness];
  if (!adapter || !adapter.TOOL_NAME_MAP) return toolName;
  return adapter.TOOL_NAME_MAP[toolName] || toolName;
}

/**
 * Install the evolution rule for the given harness.
 * @param {string} projectDir
 * @param {string} templatesDir — path to homunculus/templates/
 * @param {string} harness
 * @returns {{ installed: boolean, path: string }}
 */
function installRules(projectDir, templatesDir, harness) {
  harness = harness || detectHarness(projectDir);
  return getAdapter(harness).installRules(projectDir, templatesDir);
}

/**
 * Install the Homunculus skill for the given harness.
 * @param {string} projectDir
 * @param {string} skillsDir — path to homunculus/skills/
 * @param {string} harness
 * @returns {{ installed: boolean, path: string }}
 */
function installSkill(projectDir, skillsDir, harness) {
  harness = harness || detectHarness(projectDir);
  return getAdapter(harness).installSkill(projectDir, skillsDir);
}

module.exports = { detectHarness, getAdapter, normalizeToolName, installRules, installSkill };
