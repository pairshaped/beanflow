---
# beanflow-qjrq
title: Scaffold TypeScript package and host-neutral core contract
status: in-progress
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:32Z
updated_at: 2026-08-16T22:31:07Z
parent: beanflow-0c83
---

## What to build

Stand up the Beanflow repository as a buildable, testable TypeScript package and define the host-neutral core contract.

Core types and interfaces:
- `RunState` - persistent run state (phase, selected leaf, blockers, timestamps)
- `ScopeManifest` - frozen set of approved executable descendants with dependency order
- `BeanRef` - reference to a Bean (id, path)
- `BlockerReceipt` - concrete blocker evidence and the exact decision required
- `HostAdapter` - host-specific lifecycle surface (session events, abort signal, tool invocation)

State file schema for transient run state. Failure semantics: classify errors as retryable, blocker, or fatal.

The core must stay host-neutral. Pi specifics belong only in the Pi adapter.

## Acceptance criteria

- [ ] `pnpm build` and `pnpm test` succeed on a fresh checkout
- [ ] `HostAdapter` is defined and documented; core types never reference Pi
- [ ] `RunState` round-trips through the state file schema without loss
- [ ] Error classification covers retryable, blocker, and fatal with documented rules

## Verification

- `pnpm test`
- `pnpm build`

## Out of scope

- Pi lifecycle extension code
- Beans CLI integration (arrives in later leaves)
- Any Beanflow config file (V1 has none)
