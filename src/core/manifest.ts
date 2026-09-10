// Freeze an audited Epic into a deterministic Epic, Milestone, Task hierarchy.

import type { Bean } from './bean.js';
import type { BeanTree } from './discovery.js';
import type { BeanRef, MilestoneManifest, ScopeManifest } from './types.js';
import { FatalError } from './failure.js';

export function toBeanRef(bean: Bean): BeanRef {
  return { id: bean.id, path: bean.path, title: bean.title };
}

function orderBeans(
  beans: Bean[],
  tree: BeanTree,
  satisfiedExternal: ReadonlySet<string>,
  noun: string,
): Bean[] {
  const ids = new Set(beans.map((bean) => bean.id));
  const indegree = new Map(beans.map((bean) => [bean.id, 0]));
  const dependents = new Map(beans.map((bean) => [bean.id, [] as string[]]));

  for (const bean of beans) {
    for (const dependencyId of bean.blockedBy) {
      if (satisfiedExternal.has(dependencyId)) continue;
      const dependency = tree.byId.get(dependencyId);
      if (!dependency) throw new FatalError(`${noun} ${bean.id} is blocked by unknown Bean ${dependencyId}`);
      if (dependency.status === 'completed') continue;
      if (dependency.status === 'scrapped') {
        throw new FatalError(`${noun} ${bean.id} is blocked by scrapped Bean ${dependencyId}`);
      }
      if (!ids.has(dependencyId)) {
        throw new FatalError(`${noun} ${bean.id} is blocked by ${dependencyId}, which is outside its checkpoint scope`);
      }
      indegree.set(bean.id, (indegree.get(bean.id) ?? 0) + 1);
      dependents.get(dependencyId)!.push(bean.id);
    }
  }

  const ready = beans.filter((bean) => indegree.get(bean.id) === 0).map((bean) => bean.id).sort();
  const ordered: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    ordered.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      const next = (indegree.get(dependent) ?? 1) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort();
      }
    }
  }
  if (ordered.length !== beans.length) throw new FatalError(`dependency cycle detected among ${noun}s`);
  const byId = new Map(beans.map((bean) => [bean.id, bean]));
  return ordered.map((id) => byId.get(id)!);
}

export interface FreezeManifestOptions {
  satisfiedMilestoneIds?: ReadonlySet<string>;
  satisfiedTaskIds?: ReadonlySet<string>;
}

export function freezeManifest(
  tree: BeanTree,
  epicId: string,
  frozenAt: string,
  options: FreezeManifestOptions = {},
): ScopeManifest {
  const epic = tree.byId.get(epicId);
  if (!epic) throw new FatalError(`unknown Epic: ${epicId}`);
  if (tree.kindOf.get(epicId) !== 'epic') throw new FatalError(`${epicId} is not an Epic`);

  const milestoneBeans = (tree.childrenOf.get(epicId) ?? []).filter((bean) => bean.status !== 'scrapped');
  if (milestoneBeans.length === 0) throw new FatalError(`Epic ${epicId} has no Milestones`);
  for (const milestone of milestoneBeans) {
    if (tree.kindOf.get(milestone.id) !== 'milestone') {
      throw new FatalError(`Epic ${epicId} contains Task ${milestone.id} without a Milestone`);
    }
  }

  const orderedMilestones = orderBeans(
    milestoneBeans,
    tree,
    options.satisfiedMilestoneIds ?? new Set(),
    'Milestone',
  );
  const priorTaskIds = new Set(options.satisfiedTaskIds ?? []);
  const milestones: MilestoneManifest[] = [];
  for (const milestone of orderedMilestones) {
    const children = tree.childrenOf.get(milestone.id) ?? [];
    for (const child of children) {
      if (tree.kindOf.get(child.id) !== 'task') {
        throw new FatalError(`Milestone ${milestone.id} contains non-Task ${child.id}`);
      }
    }
    const scopedTasks = children.filter((task) => task.status !== 'scrapped');
    if (milestone.status === 'completed' && scopedTasks.some((task) => task.status !== 'completed')) {
      throw new FatalError(`completed Milestone ${milestone.id} contains an incomplete Task`);
    }
    const tasks = orderBeans(scopedTasks, tree, priorTaskIds, 'Task');
    milestones.push({ milestone: toBeanRef(milestone), tasks: tasks.map(toBeanRef) });
    for (const task of scopedTasks) priorTaskIds.add(task.id);
  }

  return { epic: toBeanRef(epic), frozenAt, milestones };
}
