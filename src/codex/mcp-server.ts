// Codex MCP server exposing one LLM-callable beanflow tool. The wire protocol
// is newline-delimited JSON-RPC over stdin/stdout. Run via:
//   node dist/codex/mcp-server.js

import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditLeaf } from '../core/audit.js';
import { discoverBeans } from '../core/discovery.js';
import { nextEligibleLeaf } from '../core/continuation.js';
import { freezeManifest } from '../core/manifest.js';
import { activeRunId, disarmRun, isRunWorktree, loadRunState, persistRunState, runWorktreeExists, runWorktreePath, statusOf } from '../core/runstate.js';
import { armRun } from '../core/runstate.js';
import { selectNextLeaf } from '../core/selection.js';
import { decideResume, parseOperation } from '../core/tool.js';
import type { RunState } from '../core/types.js';

export interface McpRequest {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

const TOOL = {
  name: 'beanflow',
  description:
    'Drive a Beanflow run with a plain-language request: start from an audited current or explicitly named worktree, check status, resume, refresh the manifest, or land.',
  inputSchema: {
    type: 'object',
    properties: {
      request: {
        type: 'string',
        description: "Plain-language request, e.g. 'start epic beanflow-1234 with base branch main in worktree /absolute/path', 'show status', 'resume', 'refresh', or 'land'.",
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

function requestValue(request: string, label: string): string | null {
  const match = request.match(new RegExp(`\\b${label}\\s+(?:branch\\s+)?([A-Za-z0-9._/-]+)`, 'i'));
  return match?.[1] ?? null;
}

function requestedParentId(request: string): string | null {
  return requestValue(request, '(?:epic|parent|bean)');
}

function requestedWorktreePath(request: string): string | null {
  const match = request.match(/\bworktree\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i);
  return match?.[1] ?? match?.[2] ?? match?.[3]?.replace(/[.,;:!?]+$/, '') ?? null;
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function startFromCurrentWorktree(request: string): string {
  const activeId = activeRunId();
  let retiredStaleRun: string | null = null;
  if (activeId) {
    const activeState = loadRunState(activeId);
    if (runWorktreeExists(activeState, process.cwd())) {
      return 'Beanflow cannot start: another run is already active.';
    }
    disarmRun();
    retiredStaleRun = activeId;
  }
  const parentId = requestedParentId(request);
  if (!parentId) return 'Beanflow cannot start: specify the audited epic Bean id.';
  const baseBranch = requestValue(request, '(?:base|target)');
  if (!baseBranch) return 'Beanflow cannot start: specify the base branch.';

  const requestedPath = requestedWorktreePath(request);
  if (requestedPath && !isAbsolute(requestedPath)) {
    return 'Beanflow cannot start: the named worktree path must be absolute.';
  }
  let worktreePath: string;
  try {
    const candidate = requestedPath ?? process.cwd();
    worktreePath = realpathSync(git(['rev-parse', '--show-toplevel'], candidate));
  } catch {
    return `Beanflow cannot start: ${requestedPath ? `the named worktree ${requestedPath}` : 'the current directory'} is not a Git worktree.`;
  }
  if (git(['status', '--porcelain'], worktreePath) !== '') {
    return `Beanflow cannot start: the ${requestedPath ? 'named' : 'current'} worktree is dirty.`;
  }

  const branchName = git(['symbolic-ref', '--short', 'HEAD'], worktreePath);
  if (branchName === baseBranch) {
    return 'Beanflow cannot start: the current checkout is the base branch, not an isolated feature worktree.';
  }
  let baseCommit: string;
  try {
    baseCommit = git(['rev-parse', baseBranch], worktreePath);
  } catch {
    return `Beanflow cannot start: base branch ${baseBranch} does not resolve.`;
  }

  const now = new Date().toISOString();
  const tree = discoverBeans(join(worktreePath, '.beans'));
  let manifest;
  try {
    manifest = freezeManifest(tree, parentId, now);
  } catch (err) {
    return `Beanflow cannot start: ${(err as Error).message}`;
  }
  const failures = manifest.executableLeaves
    .map((leaf) => auditLeaf(tree.byId.get(leaf.id)!, tree))
    .filter((audit) => !audit.passed);
  if (failures.length > 0) {
    const detail = failures
      .map((audit) => `${audit.leaf.id}: ${audit.findings.filter((finding) => !finding.pass).map((finding) => finding.check).join(', ')}`)
      .join('; ');
    return `Beanflow cannot start: the manifest audit failed (${detail}).`;
  }

  const leaves = manifest.executableLeaves.map((leaf) => tree.byId.get(leaf.id)!);
  const selected = selectNextLeaf(leaves, new Set(), new Set());
  const runId = `${parentId}-${Date.now()}`;
  const state: RunState = {
    schemaVersion: 1,
    runId,
    parentBean: manifest.parentBean,
    manifest,
    phase: 'running',
    baseBranch,
    baseCommit,
    worktreePath,
    selectedLeaf: selected ? manifest.executableLeaves.find((leaf) => leaf.id === selected.id)! : null,
    blockers: [],
    attempts: {},
    startedAt: now,
    updatedAt: now,
  };
  persistRunState(state);
  armRun(runId);
  const staleNotice = retiredStaleRun ? `Retired stale Beanflow run ${retiredStaleRun}. ` : '';
  return `${staleNotice}Started Beanflow run ${runId} in ${worktreePath} on ${branchName}; frozen ${manifest.executableLeaves.length} leaves and selected ${state.selectedLeaf?.id ?? 'none'}.`;
}

function runBeanflow(request: string): string {
  const op = parseOperation(request);
  const runId = activeRunId();
  switch (op) {
    case 'start':
      return startFromCurrentWorktree(request);
    case 'status': {
      if (!runId) return 'No active beanflow run.';
      const state = loadRunState(runId);
      if (!runWorktreeExists(state, process.cwd())) {
        return `Run ${runId} is stale: its recorded worktree ${runWorktreePath(state, process.cwd())} no longer exists. Start a new run explicitly to retire it.`;
      }
      const s = statusOf(state);
      const tree = discoverBeans(join(runWorktreePath(state, process.cwd()), '.beans'));
      const selectedLeaf = nextEligibleLeaf(tree, state.manifest, state);
      return `Run ${runId}: phase=${s.phase}, selected=${selectedLeaf?.id ?? 'none'}, blockers=${s.blockers.length}.`;
    }
    case 'resume': {
      if (!runId) return 'No active beanflow run to resume.';
      const state = loadRunState(runId);
      if (!runWorktreeExists(state, process.cwd())) {
        return `Beanflow cannot resume run ${runId}: its recorded worktree ${runWorktreePath(state, process.cwd())} no longer exists. Start a new run explicitly to retire it.`;
      }
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
