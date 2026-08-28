---
# beanflow-hwcw
title: Allow concurrent Beanflow runs in separate worktrees
status: completed
type: bug
priority: high
created_at: 2026-08-28T13:45:06Z
updated_at: 2026-08-28T13:55:32Z
---

Beanflow currently rejects starting any run while another active-run marker exists, even when the new run belongs to a different repository worktree. Active run identity and command routing must support multiple meaningful runs at once without cross-contamination.

## Acceptance criteria

- [x] Two audited epics in separate worktrees can both have active Beanflow runs.
- [x] Status and resume resolve the run for the caller or explicitly named worktree.
- [x] Starting a second run does not replace, pause, or mutate the first run.
- [x] Stale-run recovery remains scoped and cannot delete another live run.
- [x] Existing single-run behavior remains compatible where the target is unambiguous.
- [x] Tests, typecheck, and build pass.

## Out of scope

- Running two Beanflow executions against the same worktree.
- Automatic scheduling or resource throttling across runs.

## Summary of Changes

Moved active run markers, state, and hard-stop scope into each worktree’s private Git metadata. Codex MCP status/start/resume and both continuation adapters now resolve by current or explicitly named worktree. Matching legacy global runs migrate into their owning worktree, while unrelated runs remain untouched. Added concurrent MCP and Stop-hook regressions, Git-cleanliness coverage, migration coverage, and updated the Codex and skill documentation.
