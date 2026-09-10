import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { discoverBeans, tasks } from '../src/core/discovery.js';

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

describe('discoverBeans', () => {
  it('parses the fixture directory into a correct hierarchy and blocked-by graph', () => {
    const tree = discoverBeans(fixtures);
    expect(tree.byId.has('beanflow-aaaa')).toBe(true);
    expect(tree.childrenOf.get('beanflow-aaaa')?.map((b) => b.id)).toEqual(['beanflow-bbbb']);
    expect(tree.childrenOf.get('beanflow-bbbb')?.map((b) => b.id).sort()).toEqual(
      ['beanflow-cccc', 'beanflow-dddd', 'beanflow-eeee', 'beanflow-ffff'].sort(),
    );
    const dddd = tree.byId.get('beanflow-dddd')!;
    expect(dddd.parent).toBe('beanflow-bbbb');
    expect(dddd.blockedBy).toEqual(['beanflow-cccc']);
  });

  it('classifies milestone beans and executable tasks', () => {
    const tree = discoverBeans(fixtures);
    expect(tree.kindOf.get('beanflow-aaaa')).toBe('epic');
    expect(tree.kindOf.get('beanflow-bbbb')).toBe('milestone');
    expect(tree.kindOf.get('beanflow-cccc')).toBe('task');
    expect(tree.kindOf.get('beanflow-dddd')).toBe('task');
    expect(tasks(tree).map((b) => b.id).sort()).toEqual(
      ['beanflow-cccc', 'beanflow-dddd', 'beanflow-eeee', 'beanflow-ffff'].sort(),
    );
  });

  it('does not modify bean files', () => {
    const before = readdirSync(fixtures).sort();
    discoverBeans(fixtures);
    const after = readdirSync(fixtures).sort();
    expect(after).toEqual(before);
  });
});
