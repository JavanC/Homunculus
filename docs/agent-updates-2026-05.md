# Claude Code Agent Updates — May 2026

These Claude Code updates informed Homunculus v0.12.0.

## Relevant Claude Code Changes

- `claude agents --json`: scriptable inventory of live sessions.
- `/usage`: per-category usage reporting, including skills, subagents, plugins, and MCP servers.
- `/reload-skills`: refresh skills without restarting the session.
- `SessionStart` hook output: `reloadSkills` and `sessionTitle`.
- `Stop` and `SubagentStop` payloads: `background_tasks` and `session_crons`.
- `MessageDisplay` hook: transform or filter assistant messages before display.
- Dynamic Workflows: coordinate many background agents and inspect progress with `/workflows`.
- `disallowed-tools` frontmatter: hide tools from a skill or command when they should not be available.

## Homunculus Policy

Do not treat multi-agent orchestration as a default. It is useful for wide search,
large repositories, and independent workstreams, but it can consume quota quickly.

Recommended defaults:

- Pro: no background agent fan-out.
- Max 5x: one background agent at a time unless the user explicitly asks.
- Max 20x: bounded parallelism, usually up to three agents.

## Agent Model Lessons

Do not downgrade an agent model just because its success rate is high. A reviewer
or evaluator may need a stronger model because it protects quality metrics that
single-run success rate does not measure. In the reference system,
`forge-evaluator` stayed on Sonnet because it improved eval discrimination; a
blind downgrade would reintroduce the original failure mode.

## Adoption Targets

- Use `claude agents --json` in reports when available.
- Prefer `/reload-skills` or `SessionStart.reloadSkills` after installing skills.
- Use `disallowed-tools` to shrink tool surfaces for skills and commands.
- Report usage by category when `/usage` output is available.
