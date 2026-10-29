---
name: purpose-sync
description: At the end of a work session, propose updates to a project's purpose tree so each purpose's realized_by matches what the code now does, and flag changes that serve no purpose. Use when wrapping up a session in a project that has purpose-tree.yaml or architecture.yaml, or when asked to sync the purpose tree.
---

Keep the project's purpose tree in step with its implementations. Uses the
[purpose-tree](../purpose-tree/SKILL.md) method; read it first if you have not.

You touch `realized_by` and `last_synced`. A `purpose` changes only when the human
explicitly accepts a session-end review item (step 2b); never edit one on your own.

## Steps

1. **Collect changes.** Run:

   ```bash
   node <this-skill>/scripts/changes.cjs
   ```

   It prints JSON: the tree file, the base commit (the tree's `last_synced`, or the last
   commit that touched the tree), every changed path since then (committed and not), and
   for each path the node ids whose `realized_by` mentions it. `touched_any` lists every
   path changed by any commit in the range (plus uncommitted ones), with its nodes; a path
   changed and then reverted still appears there. Exit 2 = no tree here: stop silently.
   Exit 4 = the tree exists but does not parse: print exactly
   `purpose-sync: skipped reason=unparseable file=<tree>` as your last line, change
   nothing, and let the session end continue (`purpose-review` can rebuild the tree).
   Exit 3 = setup problem (skill missing, not a git repo): report it in one line and stop.

   **Too many changes?** If there are more than 50 `changes` (whatever `base_source` is),
   the range is too old to sync item by item. Do not propose anything. Ask one question:
   "Set the sync baseline to HEAD? (purposes stay as they are; run a tree review to catch
   up)". Only on yes, do step 5. On no or no answer, write nothing. Print the summary with
   `proposed=0`.

2. **Decide proposals.** Work from that JSON, not from memory of the session. Use the
   conversation only to understand *why* something changed.
   - A node's implementation was renamed, moved, or deleted → update its `realized_by`.
   - A node gained a new implementation → add it to that node's `realized_by`.
   - A changed path matches no node (`unmatched`) and is real functionality → propose
     which existing purpose it serves. If none fits, flag it as a **gap**; do not invent
     a purpose.
   - A node now has no implementation left → flag it as a **gap**.
   - A change with `match: coarse` reached its node only through a directory prefix, inside
     a subdirectory that is new since base. Ask: "does `<subdir>` serve `<node>`, or another
     purpose?". Exact matches and renames are never marked.
   - Tests, formatting, lockfiles, and docs-only edits are not proposals.

2b. **Session-end review.** Look only at the nodes this session touched and their parents:
   start from the nodes in `touched_any` (the range can include other sessions' commits),
   and narrow them to this session using the conversation.
   Raise a **review** item when one of these holds:
   - (a) Several implementations of the same purpose were replaced in this session.
   - (b) The node is in `churn`: its `realized_by` already changed 3+ times in 30 days.
     Endless tweaking usually means the purpose is unclear (rabbit-holing).
   - (c) New functionality fits no purpose and looks like a new direction, not a stray file.
   A review item is a question, not an edit: "Is `<id>` still about '<purpose>'?" or "Is
   this a new purpose, or should it not exist?". If the human answers with a new wording,
   apply it; otherwise change nothing. Use the conversation to judge (a) and (c); do not
   go back to older sessions.

3. **If there is nothing to show (no proposal, gap or review): say nothing.** Skip
   step 5 and leave the tree file untouched; print the summary line.

4. **Otherwise ask once.** One numbered list, then one question:

   ```
   Purpose tree — 3 proposals
   1. daily_awareness: realized_by "cron brief" → "scripts/brief.js"
   2. offline_reading: add "app/cache/"
   3. gap: scripts/export.js serves no purpose — which purpose is it for?
   4. review: daily_awareness changed 4 times in 30 days — still "Know what matters before the day starts"?
   Accept all? (or e.g. "reject 2", "3: serves sync_progress")
   ```

   Do not ask follow-up questions. Anything left unanswered counts as rejected.

5. **Apply.** Edit only the accepted `realized_by` entries. Set the top-level
   `last_synced:` to the current `HEAD` commit when at least one item was shown (answered
   or not, so the same items are not raised again), or when the human said yes to the
   baseline question. Otherwise do not write the file. Then validate:

   ```bash
   node <purpose-tree-skill>/scripts/validate.cjs
   ```

   If validation fails, fix your edit or revert it. Never leave an invalid tree.

6. **Print the summary line** as the last line of your output, exactly:

   ```
   purpose-sync: proposed=<N> accepted=<N> rejected=<N> gaps=<N> reviews=<N>
   ```

   `reviews` counts the review items raised in step 2b.

   This skill stores nothing else. A host that wants to learn from these numbers reads
   this line.

## Rules

- Propose implementations only: paths added to or removed from `realized_by`. To change a
  purpose (its wording, or adding, splitting, merging or removing one), use 2b or raise a
  review item instead.
- For a tree-wide check (gaps outside this session, stale nodes, failing health checks),
  the human runs the `purpose-review` skill. Do not do that here.
- Commit nothing yourself unless the user asks; the tree edit is part of their work.
