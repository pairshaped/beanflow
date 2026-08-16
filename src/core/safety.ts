// Bounded-continuation safety controls. A hard stop file, a retry ceiling,
// and an optional deadline prevent an unattended run from looping forever.
// Owner stop instructions always win.

import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunState } from './types.js';

export const HARD_STOP_FILE = 'stop';

export function hardStopPath(stateDir: string): string {
  return join(stateDir, HARD_STOP_FILE);
}

export function createHardStop(stateDir: string): void {
  writeFileSync(hardStopPath(stateDir), `${new Date().toISOString()}\n`, 'utf8');
}

export function removeHardStop(stateDir: string): void {
  const path = hardStopPath(stateDir);
  if (existsSync(path)) rmSync(path);
}

export function isHardStopped(stateDir: string): boolean {
  return existsSync(hardStopPath(stateDir));
}

export function totalAttempts(state: RunState): number {
  return Object.values(state.attempts).reduce((a, b) => a + b, 0);
}

export function isRetryExhausted(state: RunState): boolean {
  const ceiling = state.retryCeiling ?? 0;
  return ceiling > 0 && totalAttempts(state) >= ceiling;
}

export function isDeadlinePassed(deadline: string | null | undefined, now: string): boolean {
  if (!deadline) return false;
  return new Date(now).getTime() >= new Date(deadline).getTime();
}

export interface RunBounds {
  hardStopped: boolean;
  retryExhausted: boolean;
  deadlinePassed: boolean;
}

export function checkBounds(state: RunState, stateDir: string, now: string): RunBounds {
  return {
    hardStopped: isHardStopped(stateDir),
    retryExhausted: isRetryExhausted(state),
    deadlinePassed: isDeadlinePassed(state.deadline ?? null, now),
  };
}

export function shouldStop(bounds: RunBounds): boolean {
  return bounds.hardStopped || bounds.retryExhausted || bounds.deadlinePassed;
}
