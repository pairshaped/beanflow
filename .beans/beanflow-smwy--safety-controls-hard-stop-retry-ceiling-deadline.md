---
# beanflow-smwy
title: 'Safety controls: hard stop, retry ceiling, deadline'
status: todo
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:33Z
updated_at: 2026-08-16T22:23:33Z
parent: beanflow-fyu6
---

## What to build

Bounded-continuation safety controls.

- Hard stop file that halts a run
- Retry ceiling that caps attempts
- Optional deadline that stops an unattended run

Continuation must never override Esc, the hard stop mechanism, retry limits, or deadlines. Owner stop instructions always win.

## Acceptance criteria

- [ ] A hard stop file halts the run
- [ ] The retry ceiling is enforced
- [ ] The deadline stops an unattended run
- [ ] Owner stop always wins over continuation

## Verification

- `pnpm test` covering hard stop, retry ceiling, and deadline

## Out of scope

- Reviving a dead process or service-outage session
