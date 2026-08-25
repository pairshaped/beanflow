import { describe, expect, it } from 'vitest';
import type { Bean } from '../src/core/bean.js';
import {
  decideContinuation,
  eligibleWorkRemains,
  isAbortedStopReason,
  lastAssistantStopReason,
  nextEligibleLeaf,
  type SessionEntry,
} from '../src/core/continuation.js';
import { buildTree } from '../src/core/discovery.js';
import type { BeanRef, RunState, ScopeManifest } from '../src/core/types.js';

const ref = (id: string): BeanRef => ({ id, path: `.beans/${id}.md`, title: id });

function leaf(id: string, opts: Partial<Bean> = {}): Bean {
  return {
    id,
    path: `.beans/${id}.md`,
    title: id,
    status: 'todo',
    type: 'task',
    parent: null,
    blockedBy: [],
    body: '',
    priority: 'normal',
    createdAt: '2026-08-16T00:00:00Z',
    ...opts,
  };
}

function runState(overrides: Partial<RunState> = {}): RunState {
  return {
    schemaVersion: 1,
    runId: 'r1',
    parentBean: ref('e'),
    manifest: { parentBean: ref('e'), frozenAt: 't0', executableLeaves: [] },
    phase: 'running',
    baseBranch: null,
    baseCommit: null,
    selectedLeaf: null,
    blockers: [],
    attempts: {},
    startedAt: 't0',
    updatedAt: 't0',
    ...overrides,
  };
}

describe('isAbortedStopReason', () => {
  it('is true only for the aborted stop reason', () => {
    expect(isAbortedStopReason('aborted')).toBe(true);
    expect(isAbortedStopReason('stop')).toBe(false);
    expect(isAbortedStopReason('toolUse')).toBe(false);
    expect(isAbortedStopReason(null)).toBe(false);
  });
});

describe('lastAssistantStopReason', () => {
  it('finds the most recent assistant stop reason (newest-first)', () => {
    const entries: SessionEntry[] = [
      { type: 'message', message: { role: 'assistant', stopReason: 'aborted' } },
      { type: 'message', message: { role: 'user' } },
      { type: 'message', message: { role: 'assistant', stopReason: 'stop' } },
    ];
    expect(lastAssistantStopReason(entries)).toBe('aborted');
  });

  it('returns null when no assistant message exists', () => {
    expect(lastAssistantStopReason([{ type: 'message', message: { role: 'user' } }])).toBeNull();
  });
});

describe('decideContinuation', () => {
  it('pauses on an aborted turn even when work remains', () => {
    const d = decideContinuation({ phase: 'running', lastStopReason: 'aborted', eligibleWorkRemains: true });
    expect(d.shouldContinue).toBe(false);
    expect(d.reason).toBe('last turn was aborted');
  });

  it('does not continue while paused', () => {
    const d = decideContinuation({ phase: 'paused', lastStopReason: 'stop', eligibleWorkRemains: true });
    expect(d.shouldContinue).toBe(false);
    expect(d.reason).toBe('run is paused');
  });

  it('does not continue when no work remains', () => {
    const d = decideContinuation({ phase: 'running', lastStopReason: 'stop', eligibleWorkRemains: false });
    expect(d.shouldContinue).toBe(false);
    expect(d.reason).toBe('no eligible work remains');
  });

  it('continues when running, not aborted, and work remains', () => {
    const d = decideContinuation({ phase: 'running', lastStopReason: 'stop', eligibleWorkRemains: true });
    expect(d.shouldContinue).toBe(true);
  });
});

describe('eligibleWorkRemains', () => {
  it('is true when a leaf is selectable', () => {
    const epic = leaf('e', { type: 'epic' });
    const a = leaf('a', { parent: 'e' });
    const b = leaf('b', { parent: 'e', blockedBy: ['a'] });
    const tree = buildTree([epic, a, b]);
    const manifest: ScopeManifest = { parentBean: ref('e'), frozenAt: 't0', executableLeaves: [ref('a'), ref('b')] };
    expect(eligibleWorkRemains(tree, manifest, runState({ manifest }))).toBe(true);
  });

  it('is false when every remaining leaf is blocked', () => {
    const epic = leaf('e', { type: 'epic' });
    const a = leaf('a', { parent: 'e' });
    const tree = buildTree([epic, a]);
    const manifest: ScopeManifest = { parentBean: ref('e'), frozenAt: 't0', executableLeaves: [ref('a')] };
    const state = runState({
      manifest,
      blockers: [{ leaf: ref('a'), evidence: 'x', requiredDecision: 'y', recordedAt: 't1' }],
    });
    expect(eligibleWorkRemains(tree, manifest, state)).toBe(false);
  });

  it('treats a leaf deleted from the tree as completed', () => {
    const epic = leaf('e', { type: 'epic' });
    const b = leaf('b', { parent: 'e', blockedBy: ['a'] });
    const tree = buildTree([epic, b]); // 'a' is gone
    const manifest: ScopeManifest = { parentBean: ref('e'), frozenAt: 't0', executableLeaves: [ref('a'), ref('b')] };
    expect(eligibleWorkRemains(tree, manifest, runState({ manifest }))).toBe(true);
    expect(nextEligibleLeaf(tree, manifest, runState({ manifest }))?.id).toBe('b');
  });

  it('treats a completed manifest leaf as completed even while its file remains', () => {
    const epic = leaf('e', { type: 'epic' });
    const a = leaf('a', { parent: 'e', status: 'completed' });
    const b = leaf('b', { parent: 'e', blockedBy: ['a'] });
    const tree = buildTree([epic, a, b]);
    const manifest: ScopeManifest = { parentBean: ref('e'), frozenAt: 't0', executableLeaves: [ref('a'), ref('b')] };
    expect(nextEligibleLeaf(tree, manifest, runState({ manifest }))?.id).toBe('b');
  });
});
