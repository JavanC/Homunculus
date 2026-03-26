# Nightly Agent

The nightly agent runs `/hm-night` autonomously while you sleep — routing instincts to the right mechanism, evaluating implementations, reviewing goal health, researching improvements, and running experiments.

## Quick Setup

The easiest way: run `/hm-night` in Claude Code. The first time it runs, it asks if you want to enable automatic nightly runs. Say yes, and it configures the scheduler for you.

If `/hm-night` detects an existing scheduler setup, it skips the question.

## Evolution Tiers

Control nightly evolution depth via `evolution-config.yaml` (created during `init`):

| | Minimal | Standard | Full |
|---|---------|----------|------|
| Instinct harvest + routing | ✅ | ✅ | ✅ |
| Skill eval (changed only) | ✅ | ✅ | ✅ |
| Research | — | 2 topics | 3-5 topics |
| Experiments | — | 1/night | 3/night |
| TDD backfill | — | — | ✅ |
| Bonus loop | — | — | Optional |
| Budget (API) | ~$1/night | ~$5/night | ~$15/night |

**Weekly deep mode** (configurable day, default Sunday): full skill re-eval, goal tree mechanism review, deep health check. Runs on top of the daily tier.

```bash
# Change tier
# Edit evolution-config.yaml → tier: minimal | standard | full
```

## What It Does

Each night, the agent runs a phase pipeline (phases skipped based on tier):

| Phase | What happens |
|-------|-------------|
| **P0** | Complete assigned high-priority tasks |
| **P1** | Evolution cycle — route instincts to 8 mechanisms (hook/rule/skill/script/agent/...), eval + improve skills, review workflow/subagent health, check all mechanisms working, review goal implementations |
| **P2** | Research — scan tech news, changelogs, community (with cross-night dedup) |
| **P3** | Experiments — generate hypotheses from weak goals, test in isolated worktrees |
| **P4** | Sync — update CLAUDE.md, architecture.yaml, memory |
| **Bonus** | Extra P2/P3 rounds if budget allows |

## Manual Setup

If you prefer manual configuration instead of the auto-setup:

### macOS (launchd)

Create `~/Library/LaunchAgents/com.homunculus.heartbeat.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.homunculus.heartbeat</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/your/project/scripts/heartbeat.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:~/.local/bin:/opt/homebrew/bin</string>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/homunculus-heartbeat.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/homunculus-heartbeat.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.homunculus.heartbeat.plist
```

### Linux (cron)

```bash
0 2 * * * cd /path/to/your/project && bash scripts/heartbeat.sh
```

> macOS note: cron cannot access Keychain. If your Claude CLI uses OAuth, use launchd.

## Permissions

The nightly agent operates within safe boundaries. Changes that affect core behavior require your approval.

**Autonomous** (agent does these directly):
- Extract and archive instincts
- Write/improve skills and eval specs
- Prune low-scoring instincts
- Write simple scripts
- Update `architecture.yaml` realized_by
- Generate reports

**Suggested actions** (agent proposes, you decide):
- Modify hooks, rules, or CLAUDE.md
- Delete files or remove functionality
- Create scheduled jobs
- Install dependencies

The morning report includes a **Suggested actions** section for anything the agent couldn't do autonomously. Review and adopt what makes sense.

## Morning Report

After each run, the agent produces a structured report with:
- Session summary (phases completed, cost, duration)
- System evolution (instinct routing, skill evals)
- Research topics (with source URLs and goal relevance tags)
- Experiments (hypothesis, result, merged or discarded)
- Suggested actions (things that need your approval)

Configure delivery via Discord webhook, file output, or desktop notification.

## Monitoring

```bash
# Check last run
tail -50 /tmp/homunculus-heartbeat.log

# Check goal health
/hm-status
```

## Advanced

The reference implementation uses a multi-tick heartbeat with budget tracking, cross-tick progress for long tasks, and a circuit breaker that stops the pipeline after consecutive failures. See `examples/reference/` for the full setup.
