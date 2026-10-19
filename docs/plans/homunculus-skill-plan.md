# Plan: Homunculus as a Skill

Status: draft for review (2026-10-19). Nothing implemented yet.

## TL;DR

- Homunculus becomes a **skill collection** in this repo (marketplace style, like `mattpocock/skills`): one core method skill plus thin adapter skills that call it by name.
- It is designed **purpose-first**: the goal trees below are settled; skill boundaries and names are derived from them in Phase 1, not fixed up front.
- Two loops: **in-project** (keeps a project's purposes stable while implementations change) and **self-improvement** (observed privately, merged back into this public repo only via PR).

## Decisions

| # | Decision |
|---|---|
| D1 | This public repo (JavanC/Homunculus) is the single source. Skills install from it, not from private config. |
| D2 | Repo is a skill collection. Dependencies are by name: adapters call the core skill via the Skill tool (no formal dependency mechanism exists). |
| D3 | Skill set and names are **not fixed now**. They are derived from the purpose trees in Phase 1. |
| D4 | Session-end sync: the user's private `/end` adds one step — if the project has `architecture.yaml`, call the public sync skill by name. `/end` itself stays private. |
| D5 | Sync **proposes** `realized_by` changes; a human accepts or rejects. No silent writes. Purpose-level nodes change only during an explicit review. |
| D6 | External knowledge store (e.g. gbrain) is configured in a **global user config** (e.g. `~/.config/homunculus.yaml`). Default: none. Never configured per project. |
| D7 | Cross-project lookup (syncing a project's root + first-layer purposes to the knowledge store) is an **optional output** of sync, off by default — not a sub-goal. |
| D8 | Self-improvement observation runs **privately** (first host: Xiao-J, `~/assistant`). Improvements reach this repo only as PRs, reviewed and merged by the maintainer. |
| D9 | This repo manages itself with its own `purpose-tree.yaml` (the self-improvement tree below). |
| D10 | Pilot on **two different project types at once**: Xiao-J (automation runtime) + one product project (e.g. aha-tale). |
| D11 | Existing npm CLI (`bin/`, `core/`, nightly agent, instincts) is **frozen as legacy**: kept, marked in README, not depended on by the new skills. Removal is decided later by this repo's own tree review. |
| D12 | (2026-10-20) The base skill is **`purpose-tree`**: the method itself (node format, top-down rule, validation, no-false-green rule). It realizes tree A leaves 1.1, 1.2, 3.1, 3.2. Other skills call it by name. "Purpose" (why, rarely changes) is preferred over "goal" (what to achieve, replaceable). The repo/package stays Homunculus. |
| D13 | (2026-10-20) A project's tree file is `purpose-tree.yaml` at the project root, created lazily. The skill looks for `purpose-tree.yaml` first, then falls back to legacy `architecture.yaml`. Validation script is zero-dependency Node (YAML subset parser). |
| D14 | (2026-10-20) Sub-purposes live inside `realized_by`: a list of means where an item with `purpose` is a sub-purpose (with `id`) and a string is an implementation. Measurable targets go in `metrics`. All means are AND; OR is deferred until needed. Legacy `goals:` maps are still read. Basis: Rasmussen means-ends hierarchy and GSN (goals supported by sub-goals and solutions through one link type). |

## Purpose tree A — what Homunculus does inside a project

Root: **Keep each project's purposes clear and stable, so implementations can keep changing.**

1. **Purposes can be written down**
   - 1.1 Shared node format (purpose / realized_by / status / status_note / paused_reason / metrics / tests / goals / health_check), based on Xiao-J schema v3.0.
   - 1.2 Top-down: the human sets upper purposes; the AI only proposes lower ones and never invents upper ones.
   - 1.3 Existing projects can bootstrap: scan the code, infer a draft tree for human confirmation.
2. **Purposes and implementations stay aligned**
   - 2.1 Implementation changes reach the tree: at session end, propose `realized_by` updates (accept/reject).
   - 2.2 Gaps are visible: purposes with no implementation; implementations serving no purpose.
3. **The tree itself is healthy**
   - 3.1 Structurally valid: schema check, no orphans, paused/planned nodes carry a reason.
   - 3.2 No false greens: a health_check must fail when the data it judges does not exist.
   - 3.3 Periodic review: upper purposes change only in explicit review, not in daily sessions.
4. **The project naturally gets better**
   - 4.1 Effective: proposed changes actually move the project toward its purposes.
   - 4.2 No rabbit-holing: proposal size matches the purpose's level; if the same node keeps changing, stop and revisit the parent purpose.
   - 4.3 Low friction: the skill is easy to pick up and use with little effort. (How — e.g. when it surfaces, how many questions it asks — is decided by its realizers, not fixed here.)

## Purpose tree B — this repo's own tree (self-improvement)

Root: **The Homunculus skill keeps getting better across all kinds of projects.**

1. **See how projects use it** — privately log: proposals accepted/rejected, health_check alerts real/false, rabbit-hole incidents (tree A §4).
2. **Improvements are general** — a change to the skill requires the same problem observed in **≥2 different project types**; single-project issues stay in that project's own config. Eval fixtures come from multiple project types.
3. **Improvements reach the public repo safely** — privacy scan (personal paths, account names, emails, private project names) then PR, merged by the maintainer.

Metrics for B: proposal acceptance rate, real-alert ratio, rabbit-hole incidents per session. Existing evals (all at 100) are a **no-regression gate only**, not proof of progress.

## Phases

### Phase 0 — Write the trees down
- Create this repo's `purpose-tree.yaml` with tree B; write tree A into the core skill's reference doc.
- **Done when:** both trees validate against the v3.0 schema; README marks the npm CLI as legacy.

### Phase 1 — Derive skills from purposes
- For each leaf in tree A, decide: core skill content, adapter skill, script, or out of scope. Name skills from that mapping.
- Write the core method skill (schema, top-down rules, build/review flow, validation script) and the minimum adapters (likely: build/review tree, session-end sync).
- **Done when:** every leaf in tree A maps to exactly one realizer (or is marked out of scope with a reason); `npx skills add JavanC/Homunculus` installs the set on a clean machine; validation script fails on a fixture with an empty-data health_check.

### Phase 2 — Two-project pilot
- Migrate Xiao-J: replace `~/assistant/.claude/commands/hm-*.md` with the installed skills, keeping its existing `architecture.yaml`.
- Bootstrap the product project's tree via 1.3.
- Add the `/end` step (D4) in private config.
- **Done when:** both projects have run ≥2 weeks; sync proposals were made and accepted/rejected in both; no purpose-level node was changed outside review.

### Phase 3 — Private observation loop
- Log usage events (component=homunculus) in the private host; monthly roll-up into improvement proposals.
- Build eval fixtures from both pilot projects (e.g. session diff → expected `realized_by` proposals).
- **Done when:** first monthly roll-up exists, with each proposal tagged by how many project types showed the problem.

### Phase 4 — Safe path back to public
- Privacy scan (pre-commit + CI) for personal paths and identifiers; improvement branches go through PR only.
- **Done when:** a seeded fixture containing a private path is blocked by the scan; first improvement PR merged with ≥2-project evidence attached.

### Phase 5 — Roll out
- Install on all three machines via `npx skills add JavanC/Homunculus` (lands in each machine's global skills).
- Optional: enable D7 knowledge-store sync on machines that have one.
- **Done when:** all three machines list the skills; D7 off by default verified on a machine with no config.

## Open questions

- Skill names and exact boundaries (decided in Phase 1).
- Which product project is the second pilot (aha-tale suggested).
- Format and location of the global config file (D6).
- Thresholds: what counts as "the same node keeps changing" (tree A 4.2) and what acceptance rate counts as healthy.
- When (if ever) to make the observation loop public for other users.
- Release checklist in `CLAUDE.md` (npm publish) needs updating once the CLI is legacy.
