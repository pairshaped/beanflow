---
# beanflow-ezn8
title: Adopt Epic, Milestone, and Task terminology
status: in-progress
type: task
priority: normal
tags:
    - beanflow-task
created_at: 2026-09-10T15:57:54Z
updated_at: 2026-09-10T16:12:41Z
parent: beanflow-fyu6
---

## What to build

Use Epic, Milestone, and Task as Beanflow’s only workflow roles across runtime state, selection, reporting, documentation, and tests. Define checkpoint policy in an ADR.

## Acceptance criteria

- [x] Runtime code and persisted state use Epic, Milestone, and Task terminology.
- [x] The skill and Codex documentation define Task, Milestone, and Epic checkpoints.
- [x] An ADR records the taxonomy, granularity rule, and verification cost policy.
- [x] Existing active Beans and run state are checked for stale nomenclature.

## Verification

Run the build, typecheck, full test suite, skill validator, and a repository search for retired terms.

## Out of scope

Do not change the Beans CLI built-in issue-type vocabulary.

## Summary of Changes

Replaced the two-role container/work model with explicit Epic, Milestone, and Task terminology across runtime state, selection, reporting, documentation, and tests. Added the architecture decision and checkpoint policy, removed the retired Codex profile and calibration material, updated active Beanflow Beans, and bumped run-state schema to version 2. No active run state existed to migrate.
