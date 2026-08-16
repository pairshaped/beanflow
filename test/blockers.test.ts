import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Bean } from '../src/core/bean.js';
import {
  appendBlockerEvidence,
  blockedLeafIds,
  bumpAttempt,
  clearBlocker,
  DEFAULT_STALL_THRESHOLD,
  isStalled,
  recordBlocker,
  resetAttempts,
} from '../src/core/blockers.js';
import { selectNextLeaf } from '../src/core/selection.js';
import type { RunState } from '../src/core/types.js';

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
    parentBean: { id: 'e', path: '.beans/e.md', title: 'E' },
    manifest: {
      parentBean: { id: 'e', path: '.beans/e.md', title: 'E' },
      frozenAt: 't0',
      executableLeaves: [],
    },
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

describe('blocker recording', () => {
  it('records a blocker and derives the blocked set without mutating the original', () => {
    const a = leaf('a');
    const s = runState();
    const receipt = {
      leaf: { id: a.id, path: a.path, title: a.title },
      evidence: 'needs X',
      requiredDecision: 'choose X or Y',
      recordedAt: 't1',
    };
    const next = recordBlocker(s, receipt);
    expect(next.blockers).toHaveLength(1);
    expect(blockedLeafIds(next)).toEqual(new Set(['a']));
    expect(s.blockers).toHaveLength(0);
  });

  it('lets selection continue with independent leaves while one is blocked', () => {
    const a = leaf('a', { createdAt: '2026-01-01T00:00:00Z' });
    const b = leaf('b', { createdAt: '2026-01-02T00:00:00Z' });
    expect(selectNextLeaf([a, b], new Set(), new Set(['a']))?.id).toBe('b');
  });

  it('reconsiders a blocked leaf after its blocker is cleared', () => {
    const a = leaf('a', { createdAt: '2026-01-01T00:00:00Z' });
    const b = leaf('b', { createdAt: '2026-01-02T00:00:00Z' });
    const s = runState({
      blockers: [
        { leaf: { id: 'a', path: '.beans/a.md', title: 'a' }, evidence: 'x', requiredDecision: 'y', recordedAt: 't1' },
      ],
    });
    expect(blockedLeafIds(s)).toEqual(new Set(['a']));
    const cleared = clearBlocker(s, 'a');
    expect(blockedLeafIds(cleared)).toEqual(new Set());
    expect(selectNextLeaf([a, b], new Set(), blockedLeafIds(cleared))?.id).toBe('a');
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
      leaf: { id: 'a', path, title: 'A' },
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
