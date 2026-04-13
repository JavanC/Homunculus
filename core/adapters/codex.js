// adapters/codex.js — OpenAI Codex CLI host adapter
// For projects using OpenAI Codex CLI (github.com/openai/codex)
//
// Detects: presence of codex.json in project root
// Hook format: codex.json hooks section
// Rules dir:   .codex/
// Skill/Rule:  both injected into AGENTS.md (Codex has one instruction mechanism)

'use strict';

const fs = require('fs');
const path = require('path');

function configDir(projectDir) {
  return path.join(projectDir, '.codex');
}

function rulesDir(projectDir) {
  return path.join(projectDir, '.codex');
}

/**
 * Returns hook config for Codex CLI's codex.json hooks section.
 * Includes stop event for session-end instinct extraction.
 */
function hooksConfig(projectDir, observeCommand) {
  return {
    settingsPath: path.join(projectDir, 'codex.json'),
    hookEventKey: 'hooks',
    hookEntry: {
      event: 'afterFileEdit',
      command: observeCommand
    },
    extraHookEntries: [
      {
        event: 'afterShellExecution',
        command: observeCommand
      },
      {
        // Session end — triggers instinct extraction (equivalent to CC SessionEnd hook)
        event: 'stop',
        command: 'node homunculus/scripts/evaluate-session.js'
      }
    ],
    alreadyPresentCheck: (entries) =>
      Array.isArray(entries) && entries.some(e => e.command && e.command.includes('observe.sh'))
  };
}

/**
 * Install evolution rule by injecting into AGENTS.md.
 * Codex has one instruction mechanism — AGENTS.md is always loaded.
 */
function installRules(projectDir, templatesDir) {
  const agentsSrc = path.join(templatesDir, 'rules', 'evolution-system-agents.md');
  const agentsDest = path.join(projectDir, 'AGENTS.md');

  if (!fs.existsSync(agentsSrc)) return { installed: false, path: agentsDest };

  const section = fs.readFileSync(agentsSrc, 'utf8');

  if (fs.existsSync(agentsDest)) {
    const existing = fs.readFileSync(agentsDest, 'utf8');
    if (existing.includes('Homunculus')) {
      return { installed: false, path: agentsDest };
    }
    fs.appendFileSync(agentsDest, '\n---\n\n' + section);
  } else {
    fs.writeFileSync(agentsDest, section);
  }
  return { installed: true, path: agentsDest };
}

/**
 * Install Homunculus skill to .codex/homunculus-skill.md
 * Also copies the generic skill as a reference.
 */
function installSkill(projectDir, skillsDir) {
  const skillSrc = path.join(skillsDir, 'codex', 'homunculus-skill.md');
  const skillDest = path.join(projectDir, '.codex', 'homunculus-skill.md');

  if (!fs.existsSync(skillDest) && fs.existsSync(skillSrc)) {
    fs.mkdirSync(path.dirname(skillDest), { recursive: true });
    fs.copyFileSync(skillSrc, skillDest);
    return { installed: true, path: skillDest };
  }
  return { installed: false, path: skillDest };
}

/**
 * Codex CLI tool name → CC-canonical tool name mapping.
 */
const TOOL_NAME_MAP = {
  'write_file':           'Write',
  'edit_file':            'Edit',
  'read_file':            'Read',
  'delete_file':          'Bash',
  'shell':                'Bash',
  'run_command':          'Bash',
  'execute':              'Bash',
  'search':               'Grep',
  'find':                 'Glob',
  'afterFileEdit':        'Edit',
  'afterShellExecution':  'Bash',
};

module.exports = { configDir, rulesDir, hooksConfig, installRules, installSkill, TOOL_NAME_MAP };
