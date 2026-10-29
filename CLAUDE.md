# Homunculus — Development Guide

## Two repos

- This checkout is the **private dev repo** (the maintainer's private repo, remote `origin`). Work and commit here.
- The public repo (`JavanC/Homunculus`) is updated only by `scripts/release-public.sh`, which copies
  allow-listed paths, runs the tests and a privacy scan, and commits in a separate checkout. Push it by hand
  after reviewing the diff.
- Private-only paths (never published): `purpose-tree.yaml`, `docs/plans/`, `docs/purpose-tree-project.md`,
  `private/`, `scripts/release-public.sh`.

## Release Checklist

### Skill changes (`skills/`) — the normal case

Users install skills from the public repo (`npx skills add JavanC/Homunculus`), so a pushed public commit
is the release. No version bump, no npm.

1. **Code changes** — fix it here, never only in an installed copy of a skill: a reinstall overwrites the
   installed copy and drops the fix.
2. **Tests** — `node --test skills/*/tests/*.test.cjs` green.
3. **Docs** — if behavior a user sees changed, update README.md and `docs/zh-TW/README.md`, `docs/zh-CN/README.md`,
   including a `### skills-YYYY-MM-DD` changelog entry (the release notes are read from it).
4. **Review** the diff since the last release (Codex first, else a fresh-context Claude agent) and settle every finding.
5. **git commit + push (dev)**, then `scripts/release-public.sh` (commits and tags `skills-YYYY-MM-DD`), review the
   diff, then run the two commands it prints: `git push --follow-tags` and `gh release create` (users watch Releases).
6. **Reinstall globally** — `npx -y skills add JavanC/Homunculus -g -y`; if the global skills folder is
   version-controlled, commit it together with its `.skill-lock.json`.

### Legacy npm CLI (`bin/`, `core/`, `commands/`, `templates/`) — frozen

Only for a fix to existing CLI users. After steps 1–5 above: bump `package.json` (semver), `npm publish`
from repo root, `gh release create vX.Y.Z` with release notes.

## Project Structure

- `skills/` — purpose-tree, purpose-sync, purpose-review; each has `SKILL.md`, `scripts/*.cjs`, `tests/`
- `bin/` — legacy CLI entry points (init, upgrade, night)
- `core/` — legacy evolution scripts copied to user projects during init
- `commands/` — legacy slash commands copied to `.claude/commands/` during init
- `templates/` — legacy CLAUDE.md, architecture.yaml, rules templates for init
- `docs/` — Long-form documentation
- `examples/reference/` — Real-world reference implementation from the author's system

## Key Design Decisions

- **Zero dependencies** — Only Node.js stdlib + Claude CLI
- **Skill scripts are `.cjs`** — installed skills run inside host projects, some of which are ESM

Legacy CLI only:
- **File copy, not symlink** — init copies files so users can customize freely
- **Manifest-based upgrade** — `.manifest.json` tracks SHA256 hashes for diff-aware upgrades
- **Never touch user content** — upgrade never modifies CLAUDE.md, architecture.yaml, instincts, skills
