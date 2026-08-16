---
# beanflow-i5z3
title: Separately authorized landing flow
status: todo
type: task
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:33Z
updated_at: 2026-08-16T22:23:33Z
parent: beanflow-obm9
blocked_by:
    - beanflow-pobc
---

## What to build

Separately authorized landing and cleanup flow.

- Keep landing separate from autonomous execution
- Require explicit owner approval before changing the target branch
- Follow repository policy: merge the target into the feature branch, resolve conflicts and verify there, fast-forward the target, then remove the clean worktree and merged branch
- Preserve the branch and worktree when the run stops with blockers or review is pending

## Acceptance criteria

- [ ] No target-branch change happens without separate approval
- [ ] Landing follows the repository merge and cleanup policy
- [ ] A clean landing removes the worktree and merged branch
- [ ] Blockers or pending review preserve the branch and worktree

## Verification

- `pnpm test` against throwaway git fixtures covering clean and blocked landings

## Out of scope

- Pushing, pull requests, or deployment
