// Run state persistence and status read. State lives under
// ~/.local/state/beanflow/ by default, overridable with BEANFLOW_STATE_DIR.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { BeanRef, BlockerReceipt, RunPhase, RunState } from './types.js';
import { deserializeState, serializeState } from './state.js';

export function stateDir(): string {
  return process.env.BEANFLOW_STATE_DIR || join(homedir(), '.local', 'state', 'beanflow');
}

export function stateFile(runId: string): string {
  return join(stateDir(), `${runId}.json`);
}

/** Persist a RunState, returning the absolute file path. */
export function persistRunState(state: RunState): string {
  const dir = stateDir();
  mkdirSync(dir, { recursive: true });
  const file = stateFile(state.runId);
  writeFileSync(file, serializeState(state), 'utf8');
  return file;
}

export function loadRunState(runId: string): RunState {
  return deserializeState(readFileSync(stateFile(runId), 'utf8'));
}

/** Resolve the isolated worktree that owns a run, including legacy states. */
export function runWorktreePath(state: RunState, fallbackCwd: string): string {
  if (state.worktreePath) return resolve(state.worktreePath);
  if (isAbsolute(state.parentBean.path)) return dirname(dirname(state.parentBean.path));
  return resolve(fallbackCwd);
}

export function isRunWorktree(state: RunState, cwd: string): boolean {
  return resolve(cwd) === runWorktreePath(state, cwd);
}

/** Whether the worktree recorded by a run still exists on disk. */
export function runWorktreeExists(state: RunState, fallbackCwd: string): boolean {
  return existsSync(runWorktreePath(state, fallbackCwd));
}

const ACTIVE_RUN_MARKER = 'active-run.json';

export function activeRunMarkerPath(): string {
  return join(stateDir(), ACTIVE_RUN_MARKER);
}

/** Mark a run as active so the extension resumes it across turns and restarts. */
export function armRun(runId: string): void {
  mkdirSync(stateDir(), { recursive: true });
  writeFileSync(activeRunMarkerPath(), `${runId}\n`, 'utf8');
}

export function disarmRun(): void {
  const path = activeRunMarkerPath();
  if (existsSync(path)) rmSync(path);
}

export function activeRunId(): string | null {
  const path = activeRunMarkerPath();
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8').trim();
  return raw || null;
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
