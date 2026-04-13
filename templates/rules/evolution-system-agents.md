# Homunculus — Self-Evolving AI Assistant

This project uses Homunculus for goal-driven, self-evolving AI assistance.

## What Homunculus Does

Homunculus observes how you work, extracts behavioral patterns (instincts), converges them into tested knowledge (skills), and validates quality via eval discrimination. It runs an evolution cycle to continuously improve.

## Evolution Artifacts (all in `homunculus/evolved/`)

| Artifact | Location | Purpose |
|----------|----------|---------|
| **Skills** | `evolved/skills/` | Tested behavioral knowledge (100% eval pass rate) |
| **Agents** | `evolved/agents/` | Specialized subagents for repetitive tasks |
| **Evals** | `evolved/evals/` | Scenario tests for each skill |

## Evolution Triggers

When the user asks any of the following, follow the corresponding workflow:

| User says | Read and follow |
|-----------|----------------|
| "run evolution" / "nightly cycle" / "hm-night" / "evolve the system" | `homunculus/commands/hm-night.md` |
| "define goals" / "goal tree" / "hm-goal" / "set up architecture" | `homunculus/commands/hm-goal.md` |
| "system status" / "hm-status" / "show evolution status" | `homunculus/commands/hm-status.md` |
| "evolve skill" / "aggregate instincts" / "run evolve" | `homunculus/commands/evolve.md` |
| "eval skill" / "test skill" / "run eval" | `homunculus/commands/eval-skill.md` |
| "improve skill" / "fix skill" | `homunculus/commands/improve-skill.md` |

## Always

- Read `architecture.yaml` to understand project goals before making suggestions
- Instincts are in `homunculus/instincts/personal/` — behavioral patterns extracted from sessions
- Evolved skills are in `homunculus/evolved/skills/` — load as context when relevant
- Evolution config is in `evolution-config.yaml` — tier (minimal/standard/full) controls depth

## Key Paths

- `architecture.yaml` — goal tree (stable goals, evolving implementations)
- `evolution-config.yaml` — tier/schedule/budget config
- `homunculus/instincts/personal/` — auto-extracted behavioral patterns
- `homunculus/evolved/skills/` — tested, versioned knowledge
- `homunculus/observations.jsonl` — tool usage data
- `homunculus/commands/` — detailed workflow instructions for each command
