# /hm-night — Run One Evolution Cycle

Run the full evolution pipeline: health check → evolve → research → report.

**Always communicate in English** regardless of user's global Claude settings.

## Core Principle

**Goals are stable. Implementations are diverse.** When suggesting improvements, consider ALL implementation types — not just skills:

| Type | When to suggest |
|------|----------------|
| Skill | Behavioral knowledge Claude should follow |
| Agent | Task needs specialized model/tools/prompt |
| Hook | Should trigger automatically on events |
| Script | Automation that runs independently |
| Rule | Claude Code behavioral constraint |
| Command | Workflow the user triggers manually |
| Cron/LaunchAgent | Needs to run on a schedule |
| MCP | Needs external service integration |

Always pick the **right tool for the job**, not default to skills.

## Behavior

Run through all 5 phases systematically.

### Phase 1: Health Check

1. Read `architecture.yaml`
2. For each goal with a `health_check.command`, run it and report pass/fail
3. For goals without health checks, check if `realized_by` points to an existing file
4. Report:
   ```
   [1/5] Health Check
         code_quality:    ✅ healthy (tests passing)
         productivity:    ⚠️ no health check defined
         ai_news:         ○ not implemented yet
   ```

### Phase 2: Scan Evolved Assets

Check ALL evolved artifacts, not just skills:

1. **Instincts**: Count in `homunculus/instincts/personal/` and `archived/`
2. **Skills**: Count in `homunculus/evolved/skills/`, run evals if specs exist
3. **Agents**: Count in `homunculus/evolved/agents/`
4. **Scripts**: Check `scripts/` for automation
5. **Hooks**: Check `.claude/settings.json` for configured hooks
6. **Commands**: Check `.claude/commands/` for slash commands
7. **Rules**: Check `.claude/rules/` for behavioral rules

Report:
```
[2/5] Evolved Assets
      Instincts:  12 active / 5 archived
      Skills:     2 (all 100% eval)
      Agents:     1 (debugger)
      Hooks:      3 configured
      Commands:   6 available
      Rules:      2 active
```

If skills have eval specs, run `/eval-skill` and report pass rates.

### Phase 3: Research & Suggest

1. Scan `architecture.yaml` for goals where `realized_by` is empty or `# will evolve`
2. For each unimplemented goal, suggest the **most appropriate implementation type**:
   ```
   [3/5] Research
         Goals without implementation:

         ai_news → Suggestion: a SCRIPT that fetches from RSS/APIs
                   + a CRON job to run it daily
                   (not a skill — this needs to run independently)

         code_review → Suggestion: a HOOK on pre-commit
                       (not a skill — should be automated, not behavioral)

         debugging → Suggestion: an AGENT with specialized tools
                     (not a script — needs AI reasoning)
   ```

3. For goals with failing health checks, suggest fixes using the right implementation type

### Phase 4: Act (if possible)

If there are simple improvements that can be made right now:
- Prune outdated instincts (`node scripts/prune-instincts.js --apply`)
- Improve failing skills (`/improve-skill`)
- Create a suggested script or hook if straightforward

Report what was done.

### Phase 5: Report

Generate a summary report and save to `homunculus/reports/YYYY-MM-DD.md`:

```
[5/5] Evolution Report — 2026-03-22
┌──────────────────────────────────────────────┐
│  Goals:       5 (2 healthy, 1 new, 2 todo)   │
│  Assets:      2 skills, 1 agent, 3 hooks     │
│  Instincts:   12 active / 5 archived         │
│                                              │
│  Actions taken:                              │
│  - Pruned 2 outdated instincts               │
│  - Created scripts/fetch-news.sh             │
│                                              │
│  Suggestions:                                │
│  - code_review: add pre-commit hook          │
│  - debugging: create specialized agent       │
│  - Add health checks to 2 goals             │
└──────────────────────────────────────────────┘
```

## Rules

- **Don't default to skills for everything** — match implementation to the goal's nature
- Actually RUN health check commands (don't just read them)
- Actually RUN eval-skill if eval specs exist (don't skip)
- Save the report to `homunculus/reports/`
- Be concise — dashboard style, not essay
- If fresh system: suggest the FIRST concrete implementation to build (pick the easiest win)
