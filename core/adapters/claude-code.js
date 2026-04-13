// adapters/claude-code.js — Claude Code host adapter
// Default adapter for projects using Claude Code (claude.ai/code)
//
// Detects: presence of .claude/ directory
// Hook format: .claude/settings.json with PostToolUse hooks
// Rules dir:   .claude/rules/
// Tool names:  native CC tool names (Read, Write, Edit, Bash, Glob, Grep, Skill, ...)

'use strict';

const fs = require('fs');
const path = require('path');

function configDir(projectDir) {
  return path.join(projectDir, '.claude');
}

function rulesDir(projectDir) {
  return path.join(projectDir, '.claude', 'rules');
}

function hooksConfig(projectDir, observeCommand) {
  return {
    settingsPath: path.join(projectDir, '.claude', 'settings.json'),
    hookEventKey: 'PostToolUse',
    hookEntry: {
      matcher: '',
      hooks: [{
        type: 'command',
        command: observeCommand
      }]
    },
    alreadyPresentCheck: (entries) =>
      entries.some(e =>
        Array.isArray(e.hooks) && e.hooks.some(h => h.command && h.command.includes('observe.sh'))
      )
  };
}

/**
 * Install evolution rule to .claude/rules/evolution-system.md
 * @param {string} projectDir
 * @param {string} templatesDir — path to homunculus/templates/
 */
function installRules(projectDir, templatesDir) {
  const rulesSrc = path.join(templatesDir, 'rules', 'evolution-system.md');
  const rulesDest = path.join(projectDir, '.claude', 'rules', 'evolution-system.md');
  if (!fs.existsSync(rulesDest) && fs.existsSync(rulesSrc)) {
    fs.mkdirSync(path.dirname(rulesDest), { recursive: true });
    fs.copyFileSync(rulesSrc, rulesDest);
    return { installed: true, path: rulesDest };
  }
  return { installed: false, path: rulesDest };
}

/**
 * Install Homunculus skill to .claude/commands/homunculus.md
 * CC users also get the full individual slash commands via init.js
 * @param {string} projectDir
 * @param {string} skillsDir — path to homunculus/skills/
 */
function installSkill(projectDir, skillsDir) {
  const skillSrc = path.join(skillsDir, 'claude', 'homunculus.md');
  const skillDest = path.join(projectDir, '.claude', 'commands', 'homunculus.md');
  if (!fs.existsSync(skillDest) && fs.existsSync(skillSrc)) {
    fs.mkdirSync(path.dirname(skillDest), { recursive: true });
    fs.copyFileSync(skillSrc, skillDest);
    return { installed: true, path: skillDest };
  }
  return { installed: false, path: skillDest };
}

const TOOL_NAME_MAP = {};

module.exports = { configDir, rulesDir, hooksConfig, installRules, installSkill, TOOL_NAME_MAP };
