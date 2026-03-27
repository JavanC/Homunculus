# Proactivity Design Guide

**Three concepts for building AI assistants that act without being asked.**

---

## Why Proactivity Matters

A reactive AI assistant waits. You ask, it answers. You forget to ask, nothing happens.

A proactive AI assistant notices. It surfaces insights from sessions before they're lost, queues topics for deeper exploration, and checks in on its goals without waiting for a prompt.

The difference isn't intelligence — it's *design*. These three concepts form the foundation of proactive behavior in Homunculus-style systems.

---

## Concept 1: Memory Flush

**The problem:** Valuable insights emerge during sessions but never get stored. User preferences observed mid-conversation, implicit feedback, context that would improve future responses — all of it evaporates when the session ends.

**The design principle:** At natural session boundaries, the assistant should identify non-instinct insights — things that aren't recurring behavioral patterns but *are* worth remembering — and queue them for human review before integration into permanent memory.

This is intentionally a queue, not an auto-write. Human review catches hallucinations, prevents memory corruption, and maintains trust in the persistent memory layer.

**What to capture:**
- User preferences that weren't explicit instructions ("you seemed to prefer X over Y")
- Project context that will matter in future sessions
- Feedback signals (implicit or explicit) that should influence future behavior
- Decisions made that explain current state

**What not to capture:**
- Recurring patterns (those become instincts, then skills)
- Ephemeral task state
- Anything that's already documented elsewhere

**Implementation guidance:** The right implementation depends on your infrastructure. You might use a file-based queue, a task system entry, a note in a memory file, or a prompt to the user. The key constraint: *nothing goes into permanent memory without review*.

---

## Concept 2: Research Queue

**The problem:** Conversations surface interesting topics — new tools, relevant patterns, potential improvements — but the current session has a different focus. These topics get mentally noted and then forgotten.

**The design principle:** When a topic is worth exploring but not worth derailing the current session, queue it for later. The queue should be persistent, deduplicated, and consumable by future sessions or autonomous agents.

Research queue entries are hypotheses, not commitments. The question is: "would exploring this topic likely improve the system?" If yes, queue it. Let the nightly agent or a dedicated research session decide whether to act on it.

**Good queue candidates:**
- New library/tool that might replace a current implementation
- Pattern observed in user behavior that might generalize
- Potential experiment ("what if we tried X instead of Y?")
- External development (new model release, ecosystem change) worth investigating

**Queue discipline:**
- Each entry should have enough context to be actionable without the original session
- Deduplicate before adding (same topic from different angles = one entry)
- Entries should expire or be pruned — a queue that only grows is a graveyard, not a queue
- Prioritization matters: "might improve response quality" outranks "interesting side topic"

**Implementation guidance:** A simple append-only file with topic + context + date works. More sophisticated setups might integrate with a task system, include source tracking, or support priority scoring.

---

## Concept 3: Periodic Heartbeat

**The problem:** AI assistants are passive by default. They only act when invoked. But many valuable behaviors — checking whether goals are still healthy, processing queued research, nudging stalled tasks — benefit from periodic execution independent of user interaction.

**The design principle:** Schedule lightweight autonomous sessions to check in on the system's state. These aren't full evolution cycles — they're pulse checks that surface what needs attention before it becomes a problem.

A heartbeat session might:
- Review pending items (research queue, memory flush candidates, stalled tasks)
- Run health checks against the goal tree
- Send a summary to the user's preferred notification channel
- Trigger a deeper cycle if something looks off

**Design properties of a good heartbeat:**

*Lightweight by default.* A heartbeat that runs heavy analysis on every cycle burns budget unnecessarily. Start with checks that are fast and cheap; escalate to deeper analysis only when something looks wrong.

*Aware of its own cost.* Budget constraints are a feature, not a limitation. A well-designed heartbeat tracks its spend and adjusts depth accordingly — full analysis on weekly cycles, lighter checks daily.

*Non-disruptive.* Heartbeats run in the background. Notifications should be worth the interruption — reserve them for findings that genuinely require user attention.

*Idempotent.* Running twice should produce the same outcome as running once. No double-notifications, no duplicate entries, no state corruption.

**Implementation guidance:** On macOS, `launchd` is the right tool (it has Keychain access, which `cron` lacks — and Claude Code authentication depends on Keychain). On Linux, `cron` or `systemd` timers work. The heartbeat script should guard against concurrent runs (use a lockfile or `flock`) and handle cases where the AI service is unreachable.

---

## Putting It Together

These three concepts are complementary:

```
Session ends
    │
    ├── Memory Flush → queue insights for review
    │
    └── Research Queue → queue topics for exploration
                              │
                              ▼
                    Periodic Heartbeat
                              │
                    ├── Process memory queue
                    ├── Pull from research queue
                    ├── Check goal health
                    └── Notify if needed
```

A system with all three behaves fundamentally differently from a reactive assistant:
- Insights don't get lost at session end (memory flush)
- Interesting topics don't get forgotten (research queue)
- The system checks its own health without being asked (heartbeat)

---

## A Note on Implementation

These are design principles, not a specific implementation. The right implementation for your system depends on:

- Your notification infrastructure (Discord? email? desktop notification?)
- Your task management setup (file-based? API-backed?)
- Your budget constraints (how much are you willing to spend on autonomous cycles?)
- Your trust model (how much autonomy is appropriate for your assistant?)

Homunculus's reference implementation uses a file-based research queue, launchd-scheduled heartbeat, Discord webhook notifications, and a manual review step for memory flush. But none of those choices are fundamental — adapt the principles to your infrastructure.

The goal is an assistant that *grows* between sessions, not just *during* them.

---

*See [docs/nightly-agent.md](nightly-agent.md) for Homunculus's concrete implementation of the heartbeat concept.*
