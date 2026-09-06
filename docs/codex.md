# Codex host adapter

Beanflow runs on Codex through four mechanisms: a shared skill, a custom implementer
profile, an MCP tool, and a Stop continuation hook.

The owner-facing task remains the planner and orchestrator. Choose that task's model
for the difficulty of the epic. GPT-6 Astra at medium reasoning is the recommended
default for demanding planning, but Sol at medium or high, and even Luna at high for
simple work, use the same routing. The parent gathers requirements, agrees the plan
with the owner, creates and audits the Bean tree, and coordinates the run.
For each executable leaf, the parent creates a fresh `beanflow-implementer` thread,
which currently pins GPT-5.6 Sol at low reasoning. The worker verifies, deletes, and
commits that Bean. The same thread handles guidance and repair loops for its leaf, then
is retired after the parent accepts the result. While the worker
runs, the parent keeps its turn active and waits in bounded intervals for an outcome,
question, or blocker. It does not end the turn and assume a background notification
will restart monitoring. Interim owner questions and design decisions are answered in
commentary while the wait loop remains active. Before sending any final response, the
parent inspects the agent tree, confirms the implementer is terminal, and reviews a
completed outcome in that same turn. If the worker needs stronger judgment, it returns a focused
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

After the owner approves the audited tree and starts the run, the parent creates a
fresh implementer thread for the selected leaf with a compact handoff: the Bean id and
worktree path. The Bean contains the accepted scope, so the full planning conversation
is not copied into implementation turns. Guidance and rejected-completion repairs go
back to that leaf's thread. After acceptance, the parent confirms it is no longer
running and creates a fresh thread for the next leaf. This deliberately gives up
cross-leaf conversational context so repair history and compaction loss do not leak
between self-contained Beans. The implementer returns one of three stable outcomes:

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

- `completed`: the Bean was verified, deleted, and committed, and the worktree is
  clean. The parent checks the commit, required
  verification, implementation, and test assertions before accepting the outcome.
  The implementer runs the owning formatter and automated static analysis for the leaf. That
  includes Rust Clippy when Rust changed plus TypeScript lint and typecheck when
  TypeScript changed. It waits for an existing verification command instead of
  launching duplicate or overlapping formatters, builds, tests, linters, typechecks,
  Cargo, or Clippy processes in the same worktree. A summary or a passing test name is not proof. If the gate
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
  Suite failures are not baseline merely because the count looks familiar or the test
  appears old. The parent independently reruns every failure that names a changed
  route, replaced renderer, migrated workflow, shared shell, or other touched
  boundary. The failure remains a leaf regression unless it reproduces at the run's
  recorded base commit or concrete evidence traces it to unchanged code. A later Bean
  that owns new behavior does not excuse behavior removed by the current migration.
  External-provider work is checked against current first-party documentation or the
  shipped provider contract. Tests assert exact URLs, DOM placement, required classes
  and data attributes, callbacks, and remount behavior. Simulated script events may
  prove the application's lifecycle, but invented provider DOM or callbacks are not
  evidence that the integration works. Any live provider behavior that cannot be
  checked without credentials or a real account stays explicit in the completion
  report. If an application framework composes the provider, the production parent
  mount, update, navigation, and unmount path is a separate required boundary. A direct
  component test does not prove that integration.
  Reusable composition, projections, loaders, and renderers live at the shared or
  domain boundary that owns them. A consumer route does not become that owner merely
  because it shipped first, and one route should not import another route's shell,
  loader, or renderer as a shared API.
  Server-rendered markup tests distinguish literal elements from escaped markup text.
  Substring matches inside `&lt;...&gt;` are false positives. Parse or isolate the element
  boundary, reject escaped component markup, and use the repository's explicit reviewed
  raw/trusted boundary when composing pre-rendered fragments.
  Replacement claims also identify deleted obsolete paths. Before accepting a replaced
  route, renderer, shell, workflow, or shared boundary, the parent traces the outgoing
  production path and inventories user-visible and cross-cutting behavior. Relevant
  checks include authentication controls, alerts, metadata, accessibility, responsive
  controls, scripts, and lifecycle effects. Every behavior is preserved with focused
  evidence or explicitly removed by accepted scope. A later Bean with a related title
  is not permission to remove it. Any retained compatibility path has an explicit
  cleanup Bean that depends on its remaining consumers and blocks final integration or
  verification.
  If the gate
  fails, the parent sends the
  concrete failures back to the same implementer as a
  repair of the same leaf and does not advance the run. A repair follow-up contains
  at most three independently checkable gaps. If the audit finds more, the parent sends
  ordered batches and re-audits between them so the implementer does not silently drop
  the tail of a long correction list. Record the rejected commit. On the next completion
  claim, first inspect its delta to the amended commit and map every requested repair to
  a meaningful code or test change. If a requested category has no relevant delta,
  reject immediately instead of repeating the full review. Broad suite totals do not
  satisfy this repair-delta gate.
