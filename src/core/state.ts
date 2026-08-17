// State file schema: serialize and validate RunState. Filesystem persistence
// and the state-directory override live in a later leaf; this module only
// defines the schema and its round-trip.

import type { BeanRef, RunPhase, RunState, ScopeManifest } from './types.js';

const RUN_PHASES: readonly RunPhase[] = ['armed', 'setting-up', 'running', 'paused', 'completed'];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isBeanRef(x: unknown): x is BeanRef {
  return isRecord(x) && isString(x.id) && isString(x.path) && isString(x.title);
}

function isScopeManifest(x: unknown): x is ScopeManifest {
  return (
    isRecord(x) &&
    isBeanRef(x.parentBean) &&
    isString(x.frozenAt) &&
    Array.isArray(x.executableLeaves) &&
    x.executableLeaves.every(isBeanRef)
  );
}

function isRunPhase(x: unknown): x is RunPhase {
  return isString(x) && (RUN_PHASES as readonly string[]).includes(x);
}

function isBlockerReceipt(x: unknown): boolean {
  return (
    isRecord(x) &&
    isBeanRef(x.leaf) &&
    isString(x.evidence) &&
    isString(x.requiredDecision) &&
    isString(x.recordedAt)
  );
}

function isRunState(x: unknown): x is RunState {
  if (!isRecord(x)) return false;
  if (x.schemaVersion !== 1) return false;
  return (
    isString(x.runId) &&
    isBeanRef(x.parentBean) &&
    isScopeManifest(x.manifest) &&
    isRunPhase(x.phase) &&
    (x.baseBranch === null || isString(x.baseBranch)) &&
    (x.baseCommit === null || isString(x.baseCommit)) &&
    (x.worktreePath === undefined || x.worktreePath === null || isString(x.worktreePath)) &&
    (x.selectedLeaf === null || isBeanRef(x.selectedLeaf)) &&
    Array.isArray(x.blockers) &&
    x.blockers.every(isBlockerReceipt) &&
    isRecord(x.attempts) &&
    Object.values(x.attempts).every((v) => typeof v === 'number') &&
    isString(x.startedAt) &&
    isString(x.updatedAt)
  );
}

export function serializeState(state: RunState): string {
  if (!isRunState(state)) {
    throw new Error('refusing to serialize an invalid RunState');
  }
  return JSON.stringify(state, null, 2);
}

export function deserializeState(json: string): RunState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`invalid state JSON: ${(err as Error).message}`);
  }
  if (!isRunState(parsed)) {
    throw new Error('invalid RunState shape or unsupported schema version');
  }
  return parsed;
}

export function roundTripState(state: RunState): RunState {
  return deserializeState(serializeState(state));
}
