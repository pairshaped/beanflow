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
    ...opts,
  };
}

describe('freezeManifest', () => {
  it('freezes descendants in dependency order', () => {
    const epic = bean('e', { type: 'epic' });
    const grp = bean('g', { type: 'feature', parent: 'e' });
    const a = bean('a', { parent: 'g' });
    const b = bean('b', { parent: 'g', blockedBy: ['a'] });
    const c = bean('c', { parent: 'g', blockedBy: ['a', 'b'] });
    const manifest = freezeManifest(buildTree([epic, grp, a, b, c]), 'e', 't0');
    expect(manifest.executableLeaves.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('rejects an unknown parent', () => {
    const tree = buildTree([bean('a')]);
    expect(() => freezeManifest(tree, 'nope', 't0')).toThrow(FatalError);
  });

  it('rejects a leaf as the parent', () => {
    const tree = buildTree([bean('a')]);
    expect(() => freezeManifest(tree, 'a', 't0')).toThrow(/not a grouping/);
  });

  it('rejects a leaf blocked by an unknown bean', () => {
    const epic = bean('e', { type: 'epic' });
    const a = bean('a', { parent: 'e', blockedBy: ['zzz'] });
    expect(() => freezeManifest(buildTree([epic, a]), 'e', 't0')).toThrow(/unknown bean/);
  });

  it('rejects a leaf blocked by a bean outside the scope', () => {
    const epic = bean('e', { type: 'epic' });
    const inScope = bean('a', { parent: 'e' });
    const outside = bean('x');
    const bad = bean('b', { parent: 'e', blockedBy: ['x'] });
    expect(() => freezeManifest(buildTree([epic, inScope, outside, bad]), 'e', 't0')).toThrow(
      /outside the frozen scope/,
    );
  });

  it('rejects a dependency cycle', () => {
    const epic = bean('e', { type: 'epic' });
    const a = bean('a', { parent: 'e', blockedBy: ['b'] });
    const b = bean('b', { parent: 'e', blockedBy: ['a'] });
    expect(() => freezeManifest(buildTree([epic, a, b]), 'e', 't0')).toThrow(/cycle/);
  });

  it('is deterministic across freezes', () => {
    const epic = bean('e', { type: 'epic' });
    const a = bean('a', { parent: 'e' });
    const b = bean('b', { parent: 'e' });
    const c = bean('c', { parent: 'e' });
    const tree = buildTree([epic, a, b, c]);
    const m1 = freezeManifest(tree, 'e', 't0');
    const m2 = freezeManifest(tree, 'e', 't1');
    expect(m1.executableLeaves.map((x) => x.id)).toEqual(m2.executableLeaves.map((x) => x.id));
  });
});
