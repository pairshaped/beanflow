---
# beanflow-gh4l
title: Build a Beans-driven autonomous feature delivery workflow
status: draft
type: epic
priority: normal
tags:
    - enhancement
    - needs-triage
    - beans
    - pi
    - agent-workflow
    - automation
    - skills
    - plugins
created_at: 2026-08-16T21:53:16Z
updated_at: 2026-08-16T21:53:16Z
---

# Objective

Build a reusable, host-neutral package named Beanflow whose primary skill carries a feature from requirements discovery through an audited Beans plan, autonomous implementation in an isolated worktree, and a reviewable completion or blocker report. The first host integration targets Pi.

Beans remains the authoritative tracker. Beanflow must not introduce a competing punch list or silently select unrelated repository work.

# Workflow

## 1. Requirements

- Start from a feature idea supplied by the owner.
- Ask focused questions until material product and technical ambiguity is resolved.
- Record intended behavior, non-goals, constraints, risks, and testable acceptance criteria.
- Read repository domain documentation and decisions only when the feature requires them.

## 2. Plan

- Produce an implementation plan that covers behavior, boundaries, dependencies, verification, rollout concerns, and known risks.
- Keep planning behavioral and durable rather than tied to current file paths.
- Obtain owner agreement before publishing the implementation tree.

## 3. Bean tree

- Create one epic container Bean as the hard scope boundary.
- Break the plan into independently committable executable leaf Beans.
- Represent hierarchy through parent relationships and execution order through blocked-by relationships.
- Allow nested grouping Beans, but execute only leaves.
- Keep unrelated Beans outside the tree inaccessible to the runner.

## 4. Audit and review

- Audit every executable leaf for focused scope, sufficient context, explicit acceptance criteria, verification commands, dependencies, and safe autonomy.
- Reject vague, duplicate, oversized, or judgment-dependent leaves.
- Mark executable leaves ready-for-agent only after the audit passes.
- Present the tree, intended order, assumptions, unresolved decisions, and expected verification to the owner.
- Permit further questions and revisions before execution.
- Require a current user message that clearly asks to start before arming a run. Resolve the audited parent from context and ask when more than one parent is plausible.

## 5. Isolated run setup

- Treat the explicit start request as approval to create a branch and worktree for the resolved parent.
- Follow repository-specific branch naming, worktree placement, ignore rules, and setup commands.
- Record the base branch and commit.
- Freeze a manifest of the approved executable descendants. Do not silently include children added later.
- Detect dirty or ambiguous base state and stop unless repository policy or explicit owner direction permits proceeding.
- Store transient run state under `~/.local/state/beanflow/`, with `BEANFLOW_STATE_DIR` as an override.

## 6. Autonomous execution

- Select one ready leaf at a time using dependency order, then priority and stable creation order as tie breakers.
- Move the selected Bean to in-progress and implement only its scope.
- Apply repository testing, formatting, generated-code, and validation rules.
- Diagnose failures before declaring a blocker.
- When the leaf is complete, verify it, delete its Bean, and create one atomic local commit containing implementation, tests, generated artifacts, and Bean deletion.
- Never push automatically.
- If a Bean is genuinely blocked, record concrete evidence and the exact decision or external change required, then continue with independent ready leaves.
- Reconsider blocked leaves after other work changes their prerequisites.
- If a missing decision would materially change product intent, block that leaf instead of guessing.
- Continue across compaction, resume, and agent settlement while eligible scoped work remains.
- Treat an Esc-aborted Pi turn as an immediate pause. Preserve the run so a later plain-language request can resume it.
- Support a hard stop file, retry ceiling, and optional deadline so an unattended run cannot loop forever.

## 7. Completion

- Run parent-level integration verification after all executable children complete.
- If integration work is discovered, create and audit another child rather than hiding untracked work in a final cleanup.
- Delete the parent Bean only when every scoped child is complete and parent verification passes.
- If blockers remain, preserve the parent and blocked leaves.
- Produce a report listing completed Beans and commits, verification evidence, remaining blockers, and precise owner questions.

## 8. Landing

- Keep landing separate from autonomous execution.
- Require explicit owner approval before changing the target branch.
- Follow repository policy: merge the target into the feature branch, resolve conflicts and verify there, fast-forward the target, then remove the clean worktree and merged branch.
- Preserve the branch and worktree when the run stops with blockers or review is pending.

# Architecture

