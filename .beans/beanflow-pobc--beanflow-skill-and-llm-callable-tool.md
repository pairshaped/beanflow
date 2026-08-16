---
# beanflow-pobc
title: beanflow skill and LLM-callable tool
status: todo
type: task
priority: normal
tags:
    - ready-for-agent
created_at: 2026-08-16T22:23:33Z
updated_at: 2026-08-16T22:23:33Z
parent: beanflow-obm9
---

## What to build

The beanflow orchestration skill and one LLM-callable tool.

- One LLM-callable beanflow tool; users interact in plain language and never memorize commands
- The tool exposes status, resume, manifest-refresh, and landing operations
- A concise orchestration skill that carries a feature from requirements discovery through plan, audited Bean tree, isolated run, and completion or blocker report

## Acceptance criteria

- [ ] Plain-language requests map to the correct operation without slash-command memorization
- [ ] The skill is coherent end-to-end and matches the workflow in the epic
- [ ] Status, resume, refresh, and landing are each reachable through the tool

## Verification

- `pnpm test` on the tool contract; manual review of the skill's step-by-step behavior

## Out of scope

- OMP and Codex adapters
- A Beanflow config file
