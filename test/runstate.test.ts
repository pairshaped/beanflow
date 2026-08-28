import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { activeRunId, armRun, disarmRun, loadRunState, persistRunState, stateDir, stateFile, statusOf, worktreeStateDir } from '../src/core/runstate.js';
import type { RunState } from '../src/core/types.js';

const origEnv = process.env.BEANFLOW_STATE_DIR;
afterEach(() => {
  if (origEnv === undefined) delete process.env.BEANFLOW_STATE_DIR;
  else process.env.BEANFLOW_STATE_DIR = origEnv;
});

function sampleState(): RunState {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    parentBean: { id: 'e', path: '.beans/e.md', title: 'Epic' },
    manifest: {
      parentBean: { id: 'e', path: '.beans/e.md', title: 'Epic' },
      frozenAt: '2026-08-16T00:00:00Z',
      executableLeaves: [{ id: 'a', path: '.beans/a.md', title: 'A' }],
    },
    phase: 'running',
    baseBranch: null,
    baseCommit: null,
    selectedLeaf: { id: 'a', path: '.beans/a.md', title: 'A' },
    blockers: [],
    attempts: {},
    startedAt: '2026-08-16T00:00:00Z',
    updatedAt: '2026-08-16T00:00:00Z',
  };
}

describe('run state persistence', () => {
  it('persists and loads round-trip, honoring BEANFLOW_STATE_DIR', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beanflow-state-'));
    process.env.BEANFLOW_STATE_DIR = dir;
    const state = sampleState();
    const file = persistRunState(state);
    expect(file).toBe(join(dir, 'run-1.json'));
    expect(loadRunState('run-1')).toEqual(state);
    expect(readFileSync(file, 'utf8')).toContain('"runId": "run-1"');
  });

  it('defaults the state dir under the home state directory', () => {
    delete process.env.BEANFLOW_STATE_DIR;
    expect(stateDir()).toMatch(/\.local\/state\/beanflow$/);
  });

  it('reports phase and selected leaf via statusOf', () => {
    const status = statusOf(sampleState());
    expect(status.phase).toBe('running');
    expect(status.selectedLeaf?.id).toBe('a');
  });
});

describe('active run marker', () => {
  it('arms, reports, and disarms the active run', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beanflow-state-'));
    process.env.BEANFLOW_STATE_DIR = dir;
    expect(activeRunId()).toBeNull();
    armRun('run-9');
    expect(activeRunId()).toBe('run-9');
    disarmRun();
    expect(activeRunId()).toBeNull();
  });

  it('stores worktree run metadata in private Git state', () => {
    const repo = mkdtempSync(join(tmpdir(), 'beanflow-worktree-state-'));
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
    const state = { ...sampleState(), worktreePath: realpathSync(repo) };

    persistRunState(state, repo);
    armRun(state.runId, repo);

    expect(worktreeStateDir(repo)).toContain(join('.git', 'beanflow'));
    expect(activeRunId(repo)).toBe(state.runId);
    expect(loadRunState(state.runId, repo)).toEqual(state);
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' })).toBe('');
    disarmRun(repo);
  });

  it('migrates a matching legacy global run into its worktree state', () => {
    process.env.BEANFLOW_STATE_DIR = mkdtempSync(join(tmpdir(), 'beanflow-legacy-global-'));
    const repo = mkdtempSync(join(tmpdir(), 'beanflow-legacy-state-'));
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
    const state = { ...sampleState(), worktreePath: realpathSync(repo) };

    persistRunState(state);
    armRun(state.runId);

    expect(activeRunId(repo)).toBe(state.runId);
    expect(activeRunId()).toBeNull();
    expect(() => readFileSync(stateFile(state.runId), 'utf8')).toThrow();
    expect(loadRunState(state.runId, repo)).toEqual(state);
    disarmRun(repo);
  });
});
