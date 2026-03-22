# /hm-night — Run One Evolution Cycle

Run the full evolution pipeline: health check → instincts → skills → research → report.

## Behavior

You are the Homunculus nightly evolution agent. Run through all 5 phases systematically.

### Phase 1: Health Check

1. Read `architecture.yaml`
2. For each goal with a `health_check.command`, run it and report pass/fail
3. For goals without health checks, check if `realized_by` points to an existing file
4. Report:
   ```
   [1/5] Health Check
         code_quality:    ✅ healthy (tests passing)
         productivity:    ⚠️ no health check defined
         knowledge:       ✅ healthy
   ```

### Phase 2: Scan Instincts

1. Count files in `homunculus/instincts/personal/` and `homunculus/instincts/archived/`
2. If instincts exist, check for pruning candidates (run `node scripts/prune-instincts.js` if it exists)
3. Report count and any archival suggestions
   ```
   [2/5] Instincts
         12 active / 5 archived
         △ 2 candidates for archival (low confidence)
   ```

### Phase 3: Eval Skills

1. List files in `homunculus/evolved/skills/`
2. For each skill, check if an eval spec exists in `homunculus/evolved/evals/`
3. If eval specs exist, run `/eval-skill` on each
4. Report pass rates
   ```
   [3/5] Skills
         ✓ tdd-workflow: 100% (8/8 scenarios)
         △ debugging-patterns: 85% (6/7) — needs improvement
   ```

### Phase 4: Research

1. Check Claude Code version
2. Scan `architecture.yaml` for goals with no `realized_by` — these are opportunities
3. Look for goals with failing health checks — these need attention
4. Suggest improvements:
   ```
   [4/5] Research
         ✓ Claude Code v2.1.81
         △ 2 goals have no implementation yet
         → Suggestion: code_quality.review could use a pre-commit hook
   ```

### Phase 5: Report

Generate a summary report and save to `homunculus/reports/YYYY-MM-DD.md`:

```
[5/5] Evolution Report — 2026-03-22
┌──────────────────────────────────────────┐
│  Goals:      5 (3 healthy, 2 need work)  │
│  Instincts:  12 active / 5 archived      │
│  Skills:     3 (2 at 100%, 1 at 85%)     │
│                                          │
│  Actions taken:                          │
│  - Pruned 2 outdated instincts           │
│  - Improved debugging-patterns to v1.2   │
│                                          │
│  Suggestions:                            │
│  - Add health check to productivity goal │
│  - Review could use a pre-commit hook    │
└──────────────────────────────────────────┘
```

## Important

- Actually RUN health check commands (don't just read them)
- Actually RUN eval-skill if eval specs exist (don't skip)
- If a skill fails eval, attempt `/improve-skill` (max 2 rounds)
- Save the report to `homunculus/reports/`
- Be concise — this should feel like a progress dashboard, not an essay
- If the system is fresh (no instincts/skills), give encouraging guidance
