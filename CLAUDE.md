# Homunculus — Development Guide

## Two repos

- This checkout is the **private dev repo** (the maintainer's private repo, remote `origin`). Work and commit here.
- The public repo (`JavanC/Homunculus`) is updated only by `scripts/release-public.sh`, which copies
  allow-listed paths, runs the tests and a privacy scan, and commits in a separate checkout. Push it by hand
  after reviewing the diff.
- Private-only paths (never published): `purpose-tree.yaml`, `docs/plans/`, `docs/purpose-tree-project.md`,
  `private/`, `scripts/release-public.sh`.

## Release Checklist

Every public release must complete these steps in order:

1. **Code changes** — implement the feature/fix
2. **README.md** — update What's New section + any affected docs
3. **i18n sync** — update `docs/zh-TW/README.md` and `docs/zh-CN/README.md` to match
4. **package.json** — bump version (semver: patch/minor/major)
5. **git commit + push (dev)**, then `scripts/release-public.sh`, review the diff, push the public checkout
6. **npm publish** — `npm publish` from repo root
7. **GitHub release** — `gh release create vX.Y.Z` with release notes
8. **assistant plan.md** — sync `~/assistant/projects/homunculus/plan.md` if applicable

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
