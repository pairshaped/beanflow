// Continuation decision for a live run: the run auto-continues across agent
// settlement and compaction while eligible work remains, but an Esc-aborted
// turn pauses it and must not be restarted by agent_settled.

import { blockedTaskIds } from './blockers.js';
import { selectNextTask } from './selection.js';
import type { BeanTree } from './discovery.js';
import type { BeanRef, MilestoneManifest, RunPhase, RunState, ScopeManifest } from './types.js';

/** Minimal shape of a session entry, sufficient for stop-reason extraction. */
export interface SessionEntry {
  type?: string;
  message?: { role?: string; stopReason?: string | null };
}

export function isAbortedStopReason(stopReason: string | null | undefined): boolean {
  return stopReason === 'aborted';
}

/** Stop reason of the most recent assistant message. `entries` is newest-first. */
export function lastAssistantStopReason(entries: SessionEntry[]): string | null {
  for (const entry of entries) {
    if (entry.type === 'message' && entry.message?.role === 'assistant') {
      return entry.message.stopReason ?? null;
    }
  }
  return null;
}

export interface ContinuationDecision {
  shouldContinue: boolean;
  reason: string;
}

export function decideContinuation(opts: {
  phase: RunPhase;
  lastStopReason: string | null;
  eligibleWorkRemains: boolean;
}): ContinuationDecision {
  if (opts.phase === 'paused') {
    return { shouldContinue: false, reason: 'run is paused' };
  }
  if (isAbortedStopReason(opts.lastStopReason)) {
    return { shouldContinue: false, reason: 'last turn was aborted' };
  }
  if (!opts.eligibleWorkRemains) {
    return { shouldContinue: false, reason: 'no eligible work remains' };
  }
  return { shouldContinue: true, reason: 'eligible work remains' };
}

export function currentMilestone(tree: BeanTree, manifest: ScopeManifest): MilestoneManifest | null {
  return manifest.milestones.find(({ milestone }) => {
    const current = tree.byId.get(milestone.id);
    return current && current.status !== 'completed';
  }) ?? null;
}

/** Next selectable Task in the current Milestone. */
export function nextEligibleTask(tree: BeanTree, manifest: ScopeManifest, state: RunState): BeanRef | null {
  const scope = currentMilestone(tree, manifest);
  if (!scope) return null;
  if (tree.byId.get(scope.milestone.id)?.status === 'scrapped') return null;
  const currentIndex = manifest.milestones.indexOf(scope);
  const completed = manifest.milestones
    .slice(0, currentIndex)
    .flatMap((milestone) => milestone.tasks)
    .map((task) => task.id);
  completed.push(...scope.tasks
    .filter((task) => {
      const current = tree.byId.get(task.id);
      return !current || current.status === 'completed';
    })
    .map((task) => task.id));
  const blocked = blockedTaskIds(state);
  const tasks = scope.tasks
    .filter((l) => tree.byId.has(l.id))
    .map((l) => tree.byId.get(l.id)!);
  const selected = selectNextTask(tasks, new Set(completed), blocked);
  return selected ? scope.tasks.find((task) => task.id === selected.id) ?? null : null;
}

/** Milestone awaiting its checkpoint after all of its Tasks are complete. */
export function nextMilestoneCheckpoint(tree: BeanTree, manifest: ScopeManifest): BeanRef | null {
  const scope = currentMilestone(tree, manifest);
  if (!scope) return null;
  if (tree.byId.get(scope.milestone.id)?.status === 'scrapped') return null;
  const tasksComplete = scope.tasks.every((task) => {
    const current = tree.byId.get(task.id);
    return !current || current.status === 'completed';
  });
  return tasksComplete ? scope.milestone : null;
}

export function allManifestMilestonesComplete(tree: BeanTree, manifest: ScopeManifest): boolean {
  return manifest.milestones.every(({ milestone }) => {
    const current = tree.byId.get(milestone.id);
    return !current || current.status === 'completed';
  });
}

/** True when a Task or Milestone checkpoint can run. */
export function eligibleWorkRemains(tree: BeanTree, manifest: ScopeManifest, state: RunState): boolean {
  return nextEligibleTask(tree, manifest, state) !== null || nextMilestoneCheckpoint(tree, manifest) !== null;
}
