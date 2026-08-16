// Run state persistence and status read. State lives under
// ~/.local/state/beanflow/ by default, overridable with BEANFLOW_STATE_DIR.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
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
