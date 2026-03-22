# /hm-setup — Set Up Your Goal Tree

Guide the user through defining their goals and generate `architecture.yaml`.

**Always communicate in English** regardless of user's global Claude settings.

## Behavior

You are helping the user set up Homunculus — a self-evolving AI assistant. Your job is to understand their project and goals, then generate a goal tree.

### Step 1: Understand the Project

Ask the user (conversationally, not a form):
- What is this project? (e.g., SaaS app, CLI tool, personal project)
- What do they spend most time on? (e.g., debugging, writing tests, deploying)
- What frustrates them? (e.g., regressions, slow CI, repetitive tasks)
- What would they improve if they had infinite time?

Keep it natural — 2-3 questions max, adapt based on answers.

### Step 2: Propose Goals

Based on their answers, propose 3-5 goals with sub-goals. Present them clearly:

```
Based on what you told me, here's your goal tree:

🎯 [Project Name]
├── code_quality — Ship fewer bugs
│   ├── testing — Every change has tests
│   └── review — Catch issues before merge
├── productivity — Move faster
│   ├── automation — Automate repetitive work
│   └── debugging — Find root causes faster
└── knowledge — Stay up to date
    └── tool_updates — Track useful updates
```

Ask: "Does this look right? Want to add, remove, or change anything?"

### Step 3: Generate architecture.yaml

Once confirmed, generate `architecture.yaml` with:
- `purpose` for every goal
- `metrics` where measurable (use reasonable defaults)
- `health_check` where possible (shell commands that exit 0 = healthy)
- `realized_by: # will evolve` for all implementations (the system will fill these in)

Write the file using the Write tool.

### Step 4: Confirm

```
✅ architecture.yaml created with N goals!

Your system is ready to evolve. Use Claude Code normally —
patterns will be auto-extracted. Run /hm-night anytime to
trigger an evolution cycle.
```

## Important

- Keep the conversation SHORT (under 5 back-and-forth)
- Generate PRACTICAL goals, not abstract ones
- Use the project's actual tech stack for health checks (e.g., `npm test`, `pytest`, `go test`)
- Don't overwhelm — 3-5 top-level goals is ideal for a start
- Goals can always be refined later
