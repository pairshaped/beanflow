---
# beanflow-q84i
title: Honor named worktrees when resuming Beanflow
status: completed
type: bug
priority: normal
created_at: 2026-08-25T14:48:17Z
updated_at: 2026-08-25T14:49:33Z
---

## What to build

Make resume honor an explicitly named absolute worktree path, matching the skill instruction used when the MCP server is rooted in another checkout. Resolve and validate the named Git worktree before comparing it with the run owner.

## Acceptance criteria

- [x] Resume succeeds from a server rooted elsewhere when the request names the owning worktree.
- [x] Relative or non-Git named paths are rejected clearly.
- [x] Resume without a named path keeps the existing current-directory behavior.

## Verification

Run focused MCP tests, then the full Beanflow suite, typecheck, and build.

## Out of scope

Moving a run between worktrees or changing run ownership.

## Summary of Changes

Resume now resolves an explicitly named absolute Git worktree and uses it for ownership and Bean discovery. Invalid paths fail clearly. Operation parsing now follows the first command phrase, so words in worktree directory names cannot override resume.
