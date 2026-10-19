# Purpose Tree A — What Homunculus Does Inside a Project

This is the reference tree the Homunculus skill is built from. Every skill, script, or
rule in this repo must realize one of these leaves (plan Phase 1). The tree for how the
skill improves itself is in [`purpose-tree.yaml`](../purpose-tree.yaml).

Source: [plan](plans/homunculus-skill-plan.md), settled 2026-10-19.

```yaml
version: "3.0"

root:
  purpose: Keep each project's purposes clear and stable, so implementations can keep changing.
  realized_by:
    - id: purposes_written
      purpose: Purposes can be written down.
      realized_by:
        - id: node_format
          purpose: >-
            Shared node format (id, purpose, realized_by, status, status_note,
            paused_reason, metrics, tests, health_check), schema v3.0.
        - id: top_down
          purpose: >-
            The human sets upper purposes; the AI only proposes lower ones and
            never invents upper ones.
        - id: bootstrap
          purpose: >-
            Existing projects can bootstrap: scan the code and infer a draft tree
            for human confirmation.

    - id: purposes_aligned
      purpose: Purposes and implementations stay aligned.
      realized_by:
        - id: sync_realized_by
          purpose: >-
            Implementation changes reach the tree: at session end, propose
            realized_by updates for a human to accept or reject. No silent writes.
        - id: gaps_visible
          purpose: >-
            Gaps are visible: purposes with no implementation, and
            implementations serving no purpose.

    - id: tree_healthy
      purpose: The tree itself is healthy.
      realized_by:
        - id: structurally_valid
          purpose: >-
            Schema check passes, no orphan nodes, paused/planned nodes carry a reason.
        - id: no_false_greens
          purpose: A health_check must fail when the data it judges does not exist.
        - id: periodic_review
          purpose: >-
            Upper purposes change only in explicit review, not in daily sessions.

    - id: project_improves
      purpose: The project naturally gets better.
      realized_by:
        - id: effective
          purpose: Proposed changes actually move the project toward its purposes.
        - id: no_rabbit_holing
          purpose: >-
            Proposal size matches the purpose's level; if the same node keeps
            changing, stop and revisit the parent purpose.
        - id: low_friction
          purpose: >-
            The skill is easy to pick up and use with little effort. How (when it
            surfaces, how many questions it asks) is decided by its realizers.
```

Leaves have no concrete implementations yet: realizers are derived in plan Phase 1.

Optional output, not a goal: syncing a project's root and first-layer purposes to an
external knowledge store, configured globally and off by default (plan D6, D7).
