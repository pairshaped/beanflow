import { describe, expect, it } from 'vitest';
import type { Bean } from '../src/core/bean.js';
import { selectNextTask } from '../src/core/selection.js';

function bean(id: string, opts: Partial<Bean> = {}): Bean {
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

describe('selectNextTask', () => {
  it('selects the earliest created task when nothing blocks or is done', () => {
    const a = bean('a', { createdAt: '2026-01-01T00:00:00Z' });
    const b = bean('b', { createdAt: '2026-01-02T00:00:00Z' });
    expect(selectNextTask([b, a], new Set(), new Set())?.id).toBe('a');
  });

  it('waits for a task whose blocker is not done', () => {
    const a = bean('a');
    const b = bean('b', { blockedBy: ['a'] });
    expect(selectNextTask([a, b], new Set(), new Set())?.id).toBe('a');
    expect(selectNextTask([a, b], new Set(['a']), new Set())?.id).toBe('b');
  });

  it('skips blocked tasks', () => {
    const a = bean('a');
    const b = bean('b');
    expect(selectNextTask([a, b], new Set(), new Set(['a']))?.id).toBe('b');
  });

  it('never selects terminal tasks', () => {
    const completed = bean('completed', { status: 'completed' });
    const scrapped = bean('scrapped', { status: 'scrapped' });
    const todo = bean('todo');
    expect(selectNextTask([completed, scrapped, todo], new Set(), new Set())?.id).toBe('todo');
    expect(selectNextTask([completed, scrapped], new Set(), new Set())).toBeNull();
  });

  it('breaks ties by priority then creation order', () => {
    const low = bean('low', { priority: 'low', createdAt: '2026-01-01T00:00:00Z' });
    const high = bean('high', { priority: 'high', createdAt: '2026-01-02T00:00:00Z' });
    expect(selectNextTask([low, high], new Set(), new Set())?.id).toBe('high');
    const n1 = bean('n1', { priority: 'normal', createdAt: '2026-01-01T00:00:00Z' });
    const n2 = bean('n2', { priority: 'normal', createdAt: '2026-01-02T00:00:00Z' });
    expect(selectNextTask([n2, n1], new Set(), new Set())?.id).toBe('n1');
  });

  it('returns null when nothing is ready', () => {
    const a = bean('a', { blockedBy: ['b'] });
    const b = bean('b', { blockedBy: ['a'] });
    expect(selectNextTask([a, b], new Set(), new Set())).toBeNull();
  });
});
