---
# beanflow-l71v
title: Freeze deterministic scope manifest and run status
status: todo
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:32Z
updated_at: 2026-08-16T22:23:32Z
parent: beanflow-0c83
---

## What to build

Deterministic scope manifest and run status.

- Given an audited parent, freeze a manifest of the approved executable descendants in dependency order
- The manifest is immutable once frozen; refresh is an explicit operation, not automatic
- Reject ambiguous input (unknown parent, missing edges, duplicate candidates) with a clear error
- Persist run state under `~/.local/state/beanflow/`, honoring `BEANFLOW_STATE_DIR` as an override
- Provide a status read reporting the current run phase and selected leaf

## Acceptance criteria

- [ ] Freezing produces a fixed set and deterministic order
- [ ] Re-freezing does not silently absorb children added later; refresh is explicit
- [ ] Ambiguous input is rejected with a specific error
- [ ] Run state round-trips and respects `BEANFLOW_STATE_DIR`

## Verification

- `pnpm test` covering manifest determinism, ambiguity rejection, and state round-trip

## Out of scope

- Branch and worktree creation (next leaf)
- Automatic re-freezing
