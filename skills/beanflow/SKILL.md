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

## Codex orchestration

In Codex, keep the owner-facing task as the planner and orchestrator. Treat its
reasoning time as the expensive part of the run: spend it on requirements,
architecture, decomposition, audits, real guidance decisions, and final verification,
not routine acknowledgements between small implementation steps. The owner may
choose GPT-6 Astra, Sol, Luna, or another capable model and reasoning level based on
the difficulty of the epic. GPT-6 Astra at medium reasoning is the recommended
default for demanding planning, not an architectural dependency. The parent owns
requirements, architecture, planning, Bean creation and audit, owner communication,
delegation, and the final report.

Never implement an executable leaf in the parent task when the
`beanflow_implementer` custom agent is available. When the first executable leaf is
ready, create exactly one implementer thread for that Beanflow run. Use a bounded or
context-free fork instead of copying the full planning conversation. Retain the
returned agent identity and reuse that thread for every later leaf and guidance
exchange in the run. Before creating an implementer after compaction or resumption,
inspect the existing agent threads and reuse the run's worker if it is still
available.

Delegate a bounded ordered work set of related leaves beginning with the selected
leaf. A later leaf may join the work set only when it is already eligible or becomes
eligible solely by completing earlier leaves in that same work set. Prefer siblings under one
nearest container or one short dependency chain. Do not hand over the whole epic,
unrelated leaves, unresolved product choices, or work whose dependency can change
outside the work set.

Give the implementer every Bean id in order plus the absolute worktree path. Beans
must carry the accepted scope and decisions. Include extra handoff context only when
it cannot be discovered safely from the Beans, repository, or run state. The
implementer verifies, deletes, and commits each leaf separately, then continues to
the next delegated leaf without waiting for parent acknowledgement. The parent waits
for the work-set outcome instead of reviewing every routine leaf transition. Send later
work sets as follow-up instructions to the existing thread rather than spawning
another agent.

Interpret the worker's `BEANFLOW_OUTCOME` as follows:

- `completed`: inspect the reported Bean-to-commit list and verification summary at
  the end of the delegated work set. Spot-check where risk warrants it, then send the
  next bounded work set to the same implementer thread. Full verification still belongs at the
  parent completion gate.
- `needs_guidance`: resolve the implementer's focused question in the parent task,
  then send the decision and rationale back to the same implementer so it can finish
  the current leaf and continue its remaining delegated work set. Treat any earlier
  Bean-to-commit results in the report as completed. The parent may inspect the
  repository and tests before answering. Do not make code changes in the parent
  merely because the implementer asked for help.
  If answering would change accepted scope, pause, revise and re-audit the affected
  Bean, then explicitly refresh the frozen manifest before resuming.
- `owner_blocker`: record the blocker immediately and ask the owner only for the
  smallest missing decision or action.

Do not start a separate fixed-model escalation agent. The owner-facing parent is the
orchestrator and resolves `needs_guidance` using its current model and reasoning
setting. Keep only one implementer thread for a run. Close it when the Beanflow ends.
Do not reuse it for another epic. Replace it only when the thread is unavailable,
closed, attached to the wrong worktree, or its accumulated context is demonstrably
hurting reliability; ensure the old thread is no longer active before replacing it.
If the custom implementer is unavailable, create one model-specific agent with the
same role instructions using GPT-5.6 Luna at medium reasoning and reuse it for the
rest of the run. Pass the same compact handoff explicitly.

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
   after the audit passes. Each leaf must use the exact `## What to build`,
   `## Acceptance criteria`, `## Verification`, and `## Out of scope` headings;
   acceptance criteria must be checkboxes. Present the tree and order to the owner.
5. **Isolated run setup** - On an explicit start request, create a branch and
   worktree, or adopt the clean isolated worktree the owner already requested.
   Invoke the `beanflow` tool with the audited epic id and base branch so it
   records the absolute worktree path plus the base commit, audits and freezes
   the manifest, persists the active run in that worktree's private Git metadata,
   and selects the first ready leaf. This state is untracked and cannot dirty the
   worktree. Separate worktrees may run concurrently. When the Codex server is
   rooted in a different checkout, include `in worktree /absolute/path` for
   start, status, and resume requests so beanflow resolves the intended run.
   Stop on a dirty or ambiguous worktree.
6. **Autonomous execution** - Select the next ready leaf (dependency order, then
   priority, then creation order). On Codex, form a bounded related work set through the
   model-routing contract above. Implement only the delegated leaves. Verify, delete,
   and commit each Bean atomically. Never push. Stop the work set on guidance or an
   owner blocker instead of silently skipping the affected leaf. When no eligible
   leaf remains, pause instead of polling or auto-continuing; an explicit resume may
   restart the run after its state changes. Esc pauses; a hard stop, retry ceiling,
   or deadline bounds the run.
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
