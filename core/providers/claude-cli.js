// providers/claude-cli.js — Claude CLI provider
// Uses `claude --print` for instinct extraction.
// Requires: Claude CLI installed and authenticated (claude.ai or Anthropic Console)

'use strict';

module.exports = function claudeCliProvider(model) {
  model = model || 'claude-sonnet-4-6';

  return {
    name: 'claude-cli',

    invoke(prompt) {
      const { execSync } = require('child_process');

      const env = { ...process.env };
      delete env.CLAUDECODE;  // Prevent recursive Claude Code session

      return execSync(
        `claude --print --model ${model} --max-turns 1 --no-session-persistence`,
        {
          input: prompt,
          encoding: 'utf8',
          timeout: 120000,
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      ).trim();
    }
  };
};
