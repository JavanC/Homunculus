# /hm-status — Evolution Status Dashboard

Show the current state of the Homunculus evolution system.

**Always communicate in English** regardless of user's global Claude settings.

## Behavior

Gather and display all evolution metrics in a compact dashboard.

### Data to Collect

1. **Goal Tree**: Read `architecture.yaml`, count goals and sub-goals
2. **Instincts**: Count files in `homunculus/instincts/personal/` and `archived/`
3. **Skills**: Count files in `homunculus/evolved/skills/`, note versions
4. **Agents**: Count files in `homunculus/evolved/agents/`
5. **Eval Specs**: Count files in `homunculus/evolved/evals/`
6. **Observations**: Count lines in `homunculus/observations.jsonl`
7. **Experiments**: Count files in `homunculus/experiments/`
8. **Reports**: List recent reports in `homunculus/reports/`

### Output Format

```
🧬 Homunculus Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Goal Tree:     5 goals / 12 sub-goals
Instincts:     24 active / 8 archived
Skills:        3 evolved (all 100% eval)
Agents:        1 specialized
Observations:  1,247 recorded
Experiments:   2 completed / 1 queued

Recent Skills:
  ✓ tdd-workflow v1.2 — 100% (11 scenarios)
  ✓ debugging-patterns v1.1 — 100% (8 scenarios)
  ✓ shell-automation v1.0 — 100% (6 scenarios)

Last Evolution: 2026-03-22
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important

- Use actual file counts, not hardcoded numbers
- Keep output compact — one screen max
- If the system is fresh, show zeros and next steps
- Don't run any evaluations — just report current state
