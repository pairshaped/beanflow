import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Bean } from '../src/core/bean.js';
import {
  appendBlockerEvidence,
  blockedTaskIds,
  bumpAttempt,
  clearBlocker,
  DEFAULT_STALL_THRESHOLD,
  isStalled,
  recordBlocker,
  resetAttempts,
} from '../src/core/blockers.js';
import { selectNextTask } from '../src/core/selection.js';
import type { RunState } from '../src/core/types.js';

function task(id: string, opts: Partial<Bean> = {}): Bean {
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
    schemaVersion: 3,
    runId: 'r1',
    epic: { id: 'e', path: '.beans/e.md', title: 'E' },
    manifest: {
      epic: { id: 'e', path: '.beans/e.md', title: 'E' },
      frozenAt: 't0',
      milestones: [],
    },
    phase: 'running',
    baseBranch: null,
    baseCommit: null,
    selectedTask: null,
    selectedMilestone: null,
    blockers: [],
    attempts: {},
    startedAt: 't0',
    updatedAt: 't0',
    ...overrides,
  };
}

describe('blocker recording', () => {
  it('records a blocker and derives the blocked set without mutating the original', () => {
    const a = task('a');
    const s = runState();
    const receipt = {
      task: { id: a.id, path: a.path, title: a.title },
      evidence: 'needs X',
      requiredDecision: 'choose X or Y',
      recordedAt: 't1',
    };
    const next = recordBlocker(s, receipt);
    expect(next.blockers).toHaveLength(1);
    expect(blockedTaskIds(next)).toEqual(new Set(['a']));
    expect(s.blockers).toHaveLength(0);
  });

  it('lets selection continue with independent tasks while one is blocked', () => {
    const a = task('a', { createdAt: '2026-01-01T00:00:00Z' });
    const b = task('b', { createdAt: '2026-01-02T00:00:00Z' });
    expect(selectNextTask([a, b], new Set(), new Set(['a']))?.id).toBe('b');
  });

  it('reconsiders a blocked task after its blocker is cleared', () => {
    const a = task('a', { createdAt: '2026-01-01T00:00:00Z' });
    const b = task('b', { createdAt: '2026-01-02T00:00:00Z' });
    const s = runState({
      blockers: [
        { task: { id: 'a', path: '.beans/a.md', title: 'a' }, evidence: 'x', requiredDecision: 'y', recordedAt: 't1' },
      ],
    });
    expect(blockedTaskIds(s)).toEqual(new Set(['a']));
    const cleared = clearBlocker(s, 'a');
    expect(blockedTaskIds(cleared)).toEqual(new Set());
    expect(selectNextTask([a, b], new Set(), blockedTaskIds(cleared))?.id).toBe('a');
  });
});

describe('stall detection', () => {
  it('stalls after the default threshold of three no-progress attempts', () => {
    let s = runState();
    s = bumpAttempt(s, 'a');
    s = bumpAttempt(s, 'a');
    expect(isStalled(s, 'a')).toBe(false);
    s = bumpAttempt(s, 'a');
    expect(isStalled(s, 'a')).toBe(true);
    expect(DEFAULT_STALL_THRESHOLD).toBe(3);
  });

  it('resetAttempts clears the counter', () => {
    let s = runState();
    s = bumpAttempt(s, 'a');
    s = resetAttempts(s, 'a');
    expect(isStalled(s, 'a')).toBe(false);
  });
});

describe('appendBlockerEvidence', () => {
  it('writes the evidence to the bean file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beanflow-blocker-'));
    const path = join(dir, 'a.md');
    writeFileSync(path, '---\ntitle: A\n---\n\nbody\n');
    appendBlockerEvidence(path, {
      task: { id: 'a', path, title: 'A' },
      evidence: 'needs X',
      requiredDecision: 'choose',
      recordedAt: 't1',
    });
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('## Blocker');
    expect(content).toContain('needs X');
    expect(content).toContain('choose');
  });
});
