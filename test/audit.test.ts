import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { auditMilestone, auditTask, auditTree } from '../src/core/audit.js';
import type { Bean } from '../src/core/bean.js';
import { buildTree, discoverBeans, type BeanTree } from '../src/core/discovery.js';

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

function audit(tree: BeanTree, id: string) {
  const task = tree.byId.get(id)!;
  return auditTask(task, tree);
}

describe('auditTask', () => {
  const tree = discoverBeans(fixtures);

  it('passes a complete task', () => {
    expect(audit(tree, 'beanflow-cccc').passed).toBe(true);
    expect(audit(tree, 'beanflow-dddd').passed).toBe(true);
  });

  it('flags a task missing acceptance criteria, verification, and scope bounds', () => {
    const result = audit(tree, 'beanflow-eeee');
    expect(result.passed).toBe(false);
    const failed = result.findings.filter((f) => !f.pass).map((f) => f.check);
    expect(failed).toContain('acceptance-criteria');
    expect(failed).toContain('verification');
    expect(failed).toContain('safe-autonomy');
  });

  it('flags a task with an unresolvable dependency', () => {
    const result = audit(tree, 'beanflow-ffff');
    expect(result.passed).toBe(false);
    const dep = result.findings.find((f) => f.check === 'dependencies');
    expect(dep?.pass).toBe(false);
  });

  it('audits every executable task and only tasks', () => {
    const results = auditTree(tree);
    const ids = results.map((r) => r.task.id).sort();
    expect(ids).toEqual(['beanflow-cccc', 'beanflow-dddd', 'beanflow-eeee', 'beanflow-ffff'].sort());
  });
});

describe('auditMilestone', () => {
  const milestone = (body: string): Bean => ({
    id: 'm',
    path: '.beans/m.md',
    title: 'Milestone',
    status: 'todo',
    type: 'feature',
    parent: null,
    blockedBy: [],
    body,
    priority: 'normal',
    createdAt: 't0',
  });

  it('requires an explicit checkpoint checklist', () => {
    const valid = milestone('## Milestone checkpoint\n\n- [ ] `pnpm test`');
    expect(auditMilestone(valid, buildTree([valid])).passed).toBe(true);

    const missing = milestone('Container only.');
    const result = auditMilestone(missing, buildTree([missing]));
    expect(result.passed).toBe(false);
    expect(result.findings.find((finding) => finding.check === 'milestone-checkpoint')?.pass).toBe(false);
  });
});
