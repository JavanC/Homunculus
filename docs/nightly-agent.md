# Nightly Agent

The nightly agent runs `/hm-night` autonomously while you sleep — routing instincts to the right mechanism, evaluating implementations, reviewing goal health, researching improvements, and running experiments.

## Quick Setup

The easiest way: run `/hm-goal` in Claude Code. After defining your goals, it asks if you want to enable the nightly agent. Say yes, and it configures the scheduler for you.

You can also run `/hm-night` manually anytime.

## What It Does

Each night, the agent runs a phase pipeline:

| Phase | What happens |
|-------|-------------|
| **P0** | Complete assigned high-priority tasks |
| **P1** | Evolution cycle — route instincts to 8 mechanisms (hook/rule/skill/script/agent/...), eval + improve skills, review workflow/subagent health, check all mechanisms working, review goal implementations |
| **P2** | Research — scan tech news, changelogs, community (with cross-night dedup) |
| **P3** | Experiments — generate hypotheses from weak goals, test in isolated worktrees |
| **P4** | Sync — update CLAUDE.md, architecture.yaml, memory |
| **Bonus** | Extra P2/P3 rounds if budget allows |

## Manual Setup

If `/hm-goal` didn't set it up, or you prefer manual configuration:

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

## Morning Report

After each run, the agent produces a structured report with:
- Session summary (phases completed, cost, duration)
- System evolution (instinct routing, skill evals, mechanism reviews)
- Research topics (with source URLs and goal relevance tags)
- Experiments (hypothesis, result, merged or discarded)
- Suggested actions (prioritized, with forge cost estimates)

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
