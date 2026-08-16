---
# beanflow-x3yu
title: Codex wiring and install docs
status: todo
type: task
priority: normal
created_at: 2026-08-16T23:30:57Z
updated_at: 2026-08-16T23:30:57Z
parent: beanflow-s4hl
---

## What to build

Wire the Codex adapter into the user's Codex install: symlink the skill, declare the MCP server in config.toml, register the Stop hook in hooks.json, and add a short install doc to the repo.

## Acceptance criteria

- [ ] The beanflow skill is reachable from ~/.codex/skills/
- [ ] config.toml declares the beanflow MCP server
- [ ] hooks.json registers the Stop hook
- [ ] An install doc records the steps and the fidelity gap

## Verification

- Manual: /mcp lists beanflow, /hooks trusts the hook, a new thread shows the skill

## Out of scope

- The MCP server and hook code
- OMP adapter
