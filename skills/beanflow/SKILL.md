---
name: beanflow
description: >-
  Carry a feature through a bounded, audited delivery run: requirements, an audited
  Bean tree, implementation and per-Bean review in an isolated worktree, and a
  reviewable completion or blocker report. Use when the user wants to start, resume,
  check, or land a Beanflow run.
---

# Beanflow

Carry a feature through a bounded, audited delivery run. Beans is the authoritative
tracker; Beanflow never introduces a competing punch list or selects unrelated work.

Keep the whole run in the owner-facing chat. That chat owns requirements, architecture,
planning, Bean creation and audit, implementation, review, repair, verification,
owner communication, and the final report. Beanflow uses exactly three roles: Epic,
Milestone, and Task. Work on one selected Task at a time so its scope and evidence stay
legible.

## Workflow

1. **Requirements**: Ask focused questions until product and technical ambiguity is
   resolved. Record behavior, non-goals, constraints, risks, and testable acceptance
   criteria.
2. **Plan**: Produce an implementation plan covering behavior, boundaries,
   dependencies, verification, rollout, and risks. Keep it behavioral rather than tied
   to file paths. Get owner agreement before publishing the tree.
3. **Bean tree**: Create one Epic as the hard scope boundary. Divide it into coherent
   Milestones, then break each Milestone into independently committable Tasks. Parent
   means hierarchy; blocked-by means order. Implement Tasks, verify Milestones, and
   keep unrelated Beans out of scope. Each Task must deliver a meaningful,
   independently reviewable behavior or boundary. Do not create Tasks for isolated
   text edits, single mechanical lines,
   or other changes that are cheaper to implement and prove as part of their owning
   behavior. Split work when an independently provable boundary avoids repeated
   expensive builds, deployments, external calls, model or corpus processing, or broad
   review. Do not split a cohesive workflow merely to make smaller Beans.
4. **Audit**: Audit every Task for focused scope, sufficient context,
   testable acceptance criteria, exact verification, dependencies, and safe autonomy.
   Reject vague, duplicate, oversized, microscopic, or judgment-dependent Tasks. Each Task must use
   the exact `## What to build`, `## Acceptance criteria`, `## Verification`, and
   `## Out of scope` headings; acceptance criteria must be checkboxes. Present the tree
   and execution order to the owner.
5. **Isolated run setup**: On an explicit start request, create a branch and worktree,
   or adopt the clean isolated worktree the owner already requested. Use the `beanflow`
   tool with the audited epic id and base branch. It records the absolute worktree path
   and base commit, freezes the audited manifest in private Git metadata, and selects
   the first ready Task. When the Codex server is rooted in another checkout, include
   `in worktree /absolute/path` for start, status, and resume requests. Stop on a dirty
   or ambiguous worktree.
6. **Task execution**: For each selected Task, complete the implementation,
   verification, commit, review, repair, and acceptance checkpoints below before
   selecting another Task. When every Task in a Milestone is accepted, run and accept
   that Milestone's checkpoint before starting the next Milestone. Never push. Pause
   instead of polling when no eligible Task remains. Esc pauses; a hard stop, retry
   ceiling, or deadline bounds the run.
7. **Epic completion**: After every Milestone is accepted, run the Epic checkpoint, then report completed Beans and
   commits, verification evidence, remaining blockers, and owner questions. Delete the
   Epic only when every Milestone is complete and final verification passes.
8. **Landing**: Keep landing separate and require explicit approval. Merge the target
   into the feature branch, resolve and verify there, fast-forward the target, then
   remove the clean worktree and branch.

## Per-Bean checkpoints

### 1. Implement

Implement only the selected task. Keep its accepted design and scope authoritative.
If repository evidence reveals a required behavior, defect fix, cleanup, or safety
change outside the frozen scope, admit it only when an existing acceptance criterion
cannot otherwise be met or the accepted outcome would ship a correctness or safety
defect. Add and audit the necessary Bean, connect it to final verification, and refresh
the manifest. Record optional polish, speculative design, generalized cleanup, and
merely useful improvements as follow-up work.

Delete an implementation when the task replaces its last use. A staged migration may
retain compatibility code only when an audited Bean names the exact cleanup owner and
dependency, and that cleanup blocks final integration or verification. Do not accept
parallel writable implementations or sources of truth.

Reusable composition, projections, loaders, and renderers belong at their shared or
domain boundary, not under the first route that consumes them. A route must not import
another route module's shell, loader, or renderer to obtain shared behavior unless the
audited design explicitly makes that route the owner.

### 2. Verify

Run every command in the task's `## Verification` section. Once published, an explicit
verification command is mandatory. Do not substitute a compile, typecheck, test name,
or narrower check for a required test, browser check, lifecycle check, formatter, or
linter.

Every Task checkpoint runs the cheap local proof: focused tests at the
owning boundary, formatting, and the affected-language static analysis that can be
scoped reliably to the changed package, crate, module, or targets. This normally
includes focused Rust Clippy plus scoped TypeScript lint and typecheck when those
invocations exist. Use the repository's equivalent checks for other languages. Run
these checks at the Bean where they can catch a defect close to its cause.

