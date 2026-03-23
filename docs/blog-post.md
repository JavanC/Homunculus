---
title: Stop Tuning Your AI. Let It Tune Itself.
published: false
description: How a goal tree replaced hundreds of hours of manual AI configuration.
tags: ai, claudecode, opensource, productivity
cover_image: https://github.com/user-attachments/assets/b3ce6017-02de-44a4-a3c6-8d45765c1693
canonical_url: https://github.com/JavanC/Homunculus
---

# Stop Tuning Your AI. Let It Tune Itself.

You're a Claude Code power user. Or an OpenClaw user. You've built rules, hooks, agents, skills. Your setup is dialed in.

Until Monday. Someone tweets a new prompting technique. You spend your evening rewriting rules. Wednesday, Claude Code ships a version with features you missed. Another evening gone. Friday, a better agent config shows up on Reddit. You refactor again.

Two weeks pass. Half your changes are outdated.

**You're on the AI configuration treadmill.** The tools move so fast that mastering one approach takes longer than three better ones take to appear. Your productive hours go toward keeping your AI productive. Not toward your actual work.

And breaking things is part of the deal. OpenClaw users know this: edit `SOUL.md`, update `AGENTS.md`, tweak `HEARTBEAT.md`, and your assistant stops responding. Now you open a second AI session to debug the first one. A recursive trap.

---

## The Org Chart Illusion

A popular pattern right now: model your AI like a company. PM agent, engineer agent, QA agent, reviewer agent. Give them titles and responsibilities. Let them delegate to each other.

Demos look great. But consider the mechanics:

- Agents spend tokens **talking to each other** about doing work, instead of doing the work.
- You're applying **human organizational structures** to AI. Companies need org charts because people have limited bandwidth, require specialization, and can't share context instantly. AI has none of these limits.
- The "CEO agent" orchestrating everything is a **prompt router burning 10x the tokens**.
- Output looks busy. Results aren't proportionally better than a single well-configured agent.

We invented org charts because human brains are bottlenecked. AI brains are not. Forcing our constraints onto AI is the wrong abstraction.

A better approach: start with a single agent. Let the system observe where it struggles. When a task keeps failing or burns too many tokens in the main thread, the system creates a specialized subagent for that specific job. Agents appear because the system needs them, not because you drew an org chart on day one.

---

## The Building Blocks Exist. The Spine Doesn't.

The community is moving toward AI autonomy. And the progress is remarkable. Look at what appeared in just the past few months:

