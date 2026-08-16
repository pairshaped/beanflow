---
# beanflow-7pq9
title: Branch and worktree setup with repo-policy adapters
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

Branch and worktree setup driven by repository policy.

- Read repository policy from the repository's AGENTS.md (branch naming, worktree placement, ignore rules)
- Create a branch and worktree for a resolved parent
- Record the base branch and base commit in run state
- Detect a dirty or ambiguous base and stop rather than proceed

## Acceptance criteria

- [ ] On a fixture git repo, a branch and worktree are created per policy
- [ ] The base branch and commit are recorded
- [ ] A dirty base is detected and the run stops with a clear reason
- [ ] The worktree is placed under the policy-configured location

## Verification

- `pnpm test` against throwaway git fixtures

## Out of scope

- Executing leaves (next leaf)
- Landing and cleanup
