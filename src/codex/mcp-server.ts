// Codex MCP server exposing one LLM-callable beanflow tool. The wire protocol
// is newline-delimited JSON-RPC over stdin/stdout. Run via:
//   node dist/codex/mcp-server.js

import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { discoverBeans } from '../core/discovery.js';
import { activeRunId, isRunWorktree, loadRunState, persistRunState, runWorktreePath, statusOf } from '../core/runstate.js';
import { decideResume, parseOperation } from '../core/tool.js';

export interface McpRequest {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

const TOOL = {
  name: 'beanflow',
  description:
    'Drive a Beanflow run with a plain-language request: check status, resume, refresh the manifest, or land.',
  inputSchema: {
    type: 'object',
    properties: {
      request: {
        type: 'string',
        description: "Plain-language request, e.g. 'show status', 'resume', 'refresh', or 'land'.",
      },
    },
    required: ['request'],
  },
};

function ok(id: McpRequest['id'], result: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function error(id: McpRequest['id'], code: number, message: string): string {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

function runBeanflow(request: string): string {
  const op = parseOperation(request);
  const runId = activeRunId();
  switch (op) {
    case 'status': {
      if (!runId) return 'No active beanflow run.';
      const state = loadRunState(runId);
      const s = statusOf(state);
      return `Run ${runId}: phase=${s.phase}, selected=${s.selectedLeaf?.id ?? 'none'}, blockers=${s.blockers.length}.`;
    }
    case 'resume': {
      if (!runId) return 'No active beanflow run to resume.';
      const state = loadRunState(runId);
      if (!isRunWorktree(state, process.cwd())) {
        return `Beanflow cannot resume from this directory; the active run belongs to ${runWorktreePath(state, process.cwd())}.`;
      }
      const decision = decideResume(state, discoverBeans(join(process.cwd(), '.beans')), new Date().toISOString());
      if (decision.state !== state) persistRunState(decision.state);
      return decision.message;
    }
    case 'refresh':
      return 'Refresh is an explicit re-freeze: re-discover Beans, re-freeze the manifest from the audited parent, and persist the new state. The agent performs this per the beanflow skill.';
    case 'land':
      return 'Landing requires separate owner approval and follows repository merge policy. The agent performs this per the beanflow skill.';
    default:
      return `Unrecognized beanflow request: ${request}`;
  }
}

export function handleRequest(msg: McpRequest): string | null {
  switch (msg.method) {
    case 'initialize':
      return ok(msg.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'beanflow', version: '0.1.0' },
      });
    case 'notifications/initialized':
      return null;
    case 'tools/list':
      return ok(msg.id, { tools: [TOOL] });
    case 'tools/call': {
      const params = (msg.params ?? {}) as { name?: unknown; arguments?: { request?: unknown } };
      if (params.name !== 'beanflow') {
        return error(msg.id, -32602, `unknown tool: ${String(params.name)}`);
      }
      const request = String(params.arguments?.request ?? '');
      return ok(msg.id, { content: [{ type: 'text', text: runBeanflow(request) }] });
    }
    default:
      return error(msg.id, -32601, `method not found: ${String(msg.method)}`);
  }
}

function main(): void {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: McpRequest;
    try {
      msg = JSON.parse(trimmed) as McpRequest;
    } catch {
      return;
    }
    const resp = handleRequest(msg);
    if (resp !== null) process.stdout.write(`${resp}\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