Classify a check by its actual cost and scope, not its tool name. Formatting, focused
tests, scoped lint and typecheck, and focused Clippy are normally cheap. Smoke tests,
full suites, broad application builds, browser walkthroughs, deployments, and external
calls are normally heavy. Do not turn a nominally cheap check into a repeated
workspace-wide gate. When a check is heavy in the owning repository, put it at the
owning Milestone checkpoint or at the Epic completion gate. Run a heavy check on a
Task only when that Task explicitly requires it or its behavior cannot be proved at a
smaller boundary. The Epic completion gate owns the final broad build and suite.

Never launch the same or overlapping formatter, build, test, linter, typecheck, or
static-analysis command concurrently in one worktree. Wait for the running command and
use its result, especially for Cargo and Clippy processes sharing one target directory.

Verification must exercise the owning boundary named by the Bean. Reject an ad hoc
fixture when it bypasses application runtime, production mounts, generated assets,
styling, routing, persistence, or another behavior the check claims to prove.

### 3. Commit

Commit the implementation and tests while leaving the Bean intact. The Bean's deletion
is the acceptance marker, not part of the implementation commit. Confirm the worktree
is clean after the commit and retain the commit id for review.

### 4. Review

Perform a distinct, skeptical review of the committed task before accepting it. Read
the diff and affected owning boundary, not just the commit message or test summary.
Map every acceptance criterion to the exact test file and concrete assertion or
observed value that proves it. Test names and broad suite totals are leads, not proof.
Rerun representative checks independently from the implementation pass.

Check these failure modes when relevant:

- Fixtures and assertions for isolation, cleanup, persistence, and idempotency must
  visibly fail when the prohibited behavior occurs. Friendly fixtures must not hide
  cross-instance effects, leaked handlers, lost state, or duplicate work.
- Every expected fixture, value, variant, branch, and interaction target must fail
  closed when absent. Optional chaining, conditional assertions, or early returns that
  can silently skip the proof do not satisfy a criterion.
- Server-rendered markup checks must distinguish literal elements from escaped markup
  text. Pre-rendered fragments must cross an explicit reviewed raw or trusted boundary.
- Document-level uniqueness and cross-element relationships require document-level
  checks. A subtree query cannot prove them.
- Atomic or immutable storage must be proved through the real production creation path,
  not a post-creation repair or attachment helper.
- Generated cross-language agreement requires an executable parser fixture, round trip,
  or one generated source of truth rather than parallel handwritten declarations.
- External-provider integrations require the current first-party contract for URLs,
  mount placement, required classes or data attributes, callbacks, and remount
  behavior. A simulated loader event can prove the application's state transition but
  cannot prove an invented provider contract. Also verify the host framework's real
  mount, update, navigation, and unmount path.
- Replacement work requires tracing the outgoing production path. Check authentication
  controls, alerts, metadata, accessibility, responsive controls, scripts, and
  lifecycle effects when relevant. Preserve each behavior or cite accepted scope that
  explicitly removes it. A later Bean with a related title is not evidence of removal.

Do not classify a failure as baseline from its count, age, or broad scope label. Rerun
every failure that names a changed route, replaced renderer, migrated workflow, shared
shell, or other touched boundary. Treat it as a task regression unless the same failure
reproduces at the recorded base commit or concrete evidence traces it to unchanged
code.

### 5. Repair and re-review

If review finds a defect or proof gap, keep the Bean open, repair the current task, run
the affected verification again, commit the repair, and repeat the review checkpoint.
Inspect the delta from the rejected commit first and map each finding to a meaningful
implementation or assertion change. When a repair separates behaviors or ownership
paths, remove the old overlapping fixture condition that masked the distinction. Do
not select another Bean until the current task passes review.

Ask the owner only when progress genuinely requires product input, new authority,
credentials, or an external state change. A failing test, large repair, or work that
merely takes more time is not an owner blocker. If an answer changes accepted scope,
revise and re-audit the affected Bean and refresh the frozen manifest before resuming.

### 6. Accept

After the task passes review, delete its Bean and commit only the resulting tracker and
dependency cleanup. Confirm that acceptance commit contains no implementation changes.
Then inspect build-cache disk use with the repository-owned status command when one
exists. Unless the repository defines another threshold, run its cleanup command only
when the current worktree's cache is at least 10 GiB and the filesystem has less than
20 GiB free. Never clean while verification is running, and never manually delete build
or generated directories when the repository owns a safe cleanup command.

Select the next ready task by dependency order, then priority, then creation order.
Continue until the run is complete, genuinely blocked, explicitly paused or stopped by
the owner, or waiting for an owner-only decision.

## Operations

Use the `beanflow` tool for start, status, resume, manifest-refresh, and landing.
Starting requires the audited epic Bean id and base branch. Users interact in plain
language and do not need to memorize commands.
