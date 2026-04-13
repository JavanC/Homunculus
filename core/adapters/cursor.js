// adapters/cursor.js — Cursor IDE host adapter
// For projects using Cursor (cursor.sh)
//
// Detects: presence of .cursor/ directory
// Hook format: .cursor/hooks.json with afterFileEdit / afterShellExecution / stop events
// Rules dir:   .cursor/rules/ (.mdc files)
// Tool names:  Cursor uses different names — mapped to CC-canonical names

'use strict';

const fs = require('fs');
const path = require('path');

function configDir(projectDir) {
  return path.join(projectDir, '.cursor');
}

function rulesDir(projectDir) {
  return path.join(projectDir, '.cursor', 'rules');
}

/**
 * Returns hook config for Cursor's .cursor/hooks.json format.
 * Includes stop event for session-end instinct extraction.
 */
function hooksConfig(projectDir, observeCommand) {
  return {
    settingsPath: path.join(projectDir, '.cursor', 'hooks.json'),
    hookEventKey: null,  // top-level array
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
 * Install evolution rule to .cursor/rules/evolution-system.mdc
 * Uses alwaysApply: true — loaded every session for persistent goal awareness.
 */
function installRules(projectDir, templatesDir) {
  const ruleSrc = path.join(templatesDir, 'rules', 'evolution-system.mdc');
  const ruleDest = path.join(projectDir, '.cursor', 'rules', 'evolution-system.mdc');
  if (!fs.existsSync(ruleDest) && fs.existsSync(ruleSrc)) {
    fs.mkdirSync(path.dirname(ruleDest), { recursive: true });
    fs.copyFileSync(ruleSrc, ruleDest);
    return { installed: true, path: ruleDest };
  }
  return { installed: false, path: ruleDest };
}

/**
 * Install Homunculus skill to .cursor/rules/homunculus.mdc
 * Uses alwaysApply: false — triggered by description match when user asks about evolution.
 */
function installSkill(projectDir, skillsDir) {
  const skillSrc = path.join(skillsDir, 'cursor', 'homunculus.mdc');
  const skillDest = path.join(projectDir, '.cursor', 'rules', 'homunculus.mdc');
  if (!fs.existsSync(skillDest) && fs.existsSync(skillSrc)) {
    fs.mkdirSync(path.dirname(skillDest), { recursive: true });
    fs.copyFileSync(skillSrc, skillDest);
    return { installed: true, path: skillDest };
  }
  return { installed: false, path: skillDest };
}

/**
 * Cursor tool name → CC-canonical tool name mapping.
 */
const TOOL_NAME_MAP = {
  'afterFileEdit':        'Edit',
  'file_edit':            'Edit',
  'edit_file':            'Edit',
  'create_file':          'Write',
  'delete_file':          'Bash',
  'afterShellExecution':  'Bash',
  'run_terminal_cmd':     'Bash',
  'execute_command':      'Bash',
  'shell_execution':      'Bash',
  'read_file':            'Read',
  'search_files':         'Grep',
  'find_files':           'Glob',
  'apply_edit':           'Edit',
};

module.exports = { configDir, rulesDir, hooksConfig, installRules, installSkill, TOOL_NAME_MAP };
