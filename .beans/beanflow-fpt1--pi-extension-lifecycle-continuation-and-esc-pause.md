---
# beanflow-fpt1
title: 'Pi extension: lifecycle continuation and Esc pause'
status: todo
type: task
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:32Z
updated_at: 2026-08-16T22:23:32Z
parent: beanflow-obm9
blocked_by:
    - beanflow-xaz8
---

## What to build

Pi extension for live-session continuation.

- Use session, compaction, agent_end, and agent_settled lifecycle events to restore run state and continue a live run
- Abort detection: when the latest Pi turn ended with the aborted stop reason, pause the run and do not restart it automatically

## Acceptance criteria

- [ ] A run continues across agent settlement and compaction while eligible scoped work remains
- [ ] An Esc-aborted turn pauses the run immediately
- [ ] The aborted stop reason prevents agent_settled from restarting the run

## Verification

- `pnpm test` with mocked lifecycle events covering settlement, compaction, and abort

## Out of scope

- Automatic revival after a dead process or service outage
- Parallel leaf implementation
