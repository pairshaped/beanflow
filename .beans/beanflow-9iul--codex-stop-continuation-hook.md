---
# beanflow-9iul
title: Codex Stop continuation hook
status: todo
type: task
priority: normal
created_at: 2026-08-16T23:30:57Z
updated_at: 2026-08-16T23:30:57Z
parent: beanflow-s4hl
---

## What to build

A Stop hook that reads the armed run state, checks safety bounds, and returns `{"decision":"block","reason":"Continue the beanflow run..."}` when eligible work remains. No block when there is no armed run or when a bound is exceeded.

## Acceptance criteria

- [ ] No armed run exits without blocking
- [ ] An exceeded bound pauses the run instead of blocking
- [ ] Eligible work blocks with a continue reason

## Verification

- `pnpm test` (decideStopHook unit tests)

## Out of scope

- The MCP tool
- Codex config wiring
