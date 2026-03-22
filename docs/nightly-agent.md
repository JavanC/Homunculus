# Nightly Agent Setup

The nightly agent is what makes Homunculus truly autonomous. It runs a heartbeat loop while you sleep — checking goal health, evolving skills, researching improvements, and running experiments.

## Prerequisites

- Homunculus initialized in your project (`npx homunculus init`)
- Claude Code CLI installed (`~/.local/bin/claude`)
- macOS (launchd) or Linux (cron)

## How It Works

The nightly agent is a shell script that runs on a schedule. Each "tick" of the heartbeat:

1. **Health Check** — Scans `architecture.yaml`, runs each goal's `health_check.command`
2. **Evolve** — Runs `/evolve --auto` to converge instincts → skills → eval → improve
3. **Research** — Uses Claude to scan for better implementations of unhealthy goals
4. **Experiment** — Generates hypotheses, runs experiments in git worktrees
5. **Report** — Produces a morning report summarizing all changes

## Setup (macOS — launchd)

### 1. Create the heartbeat script

```bash
#!/usr/bin/env bash
# heartbeat.sh — Nightly evolution agent
set -euo pipefail

cd /path/to/your/project
LOG="heartbeat-$(date +%Y%m%d).log"

echo "[$(date)] Starting nightly evolution..." >> "$LOG"

# Unset CLAUDECODE to avoid nested session conflicts
unset CLAUDECODE

# Run evolution pipeline
claude -p "Run /evolve --auto. Then check goal health in architecture.yaml. \
Research any unhealthy goals. Generate a morning report." \
  --model claude-sonnet-4-6 \
  --max-budget-usd 2.00 \
  --no-session-persistence \
  >> "$LOG" 2>&1

echo "[$(date)] Nightly evolution complete." >> "$LOG"
```

### 2. Create the launchd plist

Save to `~/Library/LaunchAgents/com.homunculus.heartbeat.plist`:

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
        <string>/path/to/your/project/heartbeat.sh</string>
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

### 3. Load the agent

```bash
launchctl load ~/Library/LaunchAgents/com.homunculus.heartbeat.plist
```

## Setup (Linux — cron)

```bash
# Run at 2 AM every night
0 2 * * * cd /path/to/your/project && bash heartbeat.sh
```

> Note: cron does not have access to macOS Keychain. If your Claude CLI uses OAuth, use launchd instead.

## Budget Control

The `--max-budget-usd` flag controls how much the nightly agent can spend per run. Start with `$2.00` and adjust based on your needs.

## Morning Report

After a successful run, the agent produces a report. You can configure it to:
- Write to a file (`heartbeat/data/morning-report.md`)
- Send to Discord via webhook
- Push a desktop notification via `osascript`

## Monitoring

Check if the agent ran:
```bash
# Last run time
ls -la /tmp/homunculus-heartbeat.log

# Recent output
tail -50 /tmp/homunculus-heartbeat.log
```

## Advanced: Multi-Tick Heartbeat

The reference implementation uses a more sophisticated heartbeat with:
- **Priority-based task scheduling** (P0-P4)
- **Budget tracking** across ticks
- **Experiment queue** management
- **Cross-tick progress** for long-running tasks

See `examples/reference/` for the full implementation.
