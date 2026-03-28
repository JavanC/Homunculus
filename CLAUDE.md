# Homunculus — Development Guide

## Release Checklist

Every change to this repo must complete these steps in order:

1. **Code changes** — implement the feature/fix
2. **README.md** — update What's New section + any affected docs
3. **package.json** — bump version (semver: patch/minor/major)
4. **git commit + push** — descriptive commit message
5. **npm publish** — `npm publish` from repo root
6. **GitHub release** — `gh release create vX.Y.Z` with release notes
7. **assistant plan.md** — sync `~/assistant/projects/homunculus/plan.md` if applicable

## Project Structure

- `bin/` — CLI entry points (init, upgrade, night)
- `core/` — Evolution scripts copied to user projects during init
- `commands/` — Slash commands copied to `.claude/commands/` during init
- `templates/` — CLAUDE.md, architecture.yaml, rules templates for init
- `docs/` — Long-form documentation
- `examples/reference/` — Real-world reference implementation from the author's system

## Key Design Decisions

- **Zero dependencies** — Only Node.js stdlib + Claude CLI
- **File copy, not symlink** — init copies files so users can customize freely
- **Manifest-based upgrade** — `.manifest.json` tracks SHA256 hashes for diff-aware upgrades
- **Never touch user content** — upgrade never modifies CLAUDE.md, architecture.yaml, instincts, skills
