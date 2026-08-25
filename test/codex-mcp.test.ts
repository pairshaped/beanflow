import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { handleRequest, type McpRequest } from '../src/codex/mcp-server.js';
import { activeRunId, armRun, disarmRun, loadRunState, persistRunState } from '../src/core/runstate.js';
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

  it('starts from a clean audited feature worktree', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-start-'));
    mkdirSync(join(cwd, '.beans'));
    writeFileSync(
      join(cwd, '.beans', 'test-epic.md'),
      `---\n# test-epic\ntitle: Test epic\nstatus: in-progress\ntype: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    writeFileSync(
      join(cwd, '.beans', 'test-leaf.md'),
      `---\n# test-leaf\ntitle: Test leaf\nstatus: todo\ntype: task\nparent: test-epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\n## What to build\n\nImplement one bounded behavior with enough context for autonomous work.\n\n## Acceptance criteria\n\n- [ ] The behavior works.\n\n## Verification\n\nRun the focused test.\n\n## Out of scope\n\nDo not change unrelated behavior.\n`,
    );
    execFileSync('git', ['init', '-b', 'main'], { cwd });
    execFileSync('git', ['config', 'user.email', 'dave@rapin.com'], { cwd });
    execFileSync('git', ['config', 'user.name', 'Dave Rapin'], { cwd });
    execFileSync('git', ['add', '.'], { cwd });
    execFileSync('git', ['commit', '-m', 'base'], { cwd });
    execFileSync('git', ['switch', '-c', 'f/test-run'], { cwd });

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const resp = parse(handleRequest(req(30, 'tools/call', {
        name: 'beanflow',
        arguments: { request: 'start epic test-epic with base branch main' },
      })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/Started Beanflow run/);
      expect(text).toMatch(/selected test-leaf/);
      const runId = activeRunId();
      expect(runId).not.toBeNull();
      expect(loadRunState(runId!).worktreePath).toBe(realpathSync(cwd));
    } finally {
      process.chdir(originalCwd);
      disarmRun();
    }
  });

  it('refuses to start from a dirty worktree', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-dirty-'));
    execFileSync('git', ['init', '-b', 'main'], { cwd });
    execFileSync('git', ['config', 'user.email', 'dave@rapin.com'], { cwd });
    execFileSync('git', ['config', 'user.name', 'Dave Rapin'], { cwd });
    writeFileSync(join(cwd, 'tracked'), 'clean\n');
    execFileSync('git', ['add', '.'], { cwd });
    execFileSync('git', ['commit', '-m', 'base'], { cwd });
    execFileSync('git', ['switch', '-c', 'f/test-run'], { cwd });
    writeFileSync(join(cwd, 'tracked'), 'dirty\n');

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const resp = parse(handleRequest(req(31, 'tools/call', {
        name: 'beanflow',
        arguments: { request: 'start epic test-epic with base branch main' },
      })))!;
      expect((resp.result as { content: { text: string }[] }).content[0].text).toMatch(/worktree is dirty/);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('starts from an explicitly named clean worktree when the server cwd is dirty', () => {
    const repo = mkdtempSync(join(tmpdir(), 'beanflow-mcp-explicit-'));
    const worktree = join(repo, 'feature-worktree');
    mkdirSync(join(repo, '.beans'));
    writeFileSync(
      join(repo, '.beans', 'test-epic.md'),
      `---\n# test-epic\ntitle: Test epic\nstatus: in-progress\ntype: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    writeFileSync(
      join(repo, '.beans', 'test-leaf.md'),
      `---\n# test-leaf\ntitle: Test leaf\nstatus: todo\ntype: task\nparent: test-epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\n## What to build\n\nImplement one bounded behavior with enough context for autonomous work.\n\n## Acceptance criteria\n\n- [ ] The behavior works.\n\n## Verification\n\nRun the focused test.\n\n## Out of scope\n\nDo not change unrelated behavior.\n`,
    );
    writeFileSync(join(repo, 'tracked'), 'clean\n');
    execFileSync('git', ['init', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'dave@rapin.com'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Dave Rapin'], { cwd: repo });
    execFileSync('git', ['add', '.'], { cwd: repo });
    execFileSync('git', ['commit', '-m', 'base'], { cwd: repo });
    execFileSync('git', ['worktree', 'add', '-b', 'f/test-run', worktree, 'main'], { cwd: repo });
    writeFileSync(join(repo, 'tracked'), 'dirty\n');

    const originalCwd = process.cwd();
    process.chdir(repo);
    try {
      const resp = parse(handleRequest(req(32, 'tools/call', {
        name: 'beanflow',
        arguments: {
          request: `start epic test-epic with base branch main in worktree ${worktree}`,
        },
      })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/Started Beanflow run/);
      expect(loadRunState(activeRunId()!).worktreePath).toBe(realpathSync(worktree));

      disarmRun();
      writeFileSync(join(repo, 'tracked'), 'clean\n');
      writeFileSync(join(worktree, 'tracked'), 'dirty feature\n');
      const dirtyResp = parse(handleRequest(req(33, 'tools/call', {
        name: 'beanflow',
        arguments: {
          request: `start epic test-epic with base branch main in worktree ${worktree}`,
        },
      })))!;
      const dirtyText = (dirtyResp.result as { content: { text: string }[] }).content[0].text;
      expect(dirtyText).toMatch(/named worktree is dirty/);
    } finally {
      process.chdir(originalCwd);
      disarmRun();
    }
  });

  it('ignores terminal sentence punctuation after an unquoted named worktree', () => {
    const repo = mkdtempSync(join(tmpdir(), 'beanflow-mcp-punctuation-'));
    const worktree = join(repo, 'feature-worktree');
    mkdirSync(join(repo, '.beans'));
    writeFileSync(
      join(repo, '.beans', 'test-epic.md'),
      `---\n# test-epic\ntitle: Test epic\nstatus: in-progress\ntype: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    writeFileSync(
      join(repo, '.beans', 'test-leaf.md'),
      `---\n# test-leaf\ntitle: Test leaf\nstatus: todo\ntype: task\nparent: test-epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\n## What to build\n\nImplement one bounded behavior with enough context for autonomous work.\n\n## Acceptance criteria\n\n- [ ] The behavior works.\n\n## Verification\n\nRun the focused test.\n\n## Out of scope\n\nDo not change unrelated behavior.\n`,
    );
    writeFileSync(join(repo, 'tracked'), 'clean\n');
    execFileSync('git', ['init', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'dave@rapin.com'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Dave Rapin'], { cwd: repo });
    execFileSync('git', ['add', '.'], { cwd: repo });
    execFileSync('git', ['commit', '-m', 'base'], { cwd: repo });
    execFileSync('git', ['worktree', 'add', '-b', 'f/test-run', worktree, 'main'], { cwd: repo });

    try {
      const resp = parse(handleRequest(req(34, 'tools/call', {
        name: 'beanflow',
        arguments: {
          request: `start epic test-epic with base branch main in worktree ${worktree}.`,
        },
      })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/Started Beanflow run/);
      expect(loadRunState(activeRunId()!).worktreePath).toBe(realpathSync(worktree));
    } finally {
      disarmRun();
    }
  });

  it('reports the next eligible leaf after the selected leaf is deleted', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-status-'));
    mkdirSync(join(cwd, '.beans'));
    writeFileSync(
      join(cwd, '.beans', 'next.md'),
      `---\n# next\ntitle: Next leaf\nstatus: todo\ntype: task\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    const state: RunState = {
      schemaVersion: 1,
      runId: 'advanced-run',
      parentBean: { id: 'epic', path: '.beans/epic.md', title: 'Epic' },
      manifest: {
        parentBean: { id: 'epic', path: '.beans/epic.md', title: 'Epic' },
        frozenAt: '2026-08-17T00:00:00Z',
        executableLeaves: [
          { id: 'done', path: '.beans/done.md', title: 'Done leaf' },
          { id: 'next', path: '.beans/next.md', title: 'Next leaf' },
        ],
      },
      phase: 'running',
      baseBranch: 'main',
      baseCommit: 'abc123',
      worktreePath: realpathSync(cwd),
      selectedLeaf: { id: 'done', path: '.beans/done.md', title: 'Done leaf' },
      blockers: [],
      attempts: {},
      startedAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T00:00:00Z',
    };
    persistRunState(state);
    armRun(state.runId);

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const resp = parse(handleRequest(req(35, 'tools/call', {
        name: 'beanflow',
        arguments: { request: 'show status' },
      })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/selected=next/);

      const resume = parse(handleRequest(req(36, 'tools/call', {
        name: 'beanflow',
        arguments: { request: 'resume' },
      })))!;
      expect((resume.result as { content: { text: string }[] }).content[0].text).toMatch(/Resuming/);
      expect(loadRunState(state.runId).selectedLeaf?.id).toBe('next');
    } finally {
      process.chdir(originalCwd);
      disarmRun();
    }
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
      phase: 'running',
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
      expect(loadRunState(state.runId).phase).toBe('paused');
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
