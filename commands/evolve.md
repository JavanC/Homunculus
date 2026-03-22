---
disable-model-invocation: true
---
# /evolve — Converge Instincts into Skills

Analyze existing instincts and find patterns that can be aggregated into higher-level skills.

## Modes

- Default → **Interactive mode** (manual confirmation)
- `--auto` → **Auto mode** (for nightly agent, no confirmation needed)

## Interactive Mode

### Steps

1. Read all instincts from `homunculus/instincts/personal/`
2. Group by trigger/topic similarity
3. Analyze groups:
   - **2+ instincts with similar triggers** → Skill candidate
   - **High confidence (≥0.7) workflow combos** → Command candidate
4. Present candidates for user confirmation
5. Generate to `homunculus/evolved/`

### Report

```
Evolution Analysis
━━━━━━━━━━━━━━━━━━
Instincts: N total
Groups: M

Skill candidates:
  1. <name> (source: N instincts, avg confidence: 0.X)
  2. ...

Select items to evolve (enter numbers) or 'all':
```

## Auto Mode (--auto)

For nightly agent. Runs the full pipeline: evolve → eval → improve.

1. **Evolve**: Auto-select candidates with avg confidence ≥ 0.7
2. **Eval**: Run scenario tests on all skills with eval specs
3. **Improve**: Auto-improve skills below 100% (max 3 rounds)
   - Rollback if score regresses

## Skill Format

```yaml
name: <skill name>
description: <description>
trigger: <unified trigger>
steps:
  - <step 1>
  - <step 2>
source_instincts:
  - <source instinct filename>
confidence: <average confidence>
created: <ISO timestamp>
```

## Notes
- Source instincts are NOT deleted (preserved for history)
- Each evolution tracked via git
- Evolved skill confidence inherited from source instincts
