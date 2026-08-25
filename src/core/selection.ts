// Select the next ready leaf: dependency order first (blockers must be done),
// then priority, then stable creation order as tie breakers.

import type { Bean } from './bean.js';

const PRIORITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
  deferred: 0,
};

export function priorityRank(priority: string): number {
  return PRIORITY_RANK[priority] ?? 2;
}

export function selectNextLeaf(
  leaves: Bean[],
  completed: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
): Bean | null {
  const ready = leaves.filter((leaf) => {
    if (leaf.status === 'completed' || leaf.status === 'scrapped') return false;
    if (completed.has(leaf.id) || blocked.has(leaf.id)) return false;
    return leaf.blockedBy.every((dep) => completed.has(dep));
  });
  if (ready.length === 0) return null;
  ready.sort((a, b) => {
    const pa = priorityRank(a.priority);
    const pb = priorityRank(b.priority);
    if (pa !== pb) return pb - pa;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return ready[0];
}
