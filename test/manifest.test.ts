import { describe, expect, it } from 'vitest';
import type { Bean } from '../src/core/bean.js';
import { buildTree } from '../src/core/discovery.js';
import { FatalError } from '../src/core/failure.js';
import { freezeManifest } from '../src/core/manifest.js';

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

describe('freezeManifest', () => {
  it('freezes Milestones and their Tasks in dependency order', () => {
    const epic = bean('e', { type: 'epic' });
    const grp = bean('g', { type: 'feature', parent: 'e' });
    const a = bean('a', { parent: 'g' });
    const b = bean('b', { parent: 'g', blockedBy: ['a'] });
    const c = bean('c', { parent: 'g', blockedBy: ['a', 'b'] });
    const manifest = freezeManifest(buildTree([epic, grp, a, b, c]), 'e', 't0');
    expect(manifest.milestones.map((scope) => scope.milestone.id)).toEqual(['g']);
    expect(manifest.milestones[0].tasks.map((task) => task.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps completed Tasks as history, omits scrapped Tasks, and satisfies completed dependencies', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e' });
    const completed = bean('a', { parent: 'm', status: 'completed' });
    const scrapped = bean('unused', { parent: 'm', status: 'scrapped' });
    const remaining = bean('b', { parent: 'm', blockedBy: ['a'] });
    const manifest = freezeManifest(buildTree([epic, milestone, completed, scrapped, remaining]), 'e', 't0');
    expect(manifest.milestones[0].tasks.map((task) => task.id)).toEqual(['a', 'b']);
  });

  it('rejects a remaining task blocked by a scrapped dependency', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e' });
    const scrapped = bean('a', { parent: 'm', status: 'scrapped' });
    const remaining = bean('b', { parent: 'm', blockedBy: ['a'] });
    expect(() => freezeManifest(buildTree([epic, milestone, scrapped, remaining]), 'e', 't0')).toThrow(
      /blocked by scrapped Bean a/,
    );
  });

  it('rejects an unknown parent', () => {
    const tree = buildTree([bean('a')]);
    expect(() => freezeManifest(tree, 'nope', 't0')).toThrow(FatalError);
  });

  it('rejects a task as the parent', () => {
    const tree = buildTree([bean('a')]);
    expect(() => freezeManifest(tree, 'a', 't0')).toThrow(/not an Epic/);
  });

  it('rejects a task blocked by an unknown bean', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e' });
    const a = bean('a', { parent: 'm', blockedBy: ['zzz'] });
    expect(() => freezeManifest(buildTree([epic, milestone, a]), 'e', 't0')).toThrow(/unknown Bean/);
  });

  it('rejects a task blocked by a bean outside the scope', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e' });
    const inScope = bean('a', { parent: 'm' });
    const outside = bean('x');
    const bad = bean('b', { parent: 'm', blockedBy: ['x'] });
    expect(() => freezeManifest(buildTree([epic, milestone, inScope, outside, bad]), 'e', 't0')).toThrow(
      /outside its checkpoint scope/,
    );
  });

  it('rejects a dependency cycle', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e' });
    const a = bean('a', { parent: 'm', blockedBy: ['b'] });
    const b = bean('b', { parent: 'm', blockedBy: ['a'] });
    expect(() => freezeManifest(buildTree([epic, milestone, a, b]), 'e', 't0')).toThrow(/cycle/);
  });

  it('is deterministic across freezes', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e' });
    const a = bean('a', { parent: 'm' });
    const b = bean('b', { parent: 'm' });
    const c = bean('c', { parent: 'm' });
    const tree = buildTree([epic, milestone, a, b, c]);
    const m1 = freezeManifest(tree, 'e', 't0');
    const m2 = freezeManifest(tree, 'e', 't1');
    expect(m1.milestones).toEqual(m2.milestones);
  });

  it('rejects a Task directly under an Epic', () => {
    const epic = bean('e', { type: 'epic' });
    const directTask = bean('a', { parent: 'e' });
    expect(() => freezeManifest(buildTree([epic, directTask]), 'e', 't0')).toThrow(/without a Milestone/);
  });

  it('orders Milestones and allows later Tasks to depend on earlier Milestone Tasks', () => {
    const epic = bean('e', { type: 'epic' });
    const first = bean('m1', { type: 'feature', parent: 'e' });
    const second = bean('m2', { type: 'feature', parent: 'e', blockedBy: ['m1'] });
    const a = bean('a', { parent: 'm1' });
    const b = bean('b', { parent: 'm2', blockedBy: ['a'] });
    const manifest = freezeManifest(buildTree([epic, second, b, first, a]), 'e', 't0');

    expect(manifest.milestones.map((scope) => scope.milestone.id)).toEqual(['m1', 'm2']);
    expect(manifest.milestones.map((scope) => scope.tasks.map((task) => task.id))).toEqual([['a'], ['b']]);
  });

  it('rejects incomplete work added beneath a completed Milestone', () => {
    const epic = bean('e', { type: 'epic' });
    const milestone = bean('m', { type: 'feature', parent: 'e', status: 'completed' });
    const task = bean('a', { parent: 'm' });
    expect(() => freezeManifest(buildTree([epic, milestone, task]), 'e', 't0')).toThrow(
      /completed Milestone m contains an incomplete Task/,
    );
  });
});
