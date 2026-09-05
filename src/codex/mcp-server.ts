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

function requestWorktreeContext(request: string, operation: string): { path: string | null; error: string | null } {
  const requestedPath = requestedWorktreePath(request);
  const candidate = requestedPath ?? process.cwd();
  if (requestedPath && !isAbsolute(requestedPath)) {
    return { path: null, error: `Beanflow cannot ${operation}: the named worktree path must be absolute.` };
  }
  try {
    return {
      path: realpathSync(git(['rev-parse', '--show-toplevel'], candidate)),
      error: null,
    };
  } catch {
    return {
      path: null,
      error: requestedPath
        ? `Beanflow cannot ${operation}: the named worktree ${requestedPath} is not a Git worktree.`
        : `Beanflow cannot ${operation}: the current directory is not a Git worktree.`,
    };
  }
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function startFromCurrentWorktree(request: string): string {
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

  const activeId = activeRunId(worktreePath);
  let retiredStaleRun: string | null = null;
  if (activeId) {
    const activeState = loadRunState(activeId, worktreePath);
    if (runWorktreeExists(activeState, worktreePath)) {
      return `Beanflow cannot start: run ${activeId} is already active in ${worktreePath}.`;
    }
    disarmRun(worktreePath);
    retiredStaleRun = activeId;
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
  persistRunState(state, worktreePath);
  armRun(runId, worktreePath);
  const staleNotice = retiredStaleRun ? `Retired stale Beanflow run ${retiredStaleRun}. ` : '';
  return `${staleNotice}Started Beanflow run ${runId} in ${worktreePath} on ${branchName}; frozen ${manifest.executableLeaves.length} leaves and selected ${state.selectedLeaf?.id ?? 'none'}.`;
}

function refreshActiveManifest(request: string): string {
  const requested = requestWorktreeContext(request, 'refresh');
  if (requested.error) return requested.error;
  const cwd = requested.path!;
  const runId = activeRunId(cwd);
  if (!runId) return `No active beanflow run to refresh in ${cwd}.`;
  const state = loadRunState(runId, cwd);
  if (!runWorktreeExists(state, cwd)) {
    return `Beanflow cannot refresh run ${runId}: its recorded worktree ${runWorktreePath(state, cwd)} no longer exists.`;
  }
  if (!isRunWorktree(state, cwd)) {
    return `Beanflow cannot refresh from this directory; the active run belongs to ${runWorktreePath(state, cwd)}.`;
  }

  const now = new Date().toISOString();
  const tree = discoverBeans(join(cwd, '.beans'));
  let currentManifest;
  try {
    currentManifest = freezeManifest(tree, state.parentBean.id, now);
  } catch (err) {
    return `Beanflow cannot refresh: ${(err as Error).message}`;
  }
  const failures = currentManifest.executableLeaves
    .map((leaf) => auditLeaf(tree.byId.get(leaf.id)!, tree))
    .filter((audit) => !audit.passed);
  if (failures.length > 0) {
    const detail = failures
      .map((audit) => `${audit.leaf.id}: ${audit.findings.filter((finding) => !finding.pass).map((finding) => finding.check).join(', ')}`)
      .join('; ');
    return `Beanflow cannot refresh: the manifest audit failed (${detail}).`;
  }

  const completedHistory = state.manifest.executableLeaves.filter((leaf) => !tree.byId.has(leaf.id));
  const manifest = {
    ...currentManifest,
    executableLeaves: [...completedHistory, ...currentManifest.executableLeaves],
  };
  const refreshed = { ...state, manifest, updatedAt: now };
  const selectedLeaf = nextEligibleLeaf(tree, manifest, refreshed);
  persistRunState({ ...refreshed, selectedLeaf }, cwd);
  return `Refreshed Beanflow run ${runId}; frozen ${manifest.executableLeaves.length} leaves and selected ${selectedLeaf?.id ?? 'none'}.`;
}

function runBeanflow(request: string): string {
  const op = parseOperation(request);
  switch (op) {
    case 'start':
      return startFromCurrentWorktree(request);
    case 'status': {
      const requested = requestWorktreeContext(request, 'show status');
      if (requested.error) return requested.error;
      const cwd = requested.path!;
      const runId = activeRunId(cwd);
      if (!runId) return `No active beanflow run in ${cwd}.`;
      const state = loadRunState(runId, cwd);
      if (!runWorktreeExists(state, cwd)) {
        return `Run ${runId} is stale: its recorded worktree ${runWorktreePath(state, cwd)} no longer exists. Start a new run explicitly to retire it.`;
      }
      const s = statusOf(state);
      const tree = discoverBeans(join(runWorktreePath(state, cwd), '.beans'));
      const selectedLeaf = nextEligibleLeaf(tree, state.manifest, state);
      return `Run ${runId}: phase=${s.phase}, selected=${selectedLeaf?.id ?? 'none'}, blockers=${s.blockers.length}.`;
    }
    case 'resume': {
      const requested = requestWorktreeContext(request, 'resume');
      if (requested.error) return requested.error;
      const cwd = requested.path!;
      const runId = activeRunId(cwd);
      if (!runId) return `No active beanflow run to resume in ${cwd}.`;
      const state = loadRunState(runId, cwd);
      if (!runWorktreeExists(state, cwd)) {
        return `Beanflow cannot resume run ${runId}: its recorded worktree ${runWorktreePath(state, cwd)} no longer exists. Start a new run explicitly to retire it.`;
      }
      if (!isRunWorktree(state, cwd)) {
        return `Beanflow cannot resume from this directory; the active run belongs to ${runWorktreePath(state, cwd)}.`;
      }
      const decision = decideResume(state, discoverBeans(join(cwd, '.beans')), new Date().toISOString());
      if (decision.state !== state) persistRunState(decision.state, cwd);
      return decision.message;
    }
    case 'refresh':
      return refreshActiveManifest(request);
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
