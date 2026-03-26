---
disable-model-invocation: true
---
# /evolve — Route Instincts to Implementations

Analyze instincts and route each to the best implementation mechanism. Not everything becomes a skill.

## Modes

- Default → **Interactive mode** (manual confirmation)
- `--auto` → **Auto mode** (for nightly agent, no confirmation needed)

## How It Works

### Step 1: Route instincts with `suggested_mechanism`

Read all instincts from `homunculus/instincts/personal/`. For each instinct that has `suggested_mechanism` in its frontmatter:

| suggested_mechanism | Action |
|---|---|
| `hook` | Implement as hook (add to `.claude/settings.json`) → archive instinct |
| `rule` | Write `.claude/rules/*.md` → archive instinct |
| `script` | Write to `scripts/` → archive instinct |
| `agent` | Write to `homunculus/evolved/agents/` → archive instinct |
| `skill` | Collect for skill aggregation (Step 2) |

**Archive** = move from `instincts/personal/` to `instincts/archived/` with note:
```yaml
_Archived: 2026-03-26 | Covered-by: hook:pre-commit.sh | Reason: implemented
```

### Step 2: Aggregate remaining instincts into skills

For instincts without `suggested_mechanism`, or with `suggested_mechanism: skill`:

1. Group by trigger/topic similarity
2. **2+ instincts with similar triggers** → Skill candidate
3. High confidence (≥0.7) candidates auto-selected in `--auto` mode
4. Generate skill to `homunculus/evolved/skills/`

### Step 3: No tag? Use the Implementation Routing table

If an instinct has no `suggested_mechanism`, decide based on its nature:

- Deterministic, every time? → **Hook**
- Tied to specific files/paths? → **Rule**
- Reusable knowledge collection? → **Skill**
- Periodic automation? → **Script + scheduler**
- Needs isolated AI context? → **Agent**

## Interactive Mode

Present routing decisions for user confirmation:

```
Evolution Analysis
━━━━━━━━━━━━━━━━━━
Instincts: 12 total

Routing decisions:
  1. pre-commit-lint (confidence: 0.85) → hook (deterministic)
  2. error-log-patterns (confidence: 0.72) → rule (path-scoped)
  3. tdd-before-commit + test-first-workflow → skill (aggregate)

Select items to evolve (enter numbers) or 'all':
```

## Auto Mode (--auto)

For nightly agent. Runs the full pipeline:

1. **Route**: Apply routing decisions for instincts with confidence ≥ 0.7
2. **Aggregate**: Merge similar instincts into skills
3. **Eval**: Run scenario tests on skills with eval specs
4. **Improve**: Auto-improve skills below 100% (max 3 rounds, rollback on regression)

## Skill Format (agentskills.io compatible)

Every skill file MUST start with YAML frontmatter:

```markdown
---
name: <kebab-case-name>
description: <what it does + when to use it, ≤1024 chars>
allowed-tools: <space-delimited tool list, e.g. Read Grep Glob Bash>
compatibility: Designed for Claude Code
metadata:
  author: homunculus
  version: "<version>"
---

# Skill: <Display Name>

**Version:** <version>
**Evolved from:** <source instincts>

## Purpose
<description>

## Steps
1. ...
2. ...
```

### `name` rules (agentskills.io)
- 1-64 chars, lowercase a-z, digits, hyphens only
- Cannot start or end with hyphen
- No consecutive hyphens (`--`)

### `allowed-tools` guide
- Read-only skill → `Read Grep Glob`
- Diagnostic skill → `Read Grep Glob Bash`
- Modifying skill → `Read Grep Glob Bash Write Edit`
- Multi-agent skill → add `Agent`

## Notes
- Archived instincts preserved in `instincts/archived/` (not deleted)
- Each evolution tracked via git commit
- Instincts without clear routing can wait — no rush to route everything in one pass
