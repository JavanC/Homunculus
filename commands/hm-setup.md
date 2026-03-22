# /hm-setup — Set Up Your Goal Tree

Guide the user through defining their goals and generate `architecture.yaml`.

**Always communicate in English** regardless of user's global Claude settings.

## Behavior

You are helping the user set up Homunculus — a self-evolving AI assistant. Your job is to understand their project and goals, then generate a goal tree.

**CRITICAL: Ask ONE question at a time. Wait for the answer before asking the next. Never batch multiple questions in one message.**

### Step 1: Ask about the project (ONE question)

Start with:
> "What kind of project is this? (e.g., web app, CLI tool, API, personal project)"

Wait for answer.

### Step 2: Ask about pain points (ONE question)

Based on their answer, ask:
> "What do you spend the most time on that you wish was better? (e.g., debugging, testing, deployment, keeping up with updates)"

Wait for answer.

### Step 3: Ask about priorities (ONE question)

Based on their answer, ask ONE more targeted question. Examples:
- "If your AI assistant could fix one thing overnight, what would it be?"
- "What breaks most often in your workflow?"

Adapt this question based on what they already told you. Wait for answer.

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

Your system is ready to evolve. Use Claude Code normally —
patterns will be auto-extracted. Run /hm-night anytime to
trigger an evolution cycle.
```

## Rules

- **ONE question per message. Never ask two questions at once.**
- Keep the whole setup under 5 back-and-forth messages
- Generate PRACTICAL goals, not abstract ones
- Don't overwhelm — 3-5 top-level goals is ideal
- Goals can always be refined later with `/hm-setup` again
