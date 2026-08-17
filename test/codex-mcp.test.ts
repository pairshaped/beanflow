import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { handleRequest, type McpRequest } from '../src/codex/mcp-server.js';
import { armRun, disarmRun, persistRunState } from '../src/core/runstate.js';
import type { BeanRef, RunState } from '../src/core/types.js';

beforeAll(() => {
  process.env.BEANFLOW_STATE_DIR = mkdtempSync(join(tmpdir(), 'beanflow-mcp-'));
});

function parse(resp: string | null) {
  return resp ? (JSON.parse(resp) as Record<string, unknown>) : null;
}

const req = (id: number, method: string, params?: unknown): McpRequest => ({
  jsonrpc: '2.0',
  id,
  method,
  params: params as Record<string, unknown>,
});

describe('Codex MCP server', () => {
  it('replies to initialize', () => {
    const resp = parse(handleRequest(req(1, 'initialize')))!;
    const result = resp.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe('2024-11-05');
    expect((result.capabilities as Record<string, unknown>).tools).toEqual({});
    expect((result.serverInfo as Record<string, unknown>).name).toBe('beanflow');
  });

  it('ignores notifications', () => {
    expect(handleRequest({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
  });

  it('lists the beanflow tool with an input schema', () => {
    const resp = parse(handleRequest(req(2, 'tools/list')))!;
    const tools = (resp.result as { tools: unknown[] }).tools;
    expect(tools).toHaveLength(1);
    const tool = tools[0] as Record<string, unknown>;
    expect(tool.name).toBe('beanflow');
    expect((tool.inputSchema as Record<string, unknown>).required).toContain('request');
  });

  it('dispatches status with no active run', () => {
    const resp = parse(handleRequest(req(3, 'tools/call', { name: 'beanflow', arguments: { request: 'status' } })))!;
    const content = (resp.result as { content: { type: string; text: string }[] }).content;
    expect(content[0].type).toBe('text');
    expect(content[0].text).toMatch(/No active beanflow run/);
  });

  it('refuses to resume when every remaining leaf has a recorded blocker', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-project-'));
    const beansDir = join(cwd, '.beans');
    mkdirSync(beansDir);
    const leaf: BeanRef = { id: 'beanflow-leaf', path: '.beans/beanflow-leaf.md', title: 'Blocked leaf' };
    writeFileSync(
      join(beansDir, 'beanflow-leaf.md'),
      `---\n# beanflow-leaf\ntitle: Blocked leaf\nstatus: todo\ntype: task\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    const state: RunState = {
      schemaVersion: 1,
      runId: 'blocked-run',
      parentBean: { id: 'beanflow-epic', path: '.beans/beanflow-epic.md', title: 'Epic' },
      manifest: {
        parentBean: { id: 'beanflow-epic', path: '.beans/beanflow-epic.md', title: 'Epic' },
        frozenAt: '2026-08-17T00:00:00Z',
        executableLeaves: [leaf],
      },
      phase: 'paused',
      baseBranch: 'main',
      baseCommit: 'abc123',
      selectedLeaf: null,
      blockers: [{ leaf, evidence: 'Owner input needed', requiredDecision: 'Choose one', recordedAt: '2026-08-17T01:00:00Z' }],
      attempts: {},
      startedAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T01:00:00Z',
    };
    persistRunState(state);
    armRun(state.runId);

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const resp = parse(handleRequest(req(4, 'tools/call', { name: 'beanflow', arguments: { request: 'resume' } })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toBe('Beanflow cannot resume: no eligible leaf exists while 1 recorded blocker remains unresolved.');
    } finally {
      process.chdir(originalCwd);
      disarmRun();
    }
  });

  it('dispatches refresh and land as guidance', () => {
    const refresh = parse(handleRequest(req(5, 'tools/call', { name: 'beanflow', arguments: { request: 'refresh the manifest' } })))!;
    expect((refresh.result as { content: { text: string }[] }).content[0].text).toMatch(/re-freeze/);
    const land = parse(handleRequest(req(6, 'tools/call', { name: 'beanflow', arguments: { request: 'land it' } })))!;
    expect((land.result as { content: { text: string }[] }).content[0].text).toMatch(/approval/);
  });

  it('errors on an unknown tool', () => {
    const resp = parse(handleRequest(req(7, 'tools/call', { name: 'nope', arguments: {} })))!;
    expect(resp.error).toBeDefined();
  });
});
