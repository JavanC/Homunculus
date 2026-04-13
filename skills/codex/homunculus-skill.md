---
name: homunculus
description: "Self-evolving AI assistant evolution commands and workflows"
---

# Homunculus Evolution Commands

When the user asks about evolution, goals, or system status, use this routing table:

| User says | Read and follow |
|-----------|----------------|
| "run evolution" / "nightly cycle" / "hm-night" / "evolve the system" | `homunculus/commands/hm-night.md` |
| "define goals" / "goal tree" / "hm-goal" / "set up architecture" | `homunculus/commands/hm-goal.md` |
| "system status" / "hm-status" / "show evolution status" | `homunculus/commands/hm-status.md` |
| "evolve skill" / "aggregate instincts" | `homunculus/commands/evolve.md` |
| "eval skill" / "test skill" | `homunculus/commands/eval-skill.md` |
| "improve skill" / "fix skill" | `homunculus/commands/improve-skill.md` |

## Key Paths

- `architecture.yaml` — goal tree
- `evolution-config.yaml` — tier/schedule/budget
- `homunculus/instincts/personal/` — behavioral patterns
- `homunculus/evolved/skills/` — tested knowledge