- `needs_guidance`: the current Bean needs a specific unresolved technical decision
  between materially different safe choices. The report ends with exactly one
  `GUIDANCE_QUESTION:` line naming the choices and consequences. Unfinished criteria,
  ordinary failing tests, a large repair,
  or work that merely takes more time do not qualify. The parent checks for that line
  before inspecting code. A missing or invalid field gets the immediate response
  `Reassess the outcome. If the next safe action is clear, continue the assigned work.
  Otherwise return one valid GUIDANCE_QUESTION with the choices and consequences.`
  This lets a poorly stated real blocker come back as a valid question instead of
  papering it over. Otherwise the parent
  resolves the focused question and sends guidance back so the worker can finish the
  current leaf. The answer becomes accepted leaf context. A repeated version of the
  same question needs new contradictory evidence; otherwise the parent restates the
  decision, requires continuation, and records a redundant guidance bounce.
- `owner_blocker`: the workflow needs product input, new authority, credentials, or
  an external state change.

The parent does not change model automatically. An Astra, Sol, or future model can
therefore orchestrate the same workflow. The configured implementer remains responsible
for its leaf after receiving guidance, and the next ordinary leaf gets a fresh worker
from the current profile. Edit the implementer profile if its preferred model or
reasoning level changes later.

The parent spends its expensive reasoning on planning, decomposition, audits,
guidance, leaf review, and final verification. It does not require a turn
merely to acknowledge each routine implementer commit. Never hand the implementer an
unresolved epic or more than one leaf just to reduce messages.

Repository instructions and Bean verification are read together. If the repository
requires completion metadata and deletion, the implementer records the metadata and
then deletes the Bean before the same leaf commit. If general testing guidance says
to prefer a smaller boundary but an audited Bean explicitly requires a browser,
lifecycle, formatter, or linter check, the explicit verification still runs. That
check must exercise the owning boundary it claims to prove. An ad hoc fixture that
bypasses the application's runtime, production mount, generated assets, styles,
routing, or persistence cannot stand in for application-level evidence.

The implementer thread belongs to one leaf. Reuse it for that leaf's guidance and
repair loops, then retire it after acceptance. Never carry it into another leaf or
epic, and never leave two implementation threads active in the same worktree.

Between accepted leaves, inspect build-cache disk use through the repository-owned
status command when one exists. Unless the repository defines another threshold, run
its safe cleanup command when the cache is at least 10 GiB or the filesystem has less
than 20 percent free. Never clean while build, test, formatting, lint, typecheck, or
static-analysis work is running. This avoids unbounded disk growth without paying for
a full rebuild after every small leaf.

## Fidelity gap vs Pi

Codex's `Stop` hook does not expose the turn's stop reason, so the Esc-abort to pause path that Pi has is not available. An Esc-abort interrupts the turn and does not fire `Stop`, so the run simply does not auto-continue that turn; the next `Stop` after a real turn resumes it. Treat Esc-pause as best-effort on Codex.

## Safety

Continuation is bounded by the same core safety controls: hard stop file, retry ceiling, and deadline. The `Stop` hook pauses the run when any bound is exceeded.
