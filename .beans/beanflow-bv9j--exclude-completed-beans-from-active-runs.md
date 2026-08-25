---
# beanflow-bv9j
title: Exclude completed Beans from active runs
status: completed
type: bug
priority: normal
created_at: 2026-08-25T14:46:33Z
updated_at: 2026-08-25T14:47:28Z
---

## What to build

Prevent completed and scrapped leaf Beans from being selected as executable work. Completed in-scope dependencies must count as satisfied, while a scrapped dependency must stop manifest creation with a clear error. Existing frozen runs must also skip Beans that later become terminal.

## Acceptance criteria

- [x] New manifests omit completed and scrapped leaves.
- [x] Completed blockers satisfy dependencies for remaining leaves.
- [x] Scrapped blockers produce a clear manifest error.
- [x] Existing manifests skip Beans whose current status is completed or scrapped.

## Verification

Run focused manifest, selection, continuation, and MCP tests, then the full Beanflow suite and build.

## Out of scope

Changing Beans status semantics or deleting completed Bean files.

## Summary of Changes

Beanflow manifests now omit completed and scrapped leaves, treat completed dependencies as satisfied, and reject scrapped blockers clearly. Selection and continuation also skip terminal Beans in already-frozen manifests.
