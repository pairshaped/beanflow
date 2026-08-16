---
# beanflow-dqlj
title: Beans read-only discovery and parent-tree audit
status: todo
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:32Z
updated_at: 2026-08-16T22:23:32Z
parent: beanflow-0c83
---

## What to build

Read-only Beans discovery and parent-tree audit.

- Parse Bean files (frontmatter and body) under the Beans directory
- Resolve parent and blocked-by relationships into a tree
- Classify each Bean as grouping (container) or executable (leaf)
- Audit each executable leaf against: focused scope, sufficient context, explicit acceptance criteria, verification commands, dependencies, safe autonomy
- Return a structured audit report listing pass/fail per leaf and why

Read-only: never create, modify, or delete Beans.

## Acceptance criteria

- [ ] A fixture Beans directory parses into a correct hierarchy and blocked-by graph
- [ ] Executable leaves are distinguished from grouping Beans
- [ ] A leaf missing acceptance criteria, verification, or a resolvable dependency is flagged
- [ ] No Bean files are modified during a discovery or audit run

## Verification

- `pnpm test` against fixture Bean directories

## Out of scope

- Freezing the manifest (next leaf)
- Mutating Beans
