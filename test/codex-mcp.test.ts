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

  it('reports a stale run when its recorded worktree no longer exists', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-stale-owner-'));
    execFileSync('git', ['init', '-q', '-b', 'f/stale-owner'], { cwd });
    const missingWorktree = join(tmpdir(), `missing-beanflow-worktree-${Date.now()}`);
    const state: RunState = {
      schemaVersion: 1,
      runId: 'stale-run',
      parentBean: { id: 'epic', path: join(missingWorktree, '.beans', 'epic.md'), title: 'Epic' },
      manifest: {
        parentBean: { id: 'epic', path: join(missingWorktree, '.beans', 'epic.md'), title: 'Epic' },
        frozenAt: '2026-08-17T00:00:00Z',
        executableLeaves: [],
      },
      phase: 'running',
      baseBranch: 'main',
      baseCommit: 'abc123',
      worktreePath: missingWorktree,
      selectedLeaf: null,
      blockers: [],
      attempts: {},
      startedAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T00:00:00Z',
    };
    persistRunState(state, cwd);
    armRun(state.runId, cwd);

    try {
      const resp = parse(handleRequest(req(4, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `show status in worktree ${cwd}` },
      })))!;
      expect((resp.result as { content: { text: string }[] }).content[0].text).toMatch(
        /stale: its recorded worktree .* no longer exists/,
      );
    } finally {
      disarmRun(cwd);
    }
  });

  it('does not replace an active run whose worktree still exists', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-live-run-'));
    execFileSync('git', ['init', '-q', '-b', 'f/live-run'], { cwd });
    const state: RunState = {
      schemaVersion: 1,
      runId: 'live-run',
      parentBean: { id: 'epic', path: join(cwd, '.beans', 'epic.md'), title: 'Epic' },
      manifest: {
        parentBean: { id: 'epic', path: join(cwd, '.beans', 'epic.md'), title: 'Epic' },
        frozenAt: '2026-08-17T00:00:00Z',
        executableLeaves: [],
      },
      phase: 'running',
      baseBranch: 'main',
      baseCommit: 'abc123',
      worktreePath: realpathSync(cwd),
      selectedLeaf: null,
      blockers: [],
      attempts: {},
      startedAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T00:00:00Z',
    };
    persistRunState(state, cwd);
    armRun(state.runId, cwd);

    try {
      const resp = parse(handleRequest(req(5, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `start epic other-epic with base branch main in worktree ${cwd}` },
      })))!;
      expect((resp.result as { content: { text: string }[] }).content[0].text).toMatch(
        /already active in/,
      );
      expect(activeRunId(cwd)).toBe(state.runId);
    } finally {
      disarmRun(cwd);
    }
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
      const runId = activeRunId(cwd);
      expect(runId).not.toBeNull();
      expect(loadRunState(runId!, cwd).worktreePath).toBe(realpathSync(cwd));
    } finally {
      process.chdir(originalCwd);
      disarmRun(cwd);
    }
  });

  it('starts and resolves concurrent runs in separate worktrees', () => {
    const repo = mkdtempSync(join(tmpdir(), 'beanflow-concurrent-repo-'));
    const worktreeA = mkdtempSync(join(tmpdir(), 'beanflow-concurrent-a-'));
    const worktreeB = mkdtempSync(join(tmpdir(), 'beanflow-concurrent-b-'));
    mkdirSync(join(repo, '.beans'));

    for (const suffix of ['a', 'b']) {
      writeFileSync(
        join(repo, '.beans', `epic-${suffix}.md`),
        `---\n# epic-${suffix}\ntitle: Epic ${suffix.toUpperCase()}\nstatus: in-progress\ntype: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
      );
      writeFileSync(
        join(repo, '.beans', `leaf-${suffix}.md`),
        `---\n# leaf-${suffix}\ntitle: Leaf ${suffix.toUpperCase()}\nstatus: todo\ntype: task\nparent: epic-${suffix}\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\n## What to build\n\nImplement one bounded behavior with enough context for autonomous work.\n\n## Acceptance criteria\n\n- [ ] The behavior works.\n\n## Verification\n\nRun the focused test.\n\n## Out of scope\n\nDo not change unrelated behavior.\n`,
      );
    }

    execFileSync('git', ['init', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'dave@rapin.com'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Dave Rapin'], { cwd: repo });
    execFileSync('git', ['add', '.'], { cwd: repo });
    execFileSync('git', ['commit', '-m', 'base'], { cwd: repo });
    execFileSync('git', ['worktree', 'add', '-b', 'f/run-a', worktreeA, 'main'], { cwd: repo });
    execFileSync('git', ['worktree', 'add', '-b', 'f/run-b', worktreeB, 'main'], { cwd: repo });

    try {
      const startA = parse(handleRequest(req(39, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `start epic epic-a with base branch main in worktree ${worktreeA}` },
      })))!;
      expect((startA.result as { content: { text: string }[] }).content[0].text).toMatch(/Started Beanflow run/);

      const startB = parse(handleRequest(req(40, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `start epic epic-b with base branch main in worktree ${worktreeB}` },
      })))!;
      expect((startB.result as { content: { text: string }[] }).content[0].text).toMatch(/Started Beanflow run/);

      const statusA = parse(handleRequest(req(41, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `show status in worktree ${worktreeA}` },
      })))!;
      expect((statusA.result as { content: { text: string }[] }).content[0].text).toMatch(/selected=leaf-a/);

      const statusB = parse(handleRequest(req(42, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `show status in worktree ${worktreeB}` },
      })))!;
      expect((statusB.result as { content: { text: string }[] }).content[0].text).toMatch(/selected=leaf-b/);
      expect(execFileSync('git', ['status', '--porcelain'], { cwd: worktreeA, encoding: 'utf8' })).toBe('');
      expect(execFileSync('git', ['status', '--porcelain'], { cwd: worktreeB, encoding: 'utf8' })).toBe('');
    } finally {
      disarmRun(worktreeA);
      disarmRun(worktreeB);
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
      expect(loadRunState(activeRunId(worktree)!, worktree).worktreePath).toBe(realpathSync(worktree));

      disarmRun(worktree);
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
      disarmRun(worktree);
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
      expect(loadRunState(activeRunId(worktree)!, worktree).worktreePath).toBe(realpathSync(worktree));
    } finally {
      disarmRun(worktree);
    }
  });

  it('reports the next eligible leaf after the selected leaf is deleted', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-status-'));
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd });
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
    persistRunState(state, cwd);
    armRun(state.runId, cwd);

    try {
      const resp = parse(handleRequest(req(35, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `show status in worktree ${cwd}` },
      })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/selected=next/);

      const resume = parse(handleRequest(req(36, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `resume in worktree ${cwd}` },
      })))!;
      expect((resume.result as { content: { text: string }[] }).content[0].text).toMatch(/Resuming/);
      expect(loadRunState(state.runId, cwd).selectedLeaf?.id).toBe('next');
    } finally {
      disarmRun(cwd);
    }
  });

  it('rejects invalid named resume worktrees', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-invalid-resume-'));
    const state: RunState = {
      schemaVersion: 1,
      runId: 'invalid-resume-run',
      parentBean: { id: 'epic', path: join(cwd, '.beans', 'epic.md'), title: 'Epic' },
      manifest: {
        parentBean: { id: 'epic', path: join(cwd, '.beans', 'epic.md'), title: 'Epic' },
        frozenAt: 't0',
        executableLeaves: [],
      },
      phase: 'running',
      baseBranch: 'main',
      baseCommit: 'abc123',
      worktreePath: cwd,
      selectedLeaf: null,
      blockers: [],
      attempts: {},
      startedAt: 't0',
      updatedAt: 't0',
    };
    persistRunState(state);
    armRun(state.runId);

    try {
      const relative = parse(handleRequest(req(37, 'tools/call', {
        name: 'beanflow',
        arguments: { request: 'resume in worktree relative/path' },
      })))!;
      expect((relative.result as { content: { text: string }[] }).content[0].text).toMatch(/must be absolute/);

      const nonGit = parse(handleRequest(req(38, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `resume in worktree ${cwd}` },
      })))!;
      expect((nonGit.result as { content: { text: string }[] }).content[0].text).toMatch(/is not a Git worktree/);
    } finally {
      disarmRun();
    }
  });

  it('refuses to resume when every remaining leaf has a recorded blocker', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-project-'));
    execFileSync('git', ['init', '-q', '-b', 'f/blocked'], { cwd });
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
    persistRunState(state, cwd);
    armRun(state.runId, cwd);

    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const resp = parse(handleRequest(req(4, 'tools/call', { name: 'beanflow', arguments: { request: 'resume' } })))!;
      const text = (resp.result as { content: { text: string }[] }).content[0].text;
      expect(text).toBe('Beanflow cannot resume: no eligible leaf exists while 1 recorded blocker remains unresolved.');
      expect(loadRunState(state.runId, cwd).phase).toBe('paused');
    } finally {
      process.chdir(originalCwd);
      disarmRun(cwd);
    }
  });

  it('refreshes and persists an audited manifest while preserving completed history', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-refresh-'));
    execFileSync('git', ['init', '-q', '-b', 'f/refresh'], { cwd });
    const beansDir = join(cwd, '.beans');
    mkdirSync(beansDir);
    writeFileSync(
      join(beansDir, 'epic.md'),
      `---\n# epic\ntitle: Epic\nstatus: in-progress\ntype: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    const leaf = (id: string, title: string) =>
      `---\n# ${id}\ntitle: ${title}\nstatus: todo\ntype: task\nparent: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\n## What to build\n\nImplement one bounded behavior with enough context for autonomous work.\n\n## Acceptance criteria\n\n- [ ] The behavior works.\n\n## Verification\n\nRun the focused test.\n\n## Out of scope\n\nDo not change unrelated behavior.\n`;
    writeFileSync(join(beansDir, 'current.md'), leaf('current', 'Current'));
    writeFileSync(join(beansDir, 'new.md'), leaf('new', 'New'));
    const completed: BeanRef = { id: 'completed', path: join(beansDir, 'completed.md'), title: 'Completed' };
    const state: RunState = {
      schemaVersion: 1,
      runId: 'refresh-run',
      parentBean: { id: 'epic', path: join(beansDir, 'epic.md'), title: 'Epic' },
      manifest: {
        parentBean: { id: 'epic', path: join(beansDir, 'epic.md'), title: 'Epic' },
        frozenAt: '2026-08-17T00:00:00Z',
        executableLeaves: [completed, { id: 'current', path: join(beansDir, 'current.md'), title: 'Current' }],
      },
      phase: 'running',
      baseBranch: 'main',
      baseCommit: 'abc123',
      worktreePath: realpathSync(cwd),
      selectedLeaf: null,
      blockers: [],
      attempts: {},
      startedAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T00:00:00Z',
    };
    persistRunState(state, cwd);
    armRun(state.runId, cwd);

    try {
      const refresh = parse(handleRequest(req(5, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `refresh the manifest in worktree ${cwd}` },
      })))!;
      const text = (refresh.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/Refreshed Beanflow run refresh-run/);
      const refreshed = loadRunState(state.runId, cwd);
      expect(refreshed.manifest.frozenAt).not.toBe(state.manifest.frozenAt);
      expect(refreshed.manifest.executableLeaves.map((item) => item.id)).toEqual(['completed', 'current', 'new']);
      expect(refreshed.selectedLeaf?.id).toBe('current');
    } finally {
      disarmRun(cwd);
    }
  });

  it('does not turn a completed leaf parent into executable work during refresh', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'beanflow-mcp-refresh-grouping-'));
    execFileSync('git', ['init', '-q', '-b', 'f/refresh-grouping'], { cwd });
    const beansDir = join(cwd, '.beans');
    mkdirSync(beansDir);
    writeFileSync(
      join(beansDir, 'epic.md'),
      `---\n# epic\ntitle: Epic\nstatus: in-progress\ntype: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n`,
    );
    writeFileSync(
      join(beansDir, 'group.md'),
      `---\n# group\ntitle: Group\nstatus: todo\ntype: feature\nparent: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\nThis is a container Bean; execute its child tasks.\n`,
    );
    writeFileSync(
      join(beansDir, 'new.md'),
      `---\n# new\ntitle: New\nstatus: todo\ntype: task\nparent: epic\ncreated_at: 2026-08-17T00:00:00Z\nupdated_at: 2026-08-17T00:00:00Z\n---\n\n## What to build\n\nImplement one bounded behavior with enough context for autonomous work.\n\n## Acceptance criteria\n\n- [ ] The behavior works.\n\n## Verification\n\nRun the focused test.\n\n## Out of scope\n\nDo not change unrelated behavior.\n`,
    );
    const completed: BeanRef = { id: 'completed', path: join(beansDir, 'completed.md'), title: 'Completed' };
    const group: BeanRef = { id: 'group', path: join(beansDir, 'group.md'), title: 'Group' };
    const state = {
      schemaVersion: 1,
      runId: 'refresh-grouping-run',
      parentBean: { id: 'epic', path: join(beansDir, 'epic.md'), title: 'Epic' },
      manifest: {
        parentBean: { id: 'epic', path: join(beansDir, 'epic.md'), title: 'Epic' },
        frozenAt: '2026-08-17T00:00:00Z',
        groupingBeans: [group],
        executableLeaves: [completed],
      },
      phase: 'running',
      baseBranch: 'main',
      baseCommit: 'abc123',
      worktreePath: realpathSync(cwd),
      selectedLeaf: null,
      blockers: [],
      attempts: {},
      startedAt: '2026-08-17T00:00:00Z',
      updatedAt: '2026-08-17T00:00:00Z',
    } as RunState;
    persistRunState(state, cwd);
    armRun(state.runId, cwd);

    try {
      const refresh = parse(handleRequest(req(6, 'tools/call', {
        name: 'beanflow',
        arguments: { request: `refresh the manifest in worktree ${cwd}` },
      })))!;
      const text = (refresh.result as { content: { text: string }[] }).content[0].text;
      expect(text).toMatch(/Refreshed Beanflow run refresh-grouping-run/);
      const refreshed = loadRunState(state.runId, cwd);
      expect(refreshed.manifest.executableLeaves.map((item) => item.id)).toEqual(['completed', 'new']);
    } finally {
      disarmRun(cwd);
    }
  });

  it('dispatches land as guidance', () => {
    const land = parse(handleRequest(req(7, 'tools/call', { name: 'beanflow', arguments: { request: 'land it' } })))!;
    expect((land.result as { content: { text: string }[] }).content[0].text).toMatch(/approval/);
  });

  it('errors on an unknown tool', () => {
    const resp = parse(handleRequest(req(8, 'tools/call', { name: 'nope', arguments: {} })))!;
    expect(resp.error).toBeDefined();
  });
});
