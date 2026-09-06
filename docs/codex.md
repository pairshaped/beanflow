# Codex host adapter

Beanflow runs on Codex through four mechanisms: a shared skill, a custom implementer
profile, an MCP tool, and a Stop continuation hook.

The owner-facing task remains the planner and orchestrator. Choose that task's model
for the difficulty of the epic. GPT-6 Astra at medium reasoning is the recommended
default for demanding planning, but Sol at medium or high, and even Luna at high for
simple work, use the same routing. The parent gathers requirements, agrees the plan
with the owner, creates and audits the Bean tree, and coordinates the run.
When implementation begins, the parent creates one `beanflow-implementer` thread,
which currently pins GPT-5.6 Terra at medium reasoning. The parent sends bounded ordered work sets
of related leaves. The worker verifies, deletes, and commits each Bean separately and
continues through the work set without routine parent round trips. While the worker
runs, the parent keeps its turn active and waits in bounded intervals for an outcome,
question, or blocker. It does not end the turn and assume a background notification
will restart monitoring. If the worker needs stronger judgment, it returns a focused
question to the parent. The parent resolves
it using its current model and sends guidance back to the same implementer. Only
owner decisions return to the user.

The custom profiles affect spawned agents only. They do not switch the model of the
owner-facing task in place.

Record calibration leaves in [`calibration.md`](calibration.md). Compare wall time,
guidance quality, rejected completion claims, and first-pass acceptance before changing
the implementer model or reasoning effort again.

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

The parent audit resolves canonical contracts before delegation. A Bean that creates
a schema or protocol names its fields, variants, validation ownership, and consumer
boundary. A migration split across Beans also names a buildable transition sequence,
including which leaf switches consumers and which removes the old storage or API.
Do not delegate these decisions as implicit implementation details.

Replacement work deletes the old implementation when its last consumer moves. If a
buildable staged migration must retain legacy code, the audited tree names the exact
cleanup Bean and dependencies, and that cleanup blocks final integration or
verification. A parallel writable path or second source of truth is not an acceptable
compatibility strategy. The implementer returns `needs_guidance` rather than leaving
unowned cleanup behind.

- `completed`: every Bean in the work set was separately verified, deleted, and
  committed, and the worktree is clean. The parent checks the commits, required
  verification, implementation, and test assertions before accepting the outcome.
  The implementer runs leaf-specific checks at each leaf, then runs the owning
  formatter and automated static analysis once at the end of the work set. That
  includes Rust Clippy when Rust changed plus TypeScript lint and typecheck when
  TypeScript changed. A summary or a passing test name is not proof. If the gate
  implementer cannot map every acceptance criterion to a concrete assertion or
  observed behavior, the outcome is incomplete. Partial coverage must be called out,
  not promoted to a completed criterion. The map names the exact test file and
  assertion or observed value. Isolation, cleanup, persistence, and idempotency tests
  use adversarial fixtures whose assertions fail when the forbidden behavior occurs;
  convenient differences between instances are not valid isolation. Interaction tests
  assert that required event targets exist before dispatch. A missing target hidden by
  optional chaining is a silent no-op, not passing evidence. Every expected fixture,
  value, variant, or branch is unwrapped with an explicit failure before assertions;
  conditional assertions that can all be skipped are not passing evidence. Repairs
  that separate behaviors also remove old overlapping fixture conditions instead of
  merely adding another case that the overlap can keep green. Uniqueness and
  cross-element relationships are checked at their owning scope; subtree queries do
  not prove document-level identity or reference uniqueness. Atomic and immutable
  storage claims run through the production creation path, not a post-creation repair
  helper. Generated cross-language agreement uses an executable parser fixture, a
  round trip, or one generated source of truth instead of matching handwritten types.
  Replacement claims also identify deleted obsolete paths. Any retained compatibility
  path has an explicit cleanup Bean that depends on its remaining consumers and blocks
  final integration or verification.
  If the gate
  fails, the parent sends the
  concrete failures back to the same implementer as a
  repair of the same work set and does not advance the run. A repair follow-up contains
  at most three independently checkable gaps. If the audit finds more, the parent sends
  ordered batches and re-audits between them so the implementer does not silently drop
  the tail of a long correction list.
- `needs_guidance`: the current Bean needs a specific unresolved technical decision
  between materially different safe choices. The report ends with exactly one
  `GUIDANCE_QUESTION:` line naming the choices and consequences. Earlier work-set
  Beans remain committed. Unfinished criteria, ordinary failing tests, a large repair,
  or work that merely takes more time do not qualify. The parent checks for that line
  before inspecting code. A missing or invalid field gets the immediate response
  `Reassess the outcome. If the next safe action is clear, continue the assigned work.
  Otherwise return one valid GUIDANCE_QUESTION with the choices and consequences.`
  This lets a poorly stated real blocker come back as a valid question instead of
  papering it over. Otherwise the parent
  resolves the focused question and sends guidance back so the worker can finish the
  remaining work set.
- `owner_blocker`: the workflow needs product input, new authority, credentials, or
  an external state change.

The parent does not change model automatically. An Astra, Sol, or future model can
therefore orchestrate the same workflow. The configured implementer remains responsible
for implementation after receiving guidance, and the next ordinary leaf goes to that
same persistent worker. Edit the implementer profile if its preferred model or reasoning
level changes later.

The parent spends its expensive reasoning on planning, decomposition, audits,
guidance, work-set review, and final verification. It does not require a turn
merely to acknowledge each routine implementer commit. Work sets must still be bounded; never
hand the implementer an unresolved epic or unrelated work just to reduce messages.

Repository instructions and Bean verification are read together. If the repository
requires completion metadata and deletion, the implementer records the metadata and
then deletes the Bean before the same leaf commit. If general testing guidance says
to prefer a smaller boundary but an audited Bean explicitly requires a browser,
lifecycle, formatter, or linter check, the explicit verification still runs. That
check must exercise the owning boundary it claims to prove. An ad hoc fixture that
bypasses the application's runtime, production mount, generated assets, styles,
routing, or persistence cannot stand in for application-level evidence.

The implementer thread belongs to one Beanflow run. Close it at completion and do
not carry it into another epic. Replace it only if the thread is unavailable, closed,
attached to the wrong worktree, or accumulated context is clearly reducing
reliability. Never leave two implementation threads active in the same worktree.

## Fidelity gap vs Pi

Codex's `Stop` hook does not expose the turn's stop reason, so the Esc-abort to pause path that Pi has is not available. An Esc-abort interrupts the turn and does not fire `Stop`, so the run simply does not auto-continue that turn; the next `Stop` after a real turn resumes it. Treat Esc-pause as best-effort on Codex.

## Safety

Continuation is bounded by the same core safety controls: hard stop file, retry ceiling, and deadline. The `Stop` hook pauses the run when any bound is exceeded.
