---
# beanflow-l4c4
title: Harden Beanflow run progression and request parsing
status: completed
type: bug
priority: high
created_at: 2026-08-25T03:48:09Z
updated_at: 2026-08-25T03:51:15Z
---

## What to build

Fix rough edges reproduced during the sports Mailchimp Beanflow run: unquoted worktree paths absorb sentence punctuation, run status keeps reporting a deleted leaf instead of the next eligible leaf, and the skill does not name the exact headings enforced by the audit.

## Acceptance criteria

- [x] An unquoted absolute worktree path followed by sentence punctuation resolves to the intended worktree.
- [x] Status and resume derive the next eligible manifest leaf after completed Beans are deleted, without changing scope.
- [x] The Beanflow skill names the exact required audit headings.
- [x] Existing named-worktree, continuation, and MCP behavior remains covered and passing.

## Verification

Run `pnpm test`, `pnpm run typecheck`, `pnpm run build`, and the skill quick validator.

## Out of scope

Do not change manifest scope, completion semantics, landing behavior, or introduce a new user-facing command.

## Summary of Changes

Unquoted named-worktree requests now discard terminal sentence punctuation while quoted paths stay exact. A shared next-leaf derivation treats deleted Beans as completed and keeps status, resume, and the Codex stop hook synchronized with the next eligible frozen-manifest leaf. The Beanflow skill now names all four headings enforced by the audit. All 114 tests, typecheck, build, and skill validation pass.
