---
# beanflow-lduc
title: Implement Codex manifest refresh
status: completed
type: bug
priority: normal
created_at: 2026-09-05T19:36:02Z
updated_at: 2026-09-05T19:37:14Z
---

## What to fix

Make the advertised Codex MCP refresh operation audit and persist a new frozen manifest instead of returning guidance text.

## Acceptance criteria

- [x] Refresh resolves the named active worktree and run.
- [x] Refresh audits current executable leaves before changing state.
- [x] Refresh preserves already-deleted historical leaves and includes current newly audited leaves.
- [x] Refresh persists the new frozen timestamp and selected leaf.
- [x] Regression tests pass.

## Summary of Changes

Implemented the advertised Codex manifest refresh operation. It resolves the active named worktree, re-discovers and audits current leaves, preserves deleted historical leaves, persists the new manifest and selection, and reports the result. Added a regression test covering the state transition.
