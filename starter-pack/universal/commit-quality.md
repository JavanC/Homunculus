---
title: Commit Message Quality
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.commit_standards
tags: [git, commits, universal]
---

Write clear, purposeful commit messages that explain *why* a change was made, not just what changed.

- Use imperative mood: "Add X" not "Added X"
- First line ≤ 72 characters, focuses on the change's purpose
- If the change fixes a bug or implements a feature, say so explicitly
- Avoid vague messages like "fix", "update", "changes", "wip"

**Good:** `Fix race condition in session cleanup when multiple tabs open`
**Bad:** `fix bug`

When reviewing AI-generated commits, ensure they meet this standard before accepting.
