# /hm-goal — View or Define Your Goal Tree

If `architecture.yaml` exists, display the current goal tree and ask if changes are needed.
If it doesn't exist, guide the user through creating one.

**Always communicate in English** regardless of user's global Claude settings.

## Behavior

### Mode Detection

Check if `architecture.yaml` exists in the project root.

- **Exists** → Show Mode
- **Doesn't exist** → Create Mode

---

## Show Mode (architecture.yaml exists)

### Step 1: Read and display

Read `architecture.yaml` and present the goal tree visually:

```
🎯 Your Goal Tree
├── code_quality — Ship fewer bugs
│   ├── testing — Every change has tests
│   │   └── realized_by: skills/tdd-workflow.md ✓
│   └── review — Catch issues before merge
│       └── realized_by: # will evolve ○
├── productivity — Move faster
│   └── debugging — Find root causes faster
│       └── realized_by: agents/debugger.md ✓
└── knowledge — Stay current
    └── tool_updates — Track useful updates
        └── realized_by: # will evolve ○

3 goals / 5 sub-goals
2 implemented (✓) / 3 waiting to evolve (○)
```

### Step 2: Ask

> "Want to add, remove, or change any goals?"

- If yes → make the changes, update `architecture.yaml`
- If no → done

---

## Create Mode (no architecture.yaml)

**CRITICAL: Ask ONE question at a time. Wait for the answer before asking the next. Never batch multiple questions in one message.**

### Step 1: Ask about the project (ONE question)

> "What kind of project is this? (e.g., web app, CLI tool, API, personal project)"

Wait for answer.

### Step 2: Ask about pain points (ONE question)

Based on their answer:
> "What do you spend the most time on that you wish was better? (e.g., debugging, testing, deployment, keeping up with updates)"

Wait for answer.

### Step 3: Ask about priorities (ONE question)

Based on their answer, ask ONE more targeted question. Examples:
- "If your AI assistant could fix one thing overnight, what would it be?"
- "What breaks most often in your workflow?"

Adapt based on what they already told you. Wait for answer.

### Step 4: Propose goals

Based on ALL their answers, propose 3-5 goals with sub-goals:

```
Based on what you told me, here's your goal tree:

🎯 [Project Name]
├── code_quality — Ship fewer bugs
│   ├── testing — Every change has tests
│   └── review — Catch issues before merge
├── productivity — Move faster
│   └── debugging — Find root causes faster
└── knowledge — Stay current
    └── tool_updates — Track useful updates

Does this look right? Want to add, remove, or change anything?
```

Wait for confirmation or changes.

### Step 5: Generate architecture.yaml

Once confirmed, generate `architecture.yaml` with:
- `purpose` for every goal
- `metrics` where measurable (use reasonable defaults)
- `health_check` where possible (use the project's actual tech stack: `npm test`, `pytest`, `go test`, etc.)
- `realized_by: # will evolve` for all implementations

Write the file using the Write tool.

### Step 6: Confirm

```
✅ architecture.yaml created with N goals!
```

### Step 7: Offer nightly agent setup (ONE question)

> "Want to set up the nightly agent? It runs `/hm-night` automatically while you sleep — evolving your system overnight."
>
> "Options: **yes** (I'll configure it now) / **no** (I'll run /hm-night manually)"

If yes:

1. Create `scripts/heartbeat.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   cd "$(dirname "$0")/.."
   unset CLAUDECODE
   claude -p "/hm-night" --model claude-sonnet-4-6 --max-budget-usd 1.00
   ```
2. `chmod +x scripts/heartbeat.sh`
3. Detect OS and configure scheduler:
   - **macOS** → create launchd plist at `~/Library/LaunchAgents/com.homunculus.heartbeat.plist` (runs at 2am, with PATH including `~/.local/bin:/opt/homebrew/bin`), then `launchctl load` it
   - **Linux** → add cron entry `0 2 * * * cd /path/to/project && bash scripts/heartbeat.sh`
4. Report:
   ```
   ✅ Nightly agent configured! It will run at 2:00 AM daily.

   Your system is ready. Use /hm-night to run a cycle now,
   or let the nightly agent handle it while you sleep.
   ```

If no:
```
No problem! Run /hm-night anytime to evolve manually.
```

## Rules

- **ONE question per message in Create Mode. Never ask two questions at once.**
- Keep the whole setup under 5 back-and-forth messages
- Generate PRACTICAL goals, not abstract ones
- Don't overwhelm — 3-5 top-level goals is ideal
- In Show Mode, show realized_by status (✓ = file exists, ○ = not yet)
- Goals can always be refined by running `/hm-goal` again
