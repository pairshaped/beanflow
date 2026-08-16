# Codex host adapter

Beanflow runs on Codex through three mechanisms: a shared skill, an MCP tool, and a Stop continuation hook.

## Install

1. Build the package: `pnpm build` (compiles `src/codex/` to `dist/codex/`).
2. Skill: symlink the shared skill into `~/.codex/skills/`:

   ```bash
   ln -s /path/to/beanflow/skills/beanflow ~/.codex/skills/beanflow
   ```

3. Tool: add an MCP server to `~/.codex/config.toml`:

   ```toml
   non_prefixed_mcp_tool_names = { server_names = ["beanflow"] }

   [mcp_servers.beanflow]
   command = "node"
   args = ["/path/to/beanflow/dist/codex/mcp-server.js"]
   startup_timeout_sec = 30
   ```

4. Continuation: add a `Stop` entry to `~/.codex/hooks.json`:

   ```json
   "Stop": [
     { "hooks": [ { "type": "command", "command": "node /path/to/beanflow/dist/codex/stop-hook.js", "timeout": 30 } ] }
   ]
   ```

5. Trust the hook (`/hooks`) and start a new thread so the MCP tool loads.

## Fidelity gap vs Pi

Codex's `Stop` hook does not expose the turn's stop reason, so the Esc-abort to pause path that Pi has is not available. An Esc-abort interrupts the turn and does not fire `Stop`, so the run simply does not auto-continue that turn; the next `Stop` after a real turn resumes it. Treat Esc-pause as best-effort on Codex.

## Safety

Continuation is bounded by the same core safety controls: hard stop file, retry ceiling, and deadline. The `Stop` hook pauses the run when any bound is exceeded.
