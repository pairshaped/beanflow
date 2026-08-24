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
   worktree, or adopt the clean isolated worktree the owner already requested.
   Invoke the `beanflow` tool with the audited epic id and base branch so it
   records the absolute worktree path plus the base commit, audits and freezes
   the manifest, persists the active run under `~/.local/state/beanflow/`, and
   selects the first ready leaf. Stop on a dirty or ambiguous worktree.
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

Use the `beanflow` tool for start, status, resume, manifest-refresh, and landing.
Starting requires the audited epic Bean id and base branch. Users interact in
plain language and do not memorize commands.
