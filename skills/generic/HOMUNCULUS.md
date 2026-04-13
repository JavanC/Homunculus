# Homunculus — Self-Evolving AI Assistant

This project uses Homunculus for goal-driven, self-evolving AI assistance.

When the user asks about any of the following, read the corresponding workflow file and follow it:

| User says | Read and follow |
|-----------|----------------|
| "run evolution" / "nightly cycle" / "hm-night" | `homunculus/commands/hm-night.md` |
| "define goals" / "goal tree" / "hm-goal" | `homunculus/commands/hm-goal.md` |
| "system status" / "hm-status" | `homunculus/commands/hm-status.md` |
| "evolve skill" / "aggregate instincts" | `homunculus/commands/evolve.md` |
| "eval skill" / "test skill" | `homunculus/commands/eval-skill.md` |
| "improve skill" | `homunculus/commands/improve-skill.md` |

## Key Paths

- `architecture.yaml` — goal tree (read before making suggestions)
- `evolution-config.yaml` — tier/schedule/budget config
- `homunculus/instincts/personal/` — behavioral patterns extracted from sessions
- `homunculus/evolved/skills/` — tested, versioned knowledge
- `homunculus/observations.jsonl` — tool usage observations
- `homunculus/commands/` — detailed workflow instructions
