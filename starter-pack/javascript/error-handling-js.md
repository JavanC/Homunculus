---
title: Error Handling Patterns (JavaScript)
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.reliability
tags: [error-handling, async, javascript, typescript]
---

Consistent error handling for JavaScript/TypeScript:

- **Async functions**: always use try/catch or `.catch()` — unhandled promise rejections crash Node processes
- **Error messages**: include context: `throw new Error(\`Failed to load config from \${path}: \${err.message}\`)` not just `throw err`
- **Don't swallow errors silently**: `catch (e) {}` is almost always wrong; at minimum `console.error(e)` or re-throw
- **Typed errors**: use `instanceof` checks when you need to handle specific error types differently

```js
// Good
try {
  const data = await fetchUser(id);
} catch (err) {
  logger.error({ err, userId: id }, 'Failed to fetch user');
  throw new AppError('User fetch failed', { cause: err });
}

// Bad
try {
  const data = await fetchUser(id);
} catch (e) {
  // silent failure
}
```
