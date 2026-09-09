---
# beanflow-1znd
title: Re-select when manifest refresh blocks the active leaf
status: todo
type: bug
priority: high
created_at: 2026-09-09T05:58:07Z
updated_at: 2026-09-09T05:58:07Z
---

## Problem

Refreshing an active Beanflow manifest preserves the current selected leaf even when a newly admitted Bean now blocks it. In run sports-l5f1-1788624375436, sports-oxuz was added as a blocker of selected sports-qo8p; refresh froze both leaves but continued to report sports-qo8p selected with zero blockers. Resume also retained the ineligible selection.

## Acceptance criteria

- [ ] Refresh revalidates the selected leaf against the refreshed dependency graph.
- [ ] If the selected leaf becomes blocked, Beanflow selects the next ready leaf using normal ordering.
- [ ] Status reports the refreshed blocker count and selected Bean accurately.
- [ ] Tests cover adding a new blocker to the selected leaf during an active run.

## Out of scope

Changing normal leaf ordering or automatically implementing newly admitted Beans.
