// providers/index.js — LLM Provider Factory for Homunculus
//
// Interface: provider.invoke(prompt: string) → string
//
// Env vars:
//   HOMUNCULUS_HARVEST_PROVIDER  — provider name (default: claude-cli)
//   HOMUNCULUS_HARVEST_MODEL     — model override (provider-specific default if unset)
//
// Supported providers:
//   claude-cli    — claude --print (default, requires Claude CLI login)
//   codex-cli     — codex exec (requires Codex CLI login)
//   anthropic-api — Anthropic Messages API (requires ANTHROPIC_API_KEY)
//   openai-api    — OpenAI Chat Completions (requires OPENAI_API_KEY; supports OPENAI_BASE_URL for Ollama/vLLM)

'use strict';

function createProvider() {
  const name = process.env.HOMUNCULUS_HARVEST_PROVIDER || 'claude-cli';
  const model = process.env.HOMUNCULUS_HARVEST_MODEL || undefined;

  switch (name) {
    case 'claude-cli':    return require('./claude-cli')(model);
    case 'codex-cli':     return require('./codex-cli')(model);
    case 'anthropic-api': return require('./anthropic-api')(model);
    case 'openai-api':    return require('./openai-api')(model);
    default:
      throw new Error(
        `Unknown HOMUNCULUS_HARVEST_PROVIDER: "${name}". ` +
        'Supported: claude-cli, codex-cli, anthropic-api, openai-api'
      );
  }
}

module.exports = { createProvider };
