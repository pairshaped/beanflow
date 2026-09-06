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
`beanflow-implementer` custom agent is available. When the first executable leaf is
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

Treat a new or materially changed implementer profile as unproven. Its first work
set is one leaf. Audit that calibration leaf at the completion gate below before
delegating multiple leaves. Expand later work sets only after the implementer has
shown that it follows the Bean, verification, commit, and reporting contracts.

Give the implementer every Bean id in order plus the absolute worktree path. Beans
must carry the accepted scope and decisions. Include extra handoff context only when
it cannot be discovered safely from the Beans, repository, or run state. The
implementer verifies, deletes, and commits each leaf separately, then continues to
the next delegated leaf without waiting for parent acknowledgement. The parent waits
for the work-set outcome instead of reviewing every routine leaf transition. Keep the
parent turn active while the implementer runs and wait in bounded intervals for its
outcome, focused question, or blocker. Do not end the parent turn and assume a later
notification will resume monitoring. Send later
work sets as follow-up instructions to the existing thread rather than spawning
another agent.

Repository completion metadata and deletion are one lifecycle, not competing
choices. When the repository requires checked acceptance items, a summary, or a
completed status, record them and then follow its instruction to delete completed
Beans before the leaf commit. Generic CLI guidance does not override the owning
repository's tracker convention. Likewise, general advice to prefer cheap test
boundaries does not cancel an explicit verification item in an audited Bean.
Delete an implementation in the leaf that replaces its last use. A staged migration
may retain legacy code only when an audited Bean names the exact cleanup owner and
dependency, and that cleanup blocks final integration or verification. Do not accept
parallel writable implementations or sources of truth. If necessary compatibility
code has no explicit removal Bean, pause and repair the Bean tree before implementation.
Verification evidence must exercise the owning boundary named by the Bean. Reject
an ad hoc fixture when it bypasses application runtime, production mounts, generated
assets, styling, routing, persistence, or any other behavior the check claims to
prove.

Interpret the worker's `BEANFLOW_OUTCOME` as follows:

- `completed`: inspect the reported Bean-to-commit list and verification summary at
  the end of the delegated work set. Before accepting it, confirm the worktree is
  clean; every Bean and its dependency cleanup were deleted in that leaf's reported
  implementation commit; every required verification item ran rather than being
  replaced by a cheaper compile or test; and the implementation and tests actually
  prove the acceptance criteria. At the end of the work set, require one owning-scope
  formatter, Rust Clippy when Rust changed, TypeScript lint and typecheck when
  TypeScript changed, and any equivalent automated static analysis required by the
  repository. These work-set checks need not run after every leaf. Test names and a
  worker summary are evidence leads, not proof. Require a criterion-by-criterion map
  to the exact test files and concrete assertions or observed values that prove it.
  For isolation, cleanup, persistence, and idempotency claims, check that the fixture
  and assertion would visibly fail when the prohibited behavior occurs. Reject friendly
  fixtures that hide cross-instance effects, leaked handlers, lost state, or duplicate
  work. For interaction evidence, confirm every required event target exists before
  dispatch; optional chaining or another silent no-op is not proof that the event ran.
  Apply the same fail-closed rule to every test path: an expected fixture, value,
  variant, or branch must be unwrapped with an explicit failure before assertions.
  Conditional assertions that can all be skipped do not prove the criterion.
  When a repair separates behaviors or ownership paths, confirm the old overlapping
  fixture condition was removed. An added case does not prove separation when the
  original friendly condition can still keep the test green.
  Check uniqueness and cross-element relationships at their owning scope. Subtree
  queries cannot establish document-level identity or reference uniqueness.
  For atomic or immutable storage, inspect the real production creation path; a
  post-creation repair or attachment helper cannot prove the invariant. Generated
  cross-language agreement needs executable parser fixtures, a round trip, or one
  generated source of truth rather than parallel handwritten declarations.
  For replacement work, confirm obsolete code was deleted when its last consumer
  moved. If legacy code remains, verify the reported cleanup Bean names the retained
  path, depends on the remaining consumers, and blocks final integration or
  verification.
  Reject these gaps along with unsupported criteria and partial evidence presented as complete.
  Rerun representative checks
  independently. If any gate fails, reject the outcome and send the concrete failures
  back to the same implementer as a repair of the same work set. Keep each repair
  follow-up to at most three independently checkable gaps. When an audit finds more,
  send ordered repair batches to the same implementer and re-audit between them. This
  bound applies to repair instructions, not to the size of the accepted Bean. Do not select or
  delegate new Beans until the repair passes. Full verification still belongs at the
  parent completion gate.
- `needs_guidance`: first check for exactly one `GUIDANCE_QUESTION:` line. Do not
  inspect the code or spend parent reasoning on the report before this mechanical
  check. If the line is absent, immediately tell the same implementer
  `Reassess the outcome. If the next safe action is clear, continue the assigned work.
  Otherwise return one valid GUIDANCE_QUESTION with the choices and consequences.`
  This bounce asks the implementer to distinguish a progress stop from a poorly stated
  real question instead of assuming either one. A valid question describes
  a focused unresolved decision with materially different choices and consequences.
  Unfinished criteria, ordinary failing tests, a large repair, or work that merely
  takes more time do not qualify. If the field is present but does not meet that bar,
  use the same immediate reply.
  Otherwise resolve the implementer's focused question in the parent task, then send
  the decision and rationale back to the same implementer so it can finish
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
same role instructions using GPT-5.6 Luna at extra-high reasoning and reuse it for the
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
   duplicate, oversized, or judgment-dependent leaves. A leaf that introduces a
   canonical schema or protocol must state its fields, variants, validation owners,
   and consumer boundary instead of asking the implementer to invent them. When a
   migration spans leaves, every intermediate leaf must leave the repository
   buildable and the Beans must name which leaf switches consumers and removes the
   old boundary. Mark ready-for-agent only
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
