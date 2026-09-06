// Freeze an audited parent into a deterministic scope manifest: the approved
// executable descendants in dependency order. Ambiguous input is rejected.

import type { Bean } from './bean.js';
import type { BeanTree } from './discovery.js';
import type { BeanRef, ScopeManifest } from './types.js';
import { FatalError } from './failure.js';

export function toBeanRef(bean: Bean): BeanRef {
  return { id: bean.id, path: bean.path, title: bean.title };
}

interface ManifestDescendants {
  groupingBeans: Bean[];
  executableLeaves: Bean[];
}

/** Collect executable leaves and stable grouping identities under `parentId`. */
function collectDescendants(
  tree: BeanTree,
  parentId: string,
  knownGroupingIds: ReadonlySet<string>,
): ManifestDescendants {
  const groupingBeans: Bean[] = [];
  const executableLeaves: Bean[] = [];
  const queue = [parentId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of tree.childrenOf.get(id) ?? []) {
      if (tree.kindOf.get(child.id) === 'grouping' || knownGroupingIds.has(child.id)) {
        groupingBeans.push(child);
        queue.push(child.id);
      } else {
        executableLeaves.push(child);
      }
    }
  }
  return { groupingBeans, executableLeaves };
}

/** Topologically sort leaves by blocked-by. Rejects unknown or out-of-scope blockers and cycles. */
function topologicalSort(leaves: Bean[], tree: BeanTree): Bean[] {
  const ids = new Set(leaves.map((b) => b.id));
  for (const leaf of leaves) {
    for (const dep of leaf.blockedBy) {
      const dependency = tree.byId.get(dep);
      if (!dependency) throw new FatalError(`leaf ${leaf.id} is blocked by unknown bean ${dep}`);
      if (dependency.status === 'completed') continue;
      if (dependency.status === 'scrapped') {
        throw new FatalError(`leaf ${leaf.id} is blocked by scrapped bean ${dep}`);
      }
      if (!ids.has(dep)) throw new FatalError(`leaf ${leaf.id} is blocked by ${dep}, which is outside the frozen scope`);
    }
  }
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const leaf of leaves) {
    indegree.set(leaf.id, 0);
    dependents.set(leaf.id, []);
  }
  for (const leaf of leaves) {
    for (const dep of leaf.blockedBy) {
      if (tree.byId.get(dep)?.status === 'completed') continue;
      indegree.set(leaf.id, (indegree.get(leaf.id) ?? 0) + 1);
      dependents.get(dep)!.push(leaf.id);
    }
  }
  const ready = leaves.filter((b) => (indegree.get(b.id) ?? 0) === 0).map((b) => b.id).sort();
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
  if (ordered.length !== leaves.length) {
    throw new FatalError('dependency cycle detected among executable leaves');
  }
  const byId = new Map(leaves.map((b) => [b.id, b]));
  return ordered.map((id) => byId.get(id)!);
}

/** Freeze a manifest for `parentId` at `frozenAt`. Deterministic; rejects ambiguity. */
export function freezeManifest(
  tree: BeanTree,
  parentId: string,
  frozenAt: string,
  knownGroupingIds: ReadonlySet<string> = new Set(),
): ScopeManifest {
  const parent = tree.byId.get(parentId);
  if (!parent) throw new FatalError(`unknown parent bean: ${parentId}`);
  if (tree.kindOf.get(parentId) !== 'grouping') {
    throw new FatalError(`parent ${parentId} is not a grouping bean`);
  }
  const descendants = collectDescendants(tree, parentId, knownGroupingIds);
  const leaves = descendants.executableLeaves.filter(
    (leaf) => leaf.status !== 'completed' && leaf.status !== 'scrapped',
  );
  if (leaves.length === 0) throw new FatalError(`parent ${parentId} has no executable descendants`);
  return {
    parentBean: toBeanRef(parent),
    frozenAt,
    groupingBeans: descendants.groupingBeans.map(toBeanRef),
    executableLeaves: topologicalSort(leaves, tree).map(toBeanRef),
  };
}
