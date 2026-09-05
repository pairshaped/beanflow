# Codex host adapter

Beanflow runs on Codex through four mechanisms: a shared skill, a custom implementer
profile, an MCP tool, and a Stop continuation hook.

The owner-facing task remains the planner and orchestrator. Choose that task's model
for the difficulty of the epic. GPT-6 Astra at medium reasoning is the recommended
default for demanding planning, but Sol at medium or high, and even Luna at high for
simple work, use the same routing. The parent gathers requirements, agrees the plan
with the owner, creates and audits the Bean tree, and coordinates the run.
When implementation begins, the parent creates one `beanflow-implementer` thread,
which pins GPT-5.6 Luna at medium reasoning. The parent sends bounded ordered work sets
of related leaves. The worker verifies, deletes, and commits each Bean separately and
continues through the work set without routine parent round trips. If the worker needs
stronger judgment, it returns a focused question to the parent. The parent resolves
it using its current model and sends guidance back to the same implementer. Only
owner decisions return to the user.

The custom profiles affect spawned agents only. They do not switch the model of the
owner-facing task in place.

The MCP tool can bootstrap a run from the current clean feature worktree after
the Bean tree is audited. A start request names the epic and base branch, for
example: `start epic beanflow-1234 with base branch main`.

Run state belongs to the isolated worktree and is stored under that worktree's
private Git administrative directory. It never appears in `git status` and
cannot be committed. Separate worktrees can have active runs at the same time.
When the MCP server is rooted in another checkout, name the intended worktree
in start, status, and resume requests.

## Install

1. Build the package: `pnpm build` (compiles `src/codex/` to `dist/codex/`).
2. Skill: symlink the shared skill into `~/.codex/skills/`:

   ```bash
   ln -s /path/to/beanflow/skills/beanflow ~/.codex/skills/beanflow
   ```

3. Agent: copy the implementer profile into `~/.codex/agents/`:

   ```bash
   mkdir -p ~/.codex/agents
   cp /path/to/beanflow/codex/agents/beanflow-implementer.toml ~/.codex/agents/beanflow-implementer.toml
   ```

   Keep this as a regular file. Codex custom-agent loading does not currently
   follow symlinked profile files reliably. Copy it again after changing the
   repository-owned profile.

4. Tool: add an MCP server to `~/.codex/config.toml`:

   ```toml
   non_prefixed_mcp_tool_names = { server_names = ["beanflow"] }

   [mcp_servers.beanflow]
   command = "node"
   args = ["/path/to/beanflow/dist/codex/mcp-server.js"]
   startup_timeout_sec = 30
   ```

5. Continuation: add a `Stop` entry to `~/.codex/hooks.json`:

   ```json
   "Stop": [
     { "hooks": [ { "type": "command", "command": "node /path/to/beanflow/dist/codex/stop-hook.js", "timeout": 30 } ] }
   ]
   ```

6. Trust the hook (`/hooks`) and start a new task so the MCP tool and custom agents
   load.

## Model routing

Start a full Beanflow from the owner-facing model you want to use for requirements
and architecture. Use Astra at medium for demanding epics, Sol at medium or high
when that is sufficient, or Luna at high for simple work. The parent task performs
planning directly instead of spawning another planner.

After the owner approves the audited tree and starts the run, the parent creates one
implementer thread when the first leaf is ready. It retains that thread for the
entire implementation phase and delegates a bounded ordered work set with a compact
handoff: the Bean ids and worktree path. A work set contains related siblings or a short
dependency chain where each later Bean is already eligible or becomes eligible only
through earlier work in the set. The Beans contain the accepted scope, so the full
planning conversation is not copied into implementation turns. Later work sets are
follow-up instructions to the same thread. The implementer returns one of three
stable outcomes:

The first work set after installing or materially changing the implementer profile
contains one leaf. This is a calibration gate, not permanent micromanagement. The
parent checks that leaf strictly before trusting the profile with multi-leaf work
sets.

- `completed`: every Bean in the work set was separately verified, deleted, and
  committed, and the worktree is clean. The parent checks the commits, required
  verification, implementation, and test assertions before accepting the outcome.
  The implementer runs leaf-specific checks at each leaf, then runs the owning
  formatter and automated static analysis once at the end of the work set. That
  includes Rust Clippy when Rust changed plus TypeScript lint and typecheck when
  TypeScript changed. A summary or a passing test name is not proof. If the gate
  fails, the parent sends the concrete failures back to the same implementer as a
  repair of the same work set and does not advance the run.
- `needs_guidance`: the current Bean needs stronger technical judgment. Earlier
  work-set Beans remain committed. The parent resolves the focused question and sends
  guidance back so the worker can finish the remaining work set.
- `owner_blocker`: the workflow needs product input, new authority, credentials, or
  an external state change.

The parent does not change model automatically. An Astra, Sol, or future model can
therefore orchestrate the same workflow. Luna remains responsible for implementation
after receiving guidance, and the next ordinary leaf also goes to Luna. Edit the
implementer profile if its preferred model or reasoning level changes later.

The parent spends its expensive reasoning on planning, decomposition, audits,
guidance, work-set review, and final verification. It does not require a turn
merely to acknowledge each routine Luna commit. Work sets must still be bounded; never
hand the implementer an unresolved epic or unrelated work just to reduce messages.

The implementer thread belongs to one Beanflow run. Close it at completion and do
not carry it into another epic. Replace it only if the thread is unavailable, closed,
attached to the wrong worktree, or accumulated context is clearly reducing
reliability. Never leave two implementation threads active in the same worktree.

## Fidelity gap vs Pi

Codex's `Stop` hook does not expose the turn's stop reason, so the Esc-abort to pause path that Pi has is not available. An Esc-abort interrupts the turn and does not fire `Stop`, so the run simply does not auto-continue that turn; the next `Stop` after a real turn resumes it. Treat Esc-pause as best-effort on Codex.

## Safety

Continuation is bounded by the same core safety controls: hard stop file, retry ceiling, and deadline. The `Stop` hook pauses the run when any bound is exceeded.
