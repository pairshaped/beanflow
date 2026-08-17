---
name: beanflow
description: >-
  Carry a feature through a bounded, audited, autonomous delivery run: requirements,
  an audited Bean tree, implementation in an isolated worktree, and a reviewable
  completion or blocker report. Use when the user wants to start, resume, check, or
  land a beanflow run.
---

# Beanflow

Carry a feature through a bounded, audited, autonomous delivery run. Beans is the
authoritative tracker; beanflow never introduces a competing punch list or selects
unrelated work.

## Workflow

1. **Requirements** - Ask the owner focused questions until product and technical
   ambiguity is resolved. Record behavior, non-goals, constraints, risks, and
   testable acceptance criteria.
2. **Plan** - Produce an implementation plan covering behavior, boundaries,
   dependencies, verification, rollout, and risks. Keep it behavioral, not tied to
   file paths. Get owner agreement before publishing the tree.
3. **Bean tree** - Create one epic Bean as the hard scope boundary. Break the plan
   into independently committable leaves. Parent = hierarchy, blocked-by = order.
   Execute leaves only; keep unrelated Beans out of scope.
4. **Audit** - Audit every executable leaf for focused scope, context, acceptance
   criteria, verification, dependencies, and safe autonomy. Reject vague,
   duplicate, oversized, or judgment-dependent leaves. Mark ready-for-agent only
   after the audit passes. Present the tree and order to the owner.
5. **Isolated run setup** - On an explicit start request, create a branch and
   worktree, record its absolute path plus the base branch and commit, freeze a
   manifest, and stop on a dirty or ambiguous base. Store state under
   `~/.local/state/beanflow/`. Continue the run only from that worktree.
6. **Autonomous execution** - Select one ready leaf (dependency order, then
   priority, then creation order). Implement only its scope. Verify, delete the
   Bean, and commit atomically. Never push. Record blockers with evidence and
   continue with independent leaves. When no eligible leaf remains, pause instead
   of polling or auto-continuing; an explicit resume may restart the run after its
   state changes. Esc pauses; a hard stop, retry ceiling, or deadline bounds the
   run.
7. **Completion** - Run parent-level verification and produce a report of
   completed Beans and commits, verification evidence, remaining blockers, and
   owner questions. Delete the parent only when every child is complete and
   verification passes.
8. **Landing** - Keep landing separate and require explicit approval. Merge the
   target into the feature branch, resolve and verify there, fast-forward the
   target, then remove the clean worktree and branch.

## Operations

Use the `beanflow` tool for status, resume, manifest-refresh, and landing. Users
interact in plain language and do not memorize commands.
