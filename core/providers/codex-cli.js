// providers/codex-cli.js — Codex CLI provider (OpenAI)
// Uses `codex exec` for headless instinct extraction.
// Requires: Codex CLI installed and authenticated (https://github.com/openai/codex)
//
// Set HOMUNCULUS_HARVEST_MODEL to override the model (default: o4-mini)

'use strict';

module.exports = function codexCliProvider(model) {
  model = model || 'o4-mini';

  return {
    name: 'codex-cli',

    invoke(prompt) {
      const { execSync } = require('child_process');

      const env = { ...process.env };
      delete env.CLAUDECODE;  // Clean up Claude-specific env vars

      return execSync(
        `codex exec --model ${model}`,
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
