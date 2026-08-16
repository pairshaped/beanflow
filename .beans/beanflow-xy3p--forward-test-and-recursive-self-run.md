---
# beanflow-xy3p
title: Forward-test and recursive self-run
status: todo
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:33Z
updated_at: 2026-08-16T22:23:33Z
parent: beanflow-fyu6
---

## What to build

Forward-test Beanflow, then run it on itself.

- Forward-test on temporary Beans repositories
- After forward-tests pass, use this epic as the first real recursive run

## Acceptance criteria

- [ ] Forward-tests pass on temporary Beans repositories
- [ ] The Pi package executes its own audited child Bean tree

## Verification

- Forward-test runs on temp repos; observed recursive self-run

## Out of scope

- OMP and Codex adapters
