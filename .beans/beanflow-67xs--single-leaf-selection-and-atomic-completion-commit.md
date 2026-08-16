---
# beanflow-67xs
title: Single-leaf selection and atomic completion commit
status: todo
type: task
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:32Z
updated_at: 2026-08-16T22:23:32Z
parent: beanflow-twc8
blocked_by:
    - beanflow-7pq9
---

## What to build

Single-leaf execution contract: selection, verification, and one atomic completion commit.

- Select the next ready leaf: dependency order first, then priority, then stable creation order
- Move the selected Bean to in-progress and implement only its scope
- Apply the repository's testing, formatting, and validation rules
- On completion: verify the leaf, delete its Bean, and create one atomic local commit containing implementation, tests, generated artifacts, and the Bean deletion
- Never push

## Acceptance criteria

- [ ] Selection follows dependency order, priority, then creation order
- [ ] The commit contains exactly one leaf's implementation plus that Bean's deletion
- [ ] Verification runs and passes before the commit is created
- [ ] No push or remote side effect occurs

## Verification

- `pnpm test` on fixture repos; assert commit contents are exactly one leaf's work

## Out of scope

- Blocking and reevaluation (next leaf)
- Landing
