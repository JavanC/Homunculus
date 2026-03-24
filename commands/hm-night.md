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

### Phase 2: Instinct Routing + Skill Evolution

**2a. Route instincts to the right mechanism:**

Read each instinct in `homunculus/instincts/personal/`. Check `suggested_mechanism` and `goal_path` in the frontmatter:

- `hook` → Implement as a hook (add to `.claude/settings.json`) → Archive instinct
- `rule` → Write a `.claude/rules/*.md` file → Archive instinct
- `skill` → Collect for skill aggregation (step 2b)
- `script` → Write script to `scripts/` → Archive instinct
- `agent` → Write agent to `homunculus/evolved/agents/` → Archive instinct
- No tag → Use the Implementation Routing table above to decide

**Archive** means move from `instincts/personal/` to `instincts/archived/` with a note:
```
---
_Archived: 2026-03-25 | Covered-by: hook:pre-commit.sh | Reason: implemented_
```

Not every instinct needs to be routed in one night. Focus on clear cases. Ambiguous ones can wait.

**2b. Skill aggregation + eval:**

- 5+ instincts with `suggested_mechanism: skill` covering the same area → aggregate into a skill
- Run `/eval-skill` on skills that have eval specs
- Run `/improve-skill` on any failing ones

Report:
```
[2/5] Instinct Routing
      Routed: 2 instincts (1→hook, 1→rule)
      Archived: 2 (implemented)
      Skills: 2 (all 100% eval)
      Remaining: 8 active instincts
```

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

## Permissions

The nightly agent can act autonomously within safe boundaries. Anything outside those boundaries becomes a **suggested action** in the report for the user to decide.

**Can do autonomously:**
- Extract and archive instincts
- Write new skills, eval specs, and run eval/improve
- Prune low-scoring instincts (`prune-instincts.js --apply`)
- Write simple scripts (non-destructive automation)
- Update `architecture.yaml` realized_by fields
- Generate reports

**Must suggest, not execute:**
- Add or modify hooks in `settings.json` (affects every session)
- Modify `CLAUDE.md` or `.claude/rules/` (core behavioral rules)
- Delete files or remove functionality
- Install packages or external dependencies
- Create scheduled jobs (launchd/cron)
- Anything that changes permissions or security boundaries

When the agent identifies an improvement it can't do autonomously, it writes a **suggested action** in the report:
```
Suggested actions:
- ⚒️ Add pre-commit hook for lint (needs settings.json change — user approval)
- ⚒️ Create launchd job for daily news script (needs scheduler setup)
```

The user reviews suggestions and decides which to adopt.

## Rules

- **Don't default to skills for everything** — match implementation to the goal's nature
- Actually RUN health check commands (don't just read them)
- Actually RUN eval-skill if eval specs exist (don't skip)
- Save the report to `homunculus/reports/`
- Be concise — dashboard style, not essay
- If fresh system: suggest the FIRST concrete implementation to build (pick the easiest win)
