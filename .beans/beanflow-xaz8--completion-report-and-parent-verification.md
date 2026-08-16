---
# beanflow-xaz8
title: Completion report and parent verification
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

Completion report and parent-level verification.

- After all executable children complete, run parent-level integration verification
- Produce a report: completed Beans and their commits, verification evidence, remaining blockers, and precise owner questions
- Delete the parent Bean only when every scoped child is complete and parent verification passes
- If blockers remain, preserve the parent and the blocked leaves
- If integration work is discovered, create and audit another child instead of hiding it in a final cleanup

## Acceptance criteria

- [ ] The report lists completed Beans, commits, evidence, blockers, and owner questions
- [ ] The parent is deleted only when all children complete and verification passes
- [ ] Blockers cause the parent and blocked leaves to be preserved
- [ ] Discovered integration work becomes a new audited child

## Verification

- `pnpm test` on fixture runs reaching completion and blocked states

## Out of scope

- Landing (separate authorization)
- Push or remote side effects
