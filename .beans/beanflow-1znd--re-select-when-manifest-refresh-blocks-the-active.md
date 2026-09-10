---
# beanflow-1znd
title: Re-select when manifest refresh blocks the active Task
status: todo
type: bug
priority: high
created_at: 2026-09-09T05:58:07Z
updated_at: 2026-09-10T16:10:34Z
---

## Problem

Refreshing an active Beanflow manifest preserves the current selected Task even when a newly admitted Bean now blocks it. In run sports-l5f1-1788624375436, sports-oxuz was added as a blocker of selected sports-qo8p; refresh froze both Tasks but continued to report sports-qo8p selected with zero blockers. Resume also retained the ineligible selection.

## Acceptance criteria

- [ ] Refresh revalidates the selected Task against the refreshed dependency graph.
- [ ] If the selected Task becomes blocked, Beanflow selects the next ready Task using normal ordering.
- [ ] Status reports the refreshed blocker count and selected Bean accurately.
- [ ] Tests cover adding a new blocker to the selected Task during an active run.

## Out of scope

Changing normal Task ordering or automatically implementing newly admitted Beans.
