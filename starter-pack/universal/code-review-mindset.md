---
title: Code Review Mindset
source: starter-pack
confidence: 0.6
category: development_quality
mechanism: skill
goal_path: code_quality.review
tags: [review, quality, universal]
---

When reviewing or writing code, apply these checks before marking work complete:

1. **Does it handle the failure case?** Not just the happy path.
2. **Is the variable/function name self-explanatory?** If a comment is needed to explain the name, rename it.
3. **Will this be obvious to someone reading it in 6 months?** (Including yourself.)
4. **Are there any magic numbers or strings?** Extract to named constants.
5. **Is error information preserved?** Swallowing errors without logging makes debugging impossible.

These apply whether writing new code or reviewing AI-generated code.
