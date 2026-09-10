# ADR 0001: Epic, Milestone, and Task hierarchy

## Status

Accepted

## Context

Beanflow needs a stable delivery model that does not depend on the issue categories or
storage schema of its current tracker. The model must make scope, execution order,
review boundaries, and verification cost explicit.

## Decision

Beanflow uses exactly three hierarchical roles:

```text
Epic
└── Milestone
    └── Task
```

- An **Epic** is the hard scope boundary for one delivery run. It states the complete
  accepted outcome and owns final verification.
- A **Milestone** is a coherent stage inside an Epic. It groups Tasks whose results
  must compose and owns their integration checkpoint.
- A **Task** is the smallest implementation unit. It must produce a meaningful,
  independently committable and reviewable change.

Every Task belongs to one Milestone, and every Milestone belongs to one Epic. A Task
has no child work. Beanflow does not use alternative names for these roles in runtime
state, functions, prompts, reports, or documentation.

Task audit rejects both underspecified work and microscopic chores. An isolated text
edit, mechanical line change, or similarly trivial operation belongs in the Task that
owns the surrounding behavior unless it has an independent outcome, ordering need, or
proof boundary.

### Checkpoints

Each Task has a completion checkpoint:

- Run its exact audited verification.
- Run cheap local proof close to the change, normally focused tests, formatting,
  focused Clippy, scoped lint, and scoped typechecking.
- Commit the implementation while retaining the Task record.
- Perform a distinct skeptical review of the commit and acceptance evidence.
- Repair and repeat the affected checks and review until it passes.
- Accept the Task by deleting its record in a tracker-only commit.

Each Milestone has an integration checkpoint after all of its Tasks are accepted:

- Run the Milestone's specified integration proof.
- Run checks whose actual cost or scope made them inappropriate after every Task,
  normally smoke tests, broad builds, full suites, browser walkthroughs, deployments,
  or external calls.
- Accept the Milestone only when the checkpoint passes.

The Epic has a final checkpoint after all Milestones are accepted. It proves the full
outcome, runs the final broad build and suite, and records remaining limitations or
external evidence. The Epic is accepted only when that checkpoint passes.

Check placement depends on actual cost and proof scope, not the name of a tool. A cheap
focused invocation runs after every Task. An expensive workspace-wide invocation runs
at the nearest Milestone that combines the affected work, or at Epic completion when no
earlier checkpoint owns it.

### Tracker boundary

Beanflow owns this hierarchy. A tracker adapter stores the records using supported
metadata and parent relationships, plus explicit Beanflow role tags when the tracker's
native categories cannot represent the hierarchy. Tracker issue categories do not
define Beanflow semantics. Replacing the tracker must not change the hierarchy,
checkpoint rules, or runtime vocabulary.

The frozen run manifest preserves Epic, Milestone, and Task identities explicitly. It
does not infer a role later from the remaining child records, because accepted records
may be deleted as the run advances.

## Consequences

- Plans and audits must produce meaningful Tasks grouped under explicit Milestones.
- Runtime state and status output can describe the same hierarchy the owner approved.
- Cheap failures are caught at the Task that introduced them.
- Heavy verification is paid at deliberate integration boundaries instead of after
  every Task.
- Tracker-specific issue categories remain an adapter concern.
