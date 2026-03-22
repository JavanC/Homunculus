---
disable-model-invocation: true
---
# /improve-skill — Auto-Improve an Evolved Skill

Iteratively improve a skill until its eval passes, using an eval → improve loop.

## Flow

```
┌─── Round 1 ──────────────────────────┐
│  1. /eval-skill → baseline score      │
│  2. Analyze FAIL/PARTIAL/GAP          │
│  3. Modify skill file                 │
│  4. Bump version +0.1                 │
│  5. Re-eval                           │
│  6. Compare scores:                   │
│     ├─ Improved (≥5pp)  → next round  │
│     ├─ Noise (<5pp)     → stop        │
│     └─ Regressed (≤-5pp) → rollback   │
└──────────────────────────────────────┘
         ↓ (max 5 rounds)
```

## Steps

1. Verify target skill and eval spec exist
2. Run initial eval, record baseline score
3. **Improve loop** (max 5 rounds):
   a. Analyze failing scenarios
   b. Modify skill file:
      - FAIL → fix incorrect info or add missing rules
      - PARTIAL → add detail
      - GAP → add new section
   c. Increment version (1.1 → 1.2 → 1.3...)
   d. Re-eval
   e. Compare scores (apply noise tolerance: 5pp)
4. Output improvement report

## Regression Detection

If a previously passing scenario now fails:
- Mark as **REGRESSION**
- Must fix regression before continuing
- If unable to fix, rollback to previous version

## Notes
- Only modify the skill file, never the eval spec (tests stay fixed)
- All intermediate versions tracked via git
- Score delta < 5pp = statistical noise, not real improvement
