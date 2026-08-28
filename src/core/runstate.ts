// Run state persistence and status read. Active state lives in each worktree's
// private Git metadata. The home state directory remains the legacy and
// non-Git fallback, overridable with BEANFLOW_STATE_DIR.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { BeanRef, BlockerReceipt, RunPhase, RunState } from './types.js';
import { deserializeState, serializeState } from './state.js';

export function stateDir(): string {
  return process.env.BEANFLOW_STATE_DIR || join(homedir(), '.local', 'state', 'beanflow');
}

export function worktreeStateDir(worktreePath: string): string {
  try {
    return execFileSync(
      'git',
      ['-C', worktreePath, 'rev-parse', '--path-format=absolute', '--git-path', 'beanflow'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  } catch {
    return stateDir();
  }
}

function stateDirectory(worktreePath?: string): string {
  return worktreePath ? worktreeStateDir(worktreePath) : stateDir();
}

export function stateFile(runId: string, worktreePath?: string): string {
  return join(stateDirectory(worktreePath), `${runId}.json`);
}

/** Persist a RunState, returning the absolute file path. */
export function persistRunState(state: RunState, worktreePath?: string): string {
  const dir = stateDirectory(worktreePath);
  mkdirSync(dir, { recursive: true });
  const file = stateFile(state.runId, worktreePath);
  writeFileSync(file, serializeState(state), 'utf8');
  return file;
}

export function loadRunState(runId: string, worktreePath?: string): RunState {
  const localFile = stateFile(runId, worktreePath);
  const file = worktreePath && !existsSync(localFile) ? stateFile(runId) : localFile;
  return deserializeState(readFileSync(file, 'utf8'));
}

/** Resolve the isolated worktree that owns a run, including legacy states. */
export function runWorktreePath(state: RunState, fallbackCwd: string): string {
  if (state.worktreePath) return resolve(state.worktreePath);
  if (isAbsolute(state.parentBean.path)) return dirname(dirname(state.parentBean.path));
  return resolve(fallbackCwd);
}

export function isRunWorktree(state: RunState, cwd: string): boolean {
  const actualCwd = existsSync(cwd) ? realpathSync(cwd) : resolve(cwd);
  const recordedPath = runWorktreePath(state, cwd);
  const actualRecordedPath = existsSync(recordedPath) ? realpathSync(recordedPath) : recordedPath;
  return actualCwd === actualRecordedPath;
}

/** Whether the worktree recorded by a run still exists on disk. */
export function runWorktreeExists(state: RunState, fallbackCwd: string): boolean {
  return existsSync(runWorktreePath(state, fallbackCwd));
}

const ACTIVE_RUN_MARKER = 'active-run.json';

export function activeRunMarkerPath(worktreePath?: string): string {
  return join(stateDirectory(worktreePath), ACTIVE_RUN_MARKER);
}

/** Mark a run as active so the extension resumes it across turns and restarts. */
export function armRun(runId: string, worktreePath?: string): void {
  mkdirSync(stateDirectory(worktreePath), { recursive: true });
  writeFileSync(activeRunMarkerPath(worktreePath), `${runId}\n`, 'utf8');
}

export function disarmRun(worktreePath?: string): void {
  const path = activeRunMarkerPath(worktreePath);
  if (existsSync(path)) rmSync(path);
}

function markerRunId(path: string): string | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8').trim();
  return raw || null;
}

export function activeRunId(worktreePath?: string): string | null {
  const localId = markerRunId(activeRunMarkerPath(worktreePath));
  if (localId || !worktreePath) return localId;

  const legacyId = markerRunId(activeRunMarkerPath());
  if (!legacyId) return null;
  try {
    const legacyState = loadRunState(legacyId);
    if (!isRunWorktree(legacyState, worktreePath)) return null;
    persistRunState(legacyState, worktreePath);
    armRun(legacyId, worktreePath);
    disarmRun();
    const legacyFile = stateFile(legacyId);
    if (existsSync(legacyFile)) rmSync(legacyFile);
    return legacyId;
  } catch {
    return null;
  }
}

export interface RunStatus {
  phase: RunPhase;
  selectedLeaf: BeanRef | null;
  blockers: BlockerReceipt[];
  updatedAt: string;
}

export function statusOf(state: RunState): RunStatus {
  return {
    phase: state.phase,
    selectedLeaf: state.selectedLeaf,
    blockers: state.blockers,
    updatedAt: state.updatedAt,
  };
}