Package the workflow as a host-neutral core with a Pi package for the first integration:

- A concise orchestration skill named `beanflow`.
- An LLM-callable `beanflow` tool. Users interact in plain language instead of memorizing commands.
- Deterministic TypeScript modules for Beans queries, scope manifests, branch and worktree setup, run state, blocker receipts, commit preparation, status, resume, refresh, and landing.
- A Pi extension that uses session, compaction, `agent_end`, and `agent_settled` lifecycle events to restore state and continue a live run.
- Abort detection that pauses continuation when the latest Pi turn ended with the `aborted` stop reason.
- Host-neutral transient state under `~/.local/state/beanflow/`.
- Repository-policy input supplied by the agent after it reads `AGENTS.md`. V1 has no Beanflow configuration file; deterministic operations reject ambiguous or unsafe inputs.

Install the repository directly as a local Pi package. OMP and Codex adapters remain deferred until a concrete need justifies them. Automatic revival after a dead process or service outage is out of scope until the bounded workflow proves useful.

# Safety invariants

- The approved parent tree is the only executable scope.
- New descendants require an explicit manifest refresh.
- Unrelated dirty changes are never staged, reformatted, reverted, or committed.
- One completed leaf produces one reviewable commit.
- Completed leaf deletion is part of the same commit as its implementation.
- Blocked Beans remain present and explain the blocker.
- The runner does not push, land, deploy, or perform external side effects without separate authority.
- Owner stop instructions always win.
- Continuation is bounded and cannot override Esc, the hard stop mechanism, retry limits, or deadlines.

# Initial implementation plan

1. Specify the host-neutral core contract, Pi adapter contract, state machine, state file schema, and failure semantics.
2. Build read-only Beans discovery and parent-tree audit.
3. Build deterministic scope manifest and run status handling.
4. Build branch and worktree setup with repository-policy adapters.
5. Build the single-leaf execution contract and atomic completion commit flow.
6. Build blocker recording, skipping, reevaluation, and final reporting.
7. Add Pi session, compaction, settlement, and abort handling for live-session continuation.
8. Add agent-callable status, resume, and manifest-refresh operations.
9. Add the separately authorized landing and cleanup flow.
10. Package and validate the local Pi package, extension, and `beanflow` skill.
11. Forward-test it on temporary Beans repositories, then use this epic as the first real recursive run.

# Acceptance criteria

- [ ] The requirements-to-plan-to-Bean-tree workflow is documented as one coherent skill.
- [ ] A parent Bean can be audited into a deterministic frozen execution manifest.
- [ ] Starting an approved parent creates a repository-compliant branch and worktree.
- [ ] Only ready executable descendants in the approved manifest can be selected.
- [ ] Each completed leaf is verified, deleted, and committed atomically with its implementation.
- [ ] A blocked leaf is preserved with actionable evidence while independent work continues.
- [ ] The run continues through Pi agent settlement, compaction, and resume while eligible work remains, and Esc pauses it immediately.
- [ ] Hard stop, retry ceiling, and optional deadline controls work.
- [ ] Completion leaves either a fully verified local branch or a report containing only genuine blockers.
- [ ] Landing requires separate approval and follows repository merge and cleanup policy.
- [ ] Tests exercise selection, scope isolation, dependencies, completion, deletion, blockers, retries, stopping, resume, and unrelated dirty changes.
- [ ] The Pi package is successfully used to execute its own audited child Bean tree.

# Out of scope for the first version

- Restarting a dead Pi process or reviving service-outage sessions.
- Automatically choosing work outside the audited parent resolved from the current start request.
- Parallel child implementation.
- Automatic pushing, pull request creation, deployment, or landing.
- Replacing Beans with plugin-owned task records.
- OMP, Codex, or other host adapters.

# Resolved decisions

- Keep the core workflow and state model host-neutral, with Pi as the only V1 adapter.
- Keep the source in this `beanflow` repository and install it directly as a local Pi package. Do not add marketplace machinery.
- Expose one LLM-callable `beanflow` tool. Users work in plain language and do not need to remember commands.
- Treat Esc as pause and preserve resumable state.
- Write blocker evidence to Beans immediately, using a small bookkeeping commit when necessary.
- Have the agent read repository policy and pass explicit values into deterministic operations. Do not add a Beanflow config file in V1.
- Treat three consecutive no-progress attempts on one Bean as a stall by default.
