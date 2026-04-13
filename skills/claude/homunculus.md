---
name: homunculus
description: "Self-evolving AI assistant system. Triggers when user asks about evolution cycles, goal trees, system status, instincts, skills, or nightly automation. Also relevant when working with homunculus/ directory, architecture.yaml, or evolution-config.yaml."
allowed-tools: Bash(node:*), Read, Write, Edit, Glob, Grep
---

# Homunculus — Self-Evolving AI Assistant

## When to use

Use this skill when the user asks about:
- Running an evolution cycle ("run evolution", "hm-night", "nightly cycle")
- Defining or viewing project goals ("define goals", "goal tree", "hm-goal")
- Checking system status ("hm-status", "show status", "how many instincts")
- Evolving, evaluating, or improving skills
- Understanding how the Homunculus evolution system works

## Commands

| Trigger | Detailed workflow |
|---------|------------------|
| "run evolution" / "hm-night" | Read and follow `homunculus/commands/hm-night.md` |
| "define goals" / "hm-goal" | Read and follow `homunculus/commands/hm-goal.md` |
| "system status" / "hm-status" | Read and follow `homunculus/commands/hm-status.md` |
| "evolve skill" / "/evolve" | Read and follow `homunculus/commands/evolve.md` |
| "eval skill" | Read and follow `homunculus/commands/eval-skill.md` |
| "improve skill" | Read and follow `homunculus/commands/improve-skill.md` |

## Key Paths

- `architecture.yaml` — goal tree
- `evolution-config.yaml` — tier/schedule/budget
- `homunculus/instincts/personal/` — behavioral patterns
- `homunculus/evolved/skills/` — tested knowledge
- `homunculus/observations.jsonl` — tool usage data
