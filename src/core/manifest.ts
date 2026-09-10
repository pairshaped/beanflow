// Freeze an audited Epic into a deterministic scope manifest: the approved
// executable descendants in dependency order. Ambiguous input is rejected.

import type { Bean } from './bean.js';
import type { BeanTree } from './discovery.js';
import type { BeanRef, ScopeManifest } from './types.js';
import { FatalError } from './failure.js';

export function toBeanRef(bean: Bean): BeanRef {
  return { id: bean.id, path: bean.path, title: bean.title };
}

interface ManifestDescendants {
  milestones: Bean[];
  tasks: Bean[];
}

/** Collect Tasks and stable Milestone identities under `epicId`. */
function collectDescendants(
  tree: BeanTree,
  epicId: string,
  knownMilestoneIds: ReadonlySet<string>,
): ManifestDescendants {
  const milestones: Bean[] = [];
  const tasks: Bean[] = [];
  const queue = [epicId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of tree.childrenOf.get(id) ?? []) {
      if (tree.kindOf.get(child.id) === 'milestone' || knownMilestoneIds.has(child.id)) {
        milestones.push(child);
        queue.push(child.id);
      } else {
        tasks.push(child);
      }
    }
  }
  return { milestones, tasks };
}

/** Topologically sort tasks by blocked-by. Rejects unknown or out-of-scope blockers and cycles. */
function topologicalSort(tasks: Bean[], tree: BeanTree): Bean[] {
  const ids = new Set(tasks.map((b) => b.id));
  for (const task of tasks) {
    for (const dep of task.blockedBy) {
      const dependency = tree.byId.get(dep);
      if (!dependency) throw new FatalError(`task ${task.id} is blocked by unknown bean ${dep}`);
      if (dependency.status === 'completed') continue;
      if (dependency.status === 'scrapped') {
        throw new FatalError(`task ${task.id} is blocked by scrapped bean ${dep}`);
      }
      if (!ids.has(dep)) throw new FatalError(`task ${task.id} is blocked by ${dep}, which is outside the frozen scope`);
    }
  }
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const task of tasks) {
    indegree.set(task.id, 0);
    dependents.set(task.id, []);
  }
  for (const task of tasks) {
    for (const dep of task.blockedBy) {
      if (tree.byId.get(dep)?.status === 'completed') continue;
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      dependents.get(dep)!.push(task.id);
    }
  }
  const ready = tasks.filter((b) => (indegree.get(b.id) ?? 0) === 0).map((b) => b.id).sort();
  const ordered: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    ordered.push(id);
    for (const dep of dependents.get(id) ?? []) {
      const next = (indegree.get(dep) ?? 1) - 1;
      indegree.set(dep, next);
      if (next === 0) {
        ready.push(dep);
        ready.sort();
      }
    }
  }
  if (ordered.length !== tasks.length) {
    throw new FatalError('dependency cycle detected among executable tasks');
  }
  const byId = new Map(tasks.map((b) => [b.id, b]));
  return ordered.map((id) => byId.get(id)!);
}

/** Freeze a manifest for `epicId` at `frozenAt`. Deterministic; rejects ambiguity. */
export function freezeManifest(
  tree: BeanTree,
  epicId: string,
  frozenAt: string,
  knownMilestoneIds: ReadonlySet<string> = new Set(),
): ScopeManifest {
  const epic = tree.byId.get(epicId);
  if (!epic) throw new FatalError(`unknown Epic: ${epicId}`);
  if (tree.kindOf.get(epicId) !== 'epic') {
    throw new FatalError(`${epicId} is not an Epic`);
  }
  const descendants = collectDescendants(tree, epicId, knownMilestoneIds);
  const tasks = descendants.tasks.filter(
    (task) => task.status !== 'completed' && task.status !== 'scrapped',
  );
  if (tasks.length === 0) throw new FatalError(`Epic ${epicId} has no Tasks`);
  return {
    epic: toBeanRef(epic),
    frozenAt,
    milestones: descendants.milestones.map(toBeanRef),
    tasks: topologicalSort(tasks, tree).map(toBeanRef),
  };
}
