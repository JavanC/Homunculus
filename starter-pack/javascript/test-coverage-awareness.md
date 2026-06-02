---
title: Test Coverage Awareness (JavaScript)
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.testing
tags: [testing, jest, vitest, javascript, typescript]
---

For JavaScript/TypeScript projects, maintain meaningful test coverage:

- New functions that contain branching logic should have tests for each branch
- When fixing a bug, add a test that would have caught it
- Prefer testing behavior over implementation: `expect(result).toBe(expected)` not `expect(fn.mock.calls[0][1]).toBe(x)`
- Mock at the boundary (HTTP, database, filesystem), not deep inside business logic

**Running coverage:**
```bash
npx jest --coverage          # Jest
npx vitest run --coverage    # Vitest
```

When coverage drops below the project baseline, flag it before merging.
