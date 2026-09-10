# Codex host adapter

Beanflow runs on Codex through three mechanisms: a shared skill, an MCP tool, and a
Stop continuation hook.

The owner-facing chat carries the run from requirements through landing. It agrees the
plan with the owner, creates and audits the Bean tree, implements one selected Task at
a time, verifies and commits it, performs a distinct skeptical review, repairs any
findings, and accepts the Task by deleting it in a tracker-only commit. Tasks belong to
Milestones, and Milestones belong to the Epic.

The MCP tool bootstraps a run from a clean isolated feature worktree after the Bean tree
is audited. A start request names the epic and base branch, for example:
`start epic beanflow-1234 with base branch main`.

Run state belongs to the isolated worktree and is stored under that worktree's private
Git administrative directory. It never appears in `git status` and cannot be committed.
Separate worktrees can have active runs at the same time. When the MCP server is rooted
in another checkout, name the intended worktree in start, status, and resume requests.

## Install

1. Build the package with `pnpm build`. This compiles `src/codex/` to `dist/codex/`.
2. Symlink the shared skill into `~/.codex/skills/`:

   ```bash
   ln -s /path/to/beanflow/skills/beanflow ~/.codex/skills/beanflow
   ```

3. Add the MCP server to `~/.codex/config.toml`:

   ```toml
   non_prefixed_mcp_tool_names = { server_names = ["beanflow"] }

   [mcp_servers.beanflow]
   command = "node"
   args = ["/path/to/beanflow/dist/codex/mcp-server.js"]
   startup_timeout_sec = 30
   ```

4. Add a `Stop` entry to `~/.codex/hooks.json`:

   ```json
   "Stop": [
     { "hooks": [ { "type": "command", "command": "node /path/to/beanflow/dist/codex/stop-hook.js", "timeout": 30 } ] }
   ]
   ```

5. Trust the hook with `/hooks` and start a new Codex task so the configuration is
   loaded.

## Run loop

The Stop hook keeps an armed run moving while an eligible Task exists. Its instruction
names the selected Task and requires the current chat to finish these checkpoints in
order:

1. Implement only the selected Task.
2. Run its exact audited verification plus the cheap local proof: focused
   owning-boundary tests, formatting, and reliably scoped affected-language static
   analysis.
3. Defer heavy checks, normally smoke tests, full suites, broad builds, browser
   walkthroughs, deployments, and external calls, to the owning Milestone checkpoint
   or final Epic completion. Run one earlier only when the current Task requires it
   or its behavior cannot be proved cheaply.
4. Commit the implementation while leaving the Bean intact.
5. Review the committed diff and criterion proof separately from implementation.
6. Repair findings, rerun affected checks, and repeat review until the Task passes.
7. Delete the accepted Bean and commit only tracker and dependency cleanup.
8. If the Milestone is complete, run and accept its checkpoint. Otherwise select its
   next eligible Task.

The Epic completion gate runs the final broad build and suite. This avoids paying for
the heaviest checks after every Task without weakening the final proof.

The run returns control only when it is complete, genuinely blocked, explicitly paused
or stopped, or waiting for an owner-only decision. A failing test, a large repair, or
work that merely takes more time is not an owner blocker.

## Acceptance boundary

Bean deletion records acceptance. The implementation commit must retain the Task.
After review passes, delete the Bean and commit only the resulting tracker and
dependency changes. Do not mix implementation repairs into that commit.

External mutation is a separate acceptance boundary whenever possible. An
implementation Task proves the change without deploying, sending, publishing, or
altering a provider. A later rollout Task performs the specifically authorized mutation.
If an external mutation is genuinely required to prove an implementation Task, its Bean
must name the exact target, authorization, evidence, and recovery boundary.

## Verification levels

Task verification is focused but not optional. Every Task runs its
published commands and cheap local proof. That means focused owning-boundary tests,
formatting, and scoped lint, typecheck, or Clippy where the repository supports a
reliable focused invocation. Classify checks by actual cost, not by tool name. If one
of those tools only runs as an expensive workspace-wide gate, place it at the owning
Milestone checkpoint or the Epic completion gate. Smoke tests, full suites, broad builds, browser
walkthroughs, deployments, and external calls are normally heavy.

Beans should not be microscopic. Each Task must deliver a meaningful,
independently reviewable behavior or boundary. Fold isolated text edits and single
mechanical lines into the Bean that owns the surrounding behavior unless they are
genuinely independent and need their own proof or ordering.

Epic verification is broad. It proves that the accepted Tasks compose into the Epic
outcome and runs the repository's final build, broad suite, and any integration or
rollout checks named by the audited tree.

Never run overlapping formatter, build, test, linter, typecheck, or static-analysis
commands concurrently in one worktree. Use the result of the command already running.

## Landing

Landing always requires explicit owner approval. Merge the target branch into the
feature branch first, resolve conflicts and run verification there, then fast-forward
the target. Confirm the worktree is clean before removing it and delete the merged
branch afterward.