- [OpenClaw](https://github.com/openclaw/openclaw) showed that AI can **extend its own capabilities** without human prompting. 300K+ stars in weeks. An AI that writes its own tools.
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) built a system that **extracts behavioral patterns** from your usage and persists them across sessions. Your AI remembers how you work. Anthropic Hackathon winner.
- [Karpathy's autoresearch](https://x.com/karpathy) proved AI can **run 118 experiment iterations** over 12 hours, improving results with zero human input. Autonomous scientific research.

These projects are all brilliant. And they're all pointing in the same direction: **AI should improve itself, not wait for humans to improve it.**

But they're disconnected pieces. OpenClaw extends capabilities and can't tell whether the extensions made things better. Pattern extraction captures behaviors and can't rank which ones matter. Autoresearch runs experiments and has no system telling it which experiments to run next.

Each one is a powerful limb. None of them have a spine.

The missing piece is a structure that connects these capabilities, gives them direction, and answers: where are we heading? Which parts work? Which parts need attention?

That structure is a goal tree.

---

## Goal Trees: Tell AI Where, Not How

[Homunculus](https://github.com/JavanC/Homunculus) replaces manual configuration with a goal tree. You define outcomes. The system builds its own path there.

```
                  🎯 My AI Assistant
            ┌───────────┼───────────┐
            │           │           │
     AI Intelligence   Self-    Productivity
      ┌─────┴─────┐  Improvement    │
      │           │   ┌──┴──┐       │
 News Curation  Morning  Skill  Quality  Automation
                Briefing Evolution
```

Each node says **what** you want. Not how.

```yaml
# architecture.yaml
ai_intelligence:
  purpose: "Stay ahead on AI developments"
  goals:
    news_curation:
      purpose: "Auto-fetch top AI news daily"
      realized_by: # will evolve              ← system fills this in
    morning_briefing:
      purpose: "Deliver a concise report every morning"
      realized_by: # will evolve

self_improvement:
  purpose: "Get smarter over time"
  goals:
    skill_evolution:
      purpose: "Learn new skills from usage patterns"
      realized_by: # will evolve
    quality:
      purpose: "Verify improvements work"
      realized_by: # will evolve
```

The `realized_by` field accepts **any implementation type**:

| Implementation | Example | Best for |
|---------------|---------|----------|
| Script | `scripts/fetch-news.sh` | Standalone automation |
| Cron / LaunchAgent | `com.app.daily-briefing.plist` | Scheduled tasks |
| Skill | `skills/tdd-workflow.md` | Behavioral knowledge |
| Agent | `agents/code-reviewer.md` | Tasks needing specialized AI |
| Hook | `hooks/pre-commit.sh` | Event-triggered automation |
| Rule | `rules/security.md` | Behavioral constraints |
| MCP Server | `mcp-servers/github` | External service integration |

**Goals stay. Implementations rotate.** The same goal evolves through different solutions:

```
Goal: "Catch bugs before merge"

  Day 1:   (nothing, an aspiration)
  Day 5:   instinct — "remember to run tests"
  Day 12:  skills/tdd-workflow.md — tested, versioned knowledge
  Day 20:  hooks/pre-commit.sh — runs without thinking about it
  Day 30:  agents/code-reviewer.md — AI-powered review
```

The system restructures, replaces, and upgrades implementations whenever it finds something better. A skill from last week becomes a hook this week and an agent next week. The goal tree doesn't track how things get done. It tracks whether they're done.

---

## Three Inputs, One Engine

Set up Homunculus, use Claude Code normally, and three processes run in the background:

### 1. Observation

A hook watches your tool usage. Repeated behaviors, like running tests before commits or searching the same error patterns, become **instincts**: confidence-scored behavioral patterns. Confidence grows with reinforcement. It decays without use (90-day half-life). The system remembers useful habits and forgets stale ones.

### 2. Evolution

Related instincts merge into **skills**, tested knowledge modules with version numbers and eval specs. The system picks the right implementation for each goal:

- Daily AI news? **Script + cron job.** Not a skill.
- Pre-merge bug catching? **Hook.** Not an agent.
- Shell script debugging? **Specialized agent.** Not a script.

Implementation matches the goal's nature. Skills aren't the answer to everything.

### 3. Nightly Autonomy

This changes the equation. Every night, a scheduled agent:

1. Runs **health checks** on every goal
2. **Evaluates** skills against scenario tests
3. **Improves** anything failing
4. **Researches** better approaches for unhealthy goals
5. Runs **experiments** in isolated git worktrees
6. Writes a **morning report**

You get a report like this:

```
Evolution Report — 2026-03-22

Actions taken:
✅ Created scripts/ai-morning-briefing.sh
✅ Installed LaunchAgent (daily 09:03)
✅ Updated architecture.yaml (2 goals now realized)

Goal Health:
- ai_intelligence:    ✅ healthy
- self_improvement:   ○ collecting patterns...
- productivity:       ○ waiting for usage data
```

No manual configuration. No midnight YAML editing. No fixing things you accidentally broke.

---

## 15 Days of Evidence

I ran this on my personal AI assistant, starting from an empty repo. In 15 days, the system generated:

| Artifact | Count |
|----------|-------|
| Behavioral patterns (instincts) | 174 (90 active + 84 auto-archived) |
| Tested skills | 10 (100% eval pass, 117 test scenarios) |
| Specialized agents | 3 |
| Slash commands | 15 |
| Automation scripts | 19 |
| Hooks | 11 |
| Scheduled agents | 4 |
| Architecture decisions | 8 |

The nightly agent made **134 commits across 11 nights**. It evolved skills, ran experiments, tracked Claude Code updates, and archived outdated patterns. I slept through all of it.

The system also evolved its own task management:

<p align="center">
  <img src="https://github.com/user-attachments/assets/5828b1e7-5808-478d-9340-505480a41a2c" alt="Jarvis Dashboard" width="560">
  <img src="https://github.com/user-attachments/assets/69c397ab-dde7-4dae-968b-9f7cf9b24e01" alt="Quest Board — mobile" width="160">
</p>

<p align="center">
  <em>Jarvis Dashboard (system overview) and Quest Board (gamified task management).</em>
</p>

And it has **meta-evolution**: the system measures whether its own evolution mechanism works (instinct survival rate, eval discrimination, skill convergence speed) and adjusts its parameters. The evolution process tunes itself.

---

## Three Knobs, Not Three Hundred

Most AI tools hand you more controls. Homunculus gives you three:

1. **Define your goals.** A tree of outcomes you care about.
2. **Set your boundaries.** Permissions for autonomous action.
3. **Walk away.** The system handles the rest.

You don't need expertise in prompt engineering, hook configuration, agent orchestration, or skill design. You need clarity on **what you want**.

AI is smart enough to figure out the rest. Set goals, grant permissions, sleep.

---

## Try It

```bash
npx homunculus-code init
```

Then open Claude Code:

```
> /hm-goal                  # AI asks about your project, builds your goal tree
> /hm-night                 # Runs your first evolution cycle
```

<p align="center">
  <img src="https://github.com/user-attachments/assets/b3ce6017-02de-44a4-a3c6-8d45765c1693" alt="Homunculus demo" width="600">
</p>

60 seconds to set up. After that, the system grows on its own.

**[GitHub → Homunculus](https://github.com/JavanC/Homunculus)**

---

## Acknowledgments

Homunculus builds on ideas from:

- **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** — Continuous Learning and eval-improve loop patterns
- **[OpenClaw](https://github.com/openclaw/openclaw)** — Proving AI can generate its own skills
- **[Karpathy's autoresearch](https://x.com/karpathy)** — Autonomous 12-hour experiment loops
- **[Anthropic's eval research](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)** — Eval methodology and noise tolerance

---

I'd like to hear how you configure your AI assistant today. Are you on the treadmill? Have you tried autonomous approaches? Drop a comment.

*Built by [Javan](https://github.com/JavanC) and his self-evolving AI assistant.*
