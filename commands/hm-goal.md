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

### Step 0: Scan existing project (automatic, no user input needed)

Before asking any questions, silently scan the project to understand what already exists.

**What to scan:**

| Signal | How to detect |
|--------|---------------|
| Tech stack | `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json` |
| Test framework | `jest.config.*`, `vitest.config.*`, `pytest.ini`, `setup.cfg [tool:pytest]`, `*_test.go`, `.rspec` |
| Test count | Count test files: `**/*.test.*`, `**/*.spec.*`, `**/test_*.py`, `**/*_test.go` |
| CI/CD | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/` |
| Linting | `.eslintrc*`, `.prettierrc*`, `ruff.toml`, `.golangci.yml` |
| Docs | `docs/`, `README.md`, `*.mdx` in obvious doc directories |
| Existing Claude config | `.claude/`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules` |
| Top-level structure | `ls -1` the project root (directories only) |

**Output:** Build an internal `project_context` object (don't show raw scan results to user). Example:

```
project_context:
  name: "my-app" (from package.json name or directory name)
  stack: "Next.js 14 + TypeScript"
  test_framework: "Jest (42 test files found)"
  ci: "GitHub Actions (3 workflows)"
  linting: "ESLint + Prettier"
  existing_claude: ".claude/ directory with 2 rules"
  directories: [src/, tests/, docs/, scripts/, .github/]
```

If nothing is detected (empty directory, no config files), set `project_context: null` and skip to Step 1 with the original generic questions.

### Step 1: Ask about the project (ONE question)

**If project_context exists**, incorporate the scan results naturally:

> "I see a **Next.js + TypeScript** project with **42 Jest tests** and **GitHub Actions CI**. What's the main purpose of this project? (e.g., SaaS product, internal tool, side project)"

**If project_context is null** (empty project), fall back to:

> "What kind of project is this? (e.g., web app, CLI tool, API, personal project)"

Wait for answer.

### Step 2: Ask about pain points (ONE question)

Based on their answer AND project_context, ask a targeted question. Examples:

- (If tests detected): "You have 42 tests already. Is test coverage a pain point, or is something else slowing you down more?"
- (If no CI detected): "I notice there's no CI setup. Is deployment/integration a challenge, or are you focused on something else?"
- (Generic): "What do you spend the most time on that you wish was better?"

Wait for answer.

### Step 3: Ask about priorities (ONE question)

Based on their answers, ask ONE more targeted question. Examples:
- "If your AI assistant could fix one thing overnight, what would it be?"
- "What breaks most often in your workflow?"

Adapt based on what they already told you. Wait for answer.

### Step 4: Propose goals

Based on ALL their answers AND project_context, propose 3-5 goals with sub-goals.

**Key difference: pre-fill `realized_by` with detected existing files/systems.**

```
Based on what you told me and what I found in your project:

🎯 my-app
├── code_quality — Ship fewer bugs
│   ├── testing — Maintain and expand test coverage
│   │   └── realized_by: jest.config.js, tests/ (42 tests) ✓
│   └── linting — Consistent code style
│       └── realized_by: .eslintrc.js, .prettierrc ✓
├── deployment — Reliable releases
│   └── ci_pipeline — Automated checks on every PR
│       └── realized_by: .github/workflows/ (3 workflows) ✓
├── productivity — Move faster
│   └── debugging — Find root causes faster
│       └── realized_by: # will evolve ○
└── knowledge — Stay current
    └── dependency_updates — Track security and version updates
        └── realized_by: # will evolve ○

5 goals: 3 already have implementations (✓), 2 will evolve (○)

Does this look right? Want to add, remove, or change anything?
```

Wait for confirmation or changes.

### Step 5: Generate architecture.yaml

Once confirmed, generate `architecture.yaml` with:
- `purpose` for every goal
- `metrics` where measurable (use reasonable defaults)
- `health_check` where possible (use detected tools: `npm test`, `pytest`, etc.)
- `realized_by` pre-filled with detected files/systems where applicable
- `realized_by: # will evolve` only for goals with no existing implementation

Write the file using the Write tool.

### Step 6: Confirm

```
✅ architecture.yaml created with N goals!
M goals already have implementations from your existing project.
K goals will evolve as the system learns from your sessions.

Run /hm-night to start your first evolution cycle.
Goals can always be refined by running /hm-goal again.
```

## Rules

- **ONE question per message in Create Mode. Never ask two questions at once.**
- Keep the whole setup under 5 back-and-forth messages
- Generate PRACTICAL goals, not abstract ones
- Don't overwhelm — 3-5 top-level goals is ideal
- In Show Mode, show realized_by status (✓ = file exists, ○ = not yet)
- Goals can always be refined by running `/hm-goal` again
- **Step 0 scan is silent** — don't dump raw file lists on the user, weave findings into natural questions
- **Pre-fill realized_by** from scan results — the user should see their existing work acknowledged
- **Fallback gracefully** — if scan finds nothing, the flow is identical to before
