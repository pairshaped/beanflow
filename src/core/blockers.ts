// Blocker handling: record actionable evidence, keep the Bean present, skip to
// independent tasks, reconsider after prerequisites change, and detect stalls.

import { appendFileSync } from 'node:fs';
import type { Bean } from './bean.js';
import type { BlockerReceipt, RunState } from './types.js';

export const DEFAULT_STALL_THRESHOLD = 3;

export function makeBlockerReceipt(
  task: Bean,
  evidence: string,
  requiredDecision: string,
  recordedAt: string,
): BlockerReceipt {
  return {
    task: { id: task.id, path: task.path, title: task.title },
    evidence,
    requiredDecision,
    recordedAt,
  };
}

export function recordBlocker(state: RunState, receipt: BlockerReceipt): RunState {
  return { ...state, blockers: [...state.blockers, receipt] };
}

export function blockedTaskIds(state: RunState): Set<string> {
  return new Set(state.blockers.map((b) => b.task.id));
}

export function clearBlocker(state: RunState, taskId: string): RunState {
  return { ...state, blockers: state.blockers.filter((b) => b.task.id !== taskId) };
}

export function bumpAttempt(state: RunState, taskId: string): RunState {
  return { ...state, attempts: { ...state.attempts, [taskId]: (state.attempts[taskId] ?? 0) + 1 } };
}

export function resetAttempts(state: RunState, taskId: string): RunState {
  const attempts = { ...state.attempts };
  delete attempts[taskId];
  return { ...state, attempts };
}

export function isStalled(
  state: RunState,
  taskId: string,
  threshold: number = DEFAULT_STALL_THRESHOLD,
): boolean {
  return (state.attempts[taskId] ?? 0) >= threshold;
}

export function blockerSection(receipt: BlockerReceipt): string {
  return [
    '## Blocker',
    '',
    `**Evidence:** ${receipt.evidence}`,
    `**Required decision:** ${receipt.requiredDecision}`,
    `**Recorded at:** ${receipt.recordedAt}`,
    '',
  ].join('\n');
}

/** Append blocker evidence to a Bean file immediately. */
export function appendBlockerEvidence(beanPath: string, receipt: BlockerReceipt): void {
  appendFileSync(beanPath, `\n${blockerSection(receipt)}`, 'utf8');
}
