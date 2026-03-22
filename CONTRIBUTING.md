# Contributing to Homunculus

Thanks for your interest in contributing! Here's how you can help.

## Ways to Contribute

### Share Your Evolution
The most valuable contribution: **show us what your system evolved into.** Open a Discussion in the "Show & Tell" category with:
- How long you've been running Homunculus
- What goals you defined
- What the system generated (instincts, skills, agents)
- Anything surprising

### Report Issues
Found a bug? Open an issue with:
- What you expected
- What happened
- Steps to reproduce
- Your environment (OS, Node version, Claude Code version)

### Improve Documentation
- Fix typos or unclear explanations
- Add examples from your experience
- Translate to other languages

### Contribute Code
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test with `npx homunculus init` in a fresh directory
5. Open a PR

## Development

```bash
git clone https://github.com/JavanC/Homunculus.git
cd Homunculus

# Test the init wizard
mkdir /tmp/test-project && cd /tmp/test-project
node ~/Homunculus/bin/init.js

# Test with --yes flag (non-interactive)
node ~/Homunculus/bin/init.js --yes
```

## Code Style

- Plain JavaScript (no TypeScript, no build step)
- Node.js 18+ features OK
- Shell scripts: `#!/usr/bin/env bash` + `set -euo pipefail`
- Keep it simple — this is a seed, not a framework

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
