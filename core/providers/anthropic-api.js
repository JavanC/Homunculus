// providers/anthropic-api.js — Anthropic Messages API provider
// Calls api.anthropic.com directly — no CLI required, just an API key.
// Uses only Node.js built-ins (no npm dependencies).
//
// Required env vars:
//   ANTHROPIC_API_KEY   — your Anthropic API key
//
// Optional env vars:
//   HOMUNCULUS_HARVEST_MODEL — model ID (default: claude-sonnet-4-6)

'use strict';

module.exports = function anthropicApiProvider(model) {
  model = model || 'claude-sonnet-4-6';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'anthropic-api provider requires ANTHROPIC_API_KEY env var.\n' +
      'Get your key at https://console.anthropic.com/settings/keys'
    );
  }

  return {
    name: 'anthropic-api',

    invoke(prompt) {
      const { execSync } = require('child_process');

      // Run HTTP request in a child process to keep invoke() synchronous,
      // matching evaluate-session.js's synchronous control flow.
      const script = `
        'use strict';
        const https = require('https');
        const prompt = process.env._HOM_PROMPT;
        const data = JSON.stringify({
          model: '${model}',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        });
        const req = https.request({
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(data)
          }
        }, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const r = JSON.parse(body);
              if (r.error) {
                process.stderr.write('[anthropic-api] ' + (r.error.message || JSON.stringify(r.error)) + '\\n');
                process.exit(1);
              }
              const text = (r.content || []).map(c => c.text || '').join('');
              process.stdout.write(text);
            } catch (e) {
              process.stderr.write('[anthropic-api] Failed to parse response: ' + e.message + '\\n');
              process.exit(1);
            }
          });
        });
        req.on('error', e => {
          process.stderr.write('[anthropic-api] Request failed: ' + e.message + '\\n');
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
