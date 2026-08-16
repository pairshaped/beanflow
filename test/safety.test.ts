import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkBounds,
  createHardStop,
  isDeadlinePassed,
  isHardStopped,
  isRetryExhausted,
  removeHardStop,
  shouldStop,
  totalAttempts,
} from '../src/core/safety.js';
import type { RunState } from '../src/core/types.js';

function state(overrides: Partial<RunState> = {}): RunState {
  return {
    schemaVersion: 1,
    runId: 'r1',
    parentBean: { id: 'e', path: '.beans/e.md', title: 'E' },
    manifest: { parentBean: { id: 'e', path: '.beans/e.md', title: 'E' }, frozenAt: 't0', executableLeaves: [] },
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

describe('hard stop', () => {
  it('halts while the stop file exists and resumes when removed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beanflow-safety-'));
    expect(isHardStopped(dir)).toBe(false);
    createHardStop(dir);
    expect(isHardStopped(dir)).toBe(true);
    removeHardStop(dir);
    expect(isHardStopped(dir)).toBe(false);
  });
});

describe('retry ceiling', () => {
  it('is exhausted once total attempts reach the ceiling', () => {
    expect(isRetryExhausted(state({ attempts: { a: 1, b: 2 }, retryCeiling: 3 }))).toBe(true);
    expect(isRetryExhausted(state({ attempts: { a: 1 }, retryCeiling: 3 }))).toBe(false);
  });

  it('is not exhausted when no ceiling is set', () => {
    expect(isRetryExhausted(state({ attempts: { a: 10 } }))).toBe(false);
  });
});

describe('deadline', () => {
  it('is passed when now is at or after the deadline', () => {
    expect(isDeadlinePassed('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')).toBe(true);
    expect(isDeadlinePassed('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(false);
    expect(isDeadlinePassed(null, '2026-01-02T00:00:00Z')).toBe(false);
  });
});

describe('checkBounds and shouldStop', () => {
  it('stops on any single bound', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beanflow-safety-'));
    createHardStop(dir);
    expect(shouldStop(checkBounds(state(), dir, '2026-01-01T00:00:00Z'))).toBe(true);
    removeHardStop(dir);
    expect(shouldStop(checkBounds(state({ attempts: { a: 3 }, retryCeiling: 3 }), dir, '2026-01-01T00:00:00Z'))).toBe(true);
    expect(shouldStop(checkBounds(state({ deadline: '2026-01-01T00:00:00Z' }), dir, '2026-01-02T00:00:00Z'))).toBe(true);
  });

  it('does not stop when nothing is exceeded', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beanflow-safety-'));
    expect(shouldStop(checkBounds(state(), dir, '2026-01-01T00:00:00Z'))).toBe(false);
  });

  it('totalAttempts sums across leaves', () => {
    expect(totalAttempts(state({ attempts: { a: 1, b: 2, c: 4 } }))).toBe(7);
  });
});
