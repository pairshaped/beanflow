---
# beanflow-gtz4
title: Enforce Milestone checkpoints in runtime
status: in-progress
type: task
priority: normal
tags:
    - beanflow-task
created_at: 2026-09-10T16:20:13Z
updated_at: 2026-09-10T16:48:17Z
parent: beanflow-fyu6
---

## What to build

Make Milestones first-class in frozen manifests and run progression. Preserve Task-to-Milestone membership, stop Task selection at each completed Milestone, require its checkpoint and deletion before selecting work from the next Milestone, then require the Epic checkpoint.

## Acceptance criteria

- [x] Frozen manifests preserve ordered Milestones and their Tasks.
- [x] Runtime state selects either a Task or a Milestone checkpoint without flattening hierarchy.
- [x] Completing a Milestone’s Tasks requires that Milestone checkpoint before later Tasks run.
- [x] Epic checkpoint is reached only after all Milestones are accepted.
- [x] Status, continuation hooks, documentation, and tests expose the same progression.

## Verification

Run pnpm build, pnpm typecheck, pnpm test, the skill validator, beans check, and git diff --check.

## Out of scope

Do not change tracker-native issue categories or landing behavior.

## Implementation summary

Frozen manifests and schema version 3 preserve ordered Milestone scopes and Task membership. Selection stops at each Milestone checkpoint, resumes later Task dependencies from accepted history, and reaches the Epic only after every Milestone is accepted. Start and refresh audit Milestone checkpoint definitions. MCP status, the Stop hook, the host extension, documentation, existing Milestone Beans, and regression tests now expose the same progression.

Verification passed: pnpm build, pnpm typecheck, 140 tests, the Beanflow skill validator, beans check, and git diff --check.
