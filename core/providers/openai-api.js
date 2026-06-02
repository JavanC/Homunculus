// providers/openai-api.js — OpenAI Chat Completions provider
// Calls the OpenAI API (or any OpenAI-compatible endpoint).
// Uses only Node.js built-ins (no npm dependencies).
//
// Required env vars:
//   OPENAI_API_KEY    — your OpenAI API key
//
// Optional env vars:
//   OPENAI_BASE_URL         — base URL (default: https://api.openai.com)
//                             Set to http://localhost:11434 for Ollama,
//                             or https://openrouter.ai/api for OpenRouter
//   HOMUNCULUS_HARVEST_MODEL — model ID (default: gpt-4o)

'use strict';

module.exports = function openaiApiProvider(model) {
  model = model || 'gpt-4o';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'openai-api provider requires OPENAI_API_KEY env var.\n' +
      'Get your key at https://platform.openai.com/api-keys\n' +
      'For Ollama: set OPENAI_API_KEY=ollama and OPENAI_BASE_URL=http://localhost:11434'
    );
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');

  return {
    name: 'openai-api',

    invoke(prompt) {
      const { execSync } = require('child_process');
      const { URL } = require('url');

      const endpoint = new URL('/v1/chat/completions', baseUrl);
      const isHttps = endpoint.protocol === 'https:';
      const port = endpoint.port ? parseInt(endpoint.port) : (isHttps ? 443 : 80);

      const script = `
        'use strict';
        const mod = require('${isHttps ? 'https' : 'http'}');
        const prompt = process.env._HOM_PROMPT;
        const data = JSON.stringify({
          model: '${model}',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        });
        const req = mod.request({
          hostname: '${endpoint.hostname}',
          port: ${port},
          path: '${endpoint.pathname}',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
            'Content-Length': Buffer.byteLength(data)
          }
        }, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const r = JSON.parse(body);
              if (r.error) {
                process.stderr.write('[openai-api] ' + (r.error.message || JSON.stringify(r.error)) + '\\n');
                process.exit(1);
              }
              const text = r.choices && r.choices[0] && r.choices[0].message
                ? r.choices[0].message.content || ''
                : '';
              process.stdout.write(text);
            } catch (e) {
              process.stderr.write('[openai-api] Failed to parse response: ' + e.message + '\\n');
              process.exit(1);
            }
          });
        });
        req.on('error', e => {
          process.stderr.write('[openai-api] Request failed: ' + e.message + '\\n');
          process.exit(1);
        });
        req.write(data);
        req.end();
      `;

      const env = { ...process.env, _HOM_PROMPT: prompt };
      return execSync(`node -e ${JSON.stringify(script)}`, {
        encoding: 'utf8',
        timeout: 120000,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    }
  };
};
