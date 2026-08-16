---
# beanflow-5tim
title: Blocker recording, skip, and reevaluation
status: todo
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:32Z
updated_at: 2026-08-16T22:23:32Z
parent: beanflow-twc8
---

## What to build

Blocker recording, skipping, and reevaluation.

- When a leaf is genuinely blocked: record concrete evidence and the exact decision or external change required, write it to the Bean immediately, and keep the Bean present
- Continue with independent ready leaves while one is blocked
- Reconsider blocked leaves after other work changes their prerequisites
- Treat three consecutive no-progress attempts on one Bean as a stall by default

## Acceptance criteria

- [ ] A blocked Bean is preserved with actionable evidence, not deleted
- [ ] Independent ready leaves are still selected while one is blocked
- [ ] A blocked leaf is reconsidered after its prerequisites change
- [ ] Three no-progress attempts default to a stall

## Verification

- `pnpm test` exercising blocker recording, skip, and reevaluation

## Out of scope

- Guessing when a missing decision would change product intent; block instead
- Landing
