---
name: purpose-tree
description: The purpose-tree method — how to read, write, and check a project's tree of purposes (why each part exists) separately from its implementations (what currently realizes them). Use when creating, reading, editing, or validating purpose-tree.yaml or architecture.yaml, or when deciding whether a change serves a project's purposes.
---

A project's **purpose tree** records *why* each part of the project exists. Implementations
change often; purposes rarely do. Keeping them apart lets you replace any implementation
without losing sight of what it was for.

## Where the tree lives

- In the project, never in this skill: `purpose-tree.yaml` at the project root.
- If it is missing, look for the legacy name `architecture.yaml`. Read and update whichever
  exists; do not rename it unless asked.
- Create the file lazily: only when the human states the first (root) purpose.

## Purpose, metric, realization

Each node separates three things that change at different speeds:

| Question | Field | Example | Changes |
|---|---|---|---|
| **Why** | `purpose` | "The user never drops a commitment, without having to remember it." | rarely |
| **What to achieve** | `metrics[].healthy` | "0 dropped commitments per week" | sometimes |
| **How, right now** | `realized_by` | "a morning brief at 08:00" | often |

If a `purpose` names a number or target, move it to `metrics`. If it names a tool, file, or
schedule, move it to `realized_by`. Then ask what it is *for*.

## Node format (v3.0)

A purpose is realized by a list of means. A means is either a **concrete implementation**
(a string) or a **sub-purpose** (an object with `purpose`). One list, two kinds — an item
with a `purpose` field is a sub-purpose; anything else is an implementation.

```yaml
version: "3.0"
root:
  id:            root
  purpose:       Why this exists (one sentence)
  status:        active | paused | planned   # default active; retired nodes are deleted
  status_note:   Current state, known gaps
  paused_reason: Required when paused or planned: why, and how to resume
  metrics:       [{name, source, healthy}]
  tests:         [test file patterns]
  health_check:  {command, expected}        # exit 0 = healthy
  realized_by:
    - scripts/capture.js                     # implementation
    - id: daily_awareness                    # sub-purpose: same node format, recursive
      purpose: Know what matters before the day starts
      realized_by:
        - morning brief job
```

- Every sub-purpose needs a unique `id` so it can be referenced.
- All items in `realized_by` are needed together (AND). Alternatives (OR) are not modeled yet.
- If a sub-purpose is later replaced by a single tool, swap the object for a string.
- **Legacy trees:** a `goals:` map (key = id, value = node) is read as sub-purposes
  appended to `realized_by`. Do not convert unless asked.

Field details and examples: [references/schema.md](references/schema.md).
Blank starting tree: [templates/purpose-tree.yaml](templates/purpose-tree.yaml).

## Top-down rule

1. The **human** sets the root and every upper purpose. Never invent or reword one on your own.
2. You may **propose** lower purposes under an existing one; the human accepts or rejects.
3. A child must serve its parent. If you cannot say how, it does not belong there.
4. Upper purposes change only in an explicit review — never as a side effect of daily work.

## Health rules

- **No false greens.** A `health_check` must fail when the data it judges does not exist.
  `test -f`, `ls | head`, `wc -l`, or a `jq` that passes on an empty array are not checks.
- **No empty husks.** A `paused` or `planned` node must have a `paused_reason`.
- **No orphans.** Every node except root sits under a parent purpose.

## Validate

```bash
node <this-skill>/scripts/validate.js [path-to-tree]
```

Exit 0 = valid; exit 1 prints each problem. Run it after every edit to the tree.
