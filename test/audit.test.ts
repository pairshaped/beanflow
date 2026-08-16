import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { auditLeaf, auditTree } from '../src/core/audit.js';
import { discoverBeans, type BeanTree } from '../src/core/discovery.js';

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

function audit(tree: BeanTree, id: string) {
  const leaf = tree.byId.get(id)!;
  return auditLeaf(leaf, tree);
}

describe('auditLeaf', () => {
  const tree = discoverBeans(fixtures);

  it('passes a complete leaf', () => {
    expect(audit(tree, 'beanflow-cccc').passed).toBe(true);
    expect(audit(tree, 'beanflow-dddd').passed).toBe(true);
  });

  it('flags a leaf missing acceptance criteria, verification, and scope bounds', () => {
    const result = audit(tree, 'beanflow-eeee');
    expect(result.passed).toBe(false);
    const failed = result.findings.filter((f) => !f.pass).map((f) => f.check);
    expect(failed).toContain('acceptance-criteria');
    expect(failed).toContain('verification');
    expect(failed).toContain('safe-autonomy');
  });

  it('flags a leaf with an unresolvable dependency', () => {
    const result = audit(tree, 'beanflow-ffff');
    expect(result.passed).toBe(false);
    const dep = result.findings.find((f) => f.check === 'dependencies');
    expect(dep?.pass).toBe(false);
  });

  it('audits every executable leaf and only leaves', () => {
    const results = auditTree(tree);
    const ids = results.map((r) => r.leaf.id).sort();
    expect(ids).toEqual(['beanflow-cccc', 'beanflow-dddd', 'beanflow-eeee', 'beanflow-ffff'].sort());
  });
});
