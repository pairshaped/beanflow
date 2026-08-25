---
# beanflow-c5rd
title: Recover from stale active Beanflow runs
status: completed
type: bug
priority: normal
created_at: 2026-08-25T14:43:18Z
updated_at: 2026-08-25T14:45:00Z
---

## What to build

Treat an active run whose recorded worktree no longer exists as stale. Status must report it without crashing the MCP transport, and an explicit start request must retire the stale marker and start the requested audited run.

## Acceptance criteria

- [x] Status reports a missing recorded worktree as stale without throwing.
- [x] An explicit start replaces a stale active-run marker and preserves the old run record.
- [x] A live active run still blocks a second start.

## Verification

Run focused MCP server tests and the full Beanflow test suite.

## Out of scope

Migrating an in-progress manifest between live worktrees or silently replacing a live run.

## Summary of Changes

Beanflow now reports missing recorded worktrees as stale instead of reading through them. An explicit start retires a stale marker while retaining the old run state file, and active runs with live worktrees remain protected.
