---
# beanflow-slmt
title: Harden Codex work-set acceptance gate
status: completed
type: task
priority: normal
created_at: 2026-09-05T19:19:49Z
updated_at: 2026-09-05T19:21:33Z
---

## What to change

Turn the first managed SPA run findings into explicit Codex calibration and work-set acceptance policy.

## Acceptance criteria

- [x] A new or changed implementer profile starts with a one-leaf calibration work set.
- [x] The implementer may report completed only with a clean worktree, exact required verification, and atomic Bean deletion commits.
- [x] The parent rejects incomplete outcomes and returns the same work set for repair.
- [x] Codex documentation and tests describe and protect the policy.

## Summary of Changes

Added a one-leaf calibration gate for new or changed profiles, strict parent acceptance checks, atomic deletion requirements, and one end-of-work-set formatter, Clippy, lint, and typecheck gate. Updated the Codex profile, skill, continuation prompt, documentation, and regression tests.
