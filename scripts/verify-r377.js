#!/usr/bin/env node
// verify-r377.js — Verification script for r377 AC checks
'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const HOM_DIR    = path.join(__dirname, '..');
const ADAPTERS   = require(path.join(HOM_DIR, 'core/adapters'));
const TEMPLATES  = path.join(HOM_DIR, 'templates');
const SKILLS_DIR = path.join(HOM_DIR, 'skills');

const check = process.argv[2];

function ok(msg)   { console.log('✅', msg); process.exit(0); }
function fail(msg) { console.error('❌', msg); process.exit(1); }

switch (check) {
  case 'cc-rules': {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-cc-'));
    fs.mkdirSync(path.join(tmp, '.claude', 'rules'), { recursive: true });
    ADAPTERS.getAdapter('claude-code').installRules(tmp, TEMPLATES);
    const target = path.join(tmp, '.claude', 'rules', 'evolution-system.md');
    if (fs.existsSync(target)) ok('CC installRules → .claude/rules/evolution-system.md');
    else fail('evolution-system.md not found in .claude/rules/');
    break;
  }

  case 'cursor-rules': {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-cur-'));
    fs.mkdirSync(path.join(tmp, '.cursor', 'rules'), { recursive: true });
    ADAPTERS.getAdapter('cursor').installRules(tmp, TEMPLATES);
    const target = path.join(tmp, '.cursor', 'rules', 'evolution-system.mdc');
    if (fs.existsSync(target)) ok('Cursor installRules → .cursor/rules/evolution-system.mdc');
    else fail('evolution-system.mdc not found in .cursor/rules/');
    break;
  }

  case 'stop-hooks': {
    const errors = [];
    for (const harness of ['cursor', 'codex']) {
      const cfg     = ADAPTERS.getAdapter(harness).hooksConfig('/tmp/fake-proj', 'node observe.sh');
      const hasStop = cfg.extraHookEntries &&
                      cfg.extraHookEntries.some(e => e.event === 'stop');
      if (!hasStop) errors.push(`${harness}: missing stop event`);
    }
    if (errors.length === 0) ok('cursor + codex hooksConfig() include stop event');
    else fail(errors.join(', '));
    break;
  }

  case 'cli-commands': {
    const { execSync } = require('child_process');
    const CLI = path.join(HOM_DIR, 'bin/cli.js');
    try {
      const goal   = execSync(`node "${CLI}" goal 2>&1`).toString();
      const status = execSync(`node "${CLI}" status 2>&1`).toString();
      if (!status.includes('Homunculus Status'))
        return fail(`status output missing "Homunculus Status": ${status.slice(0, 100)}`);
      ok('CLI goal and status subcommands execute correctly');
    } catch (e) {
      fail(`CLI error: ${e.message}`);
    }
    break;
  }

  default:
    console.error('Usage: verify-r377.js <cc-rules|cursor-rules|stop-hooks|cli-commands>');
    process.exit(1);
}
