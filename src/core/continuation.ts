// Continuation decision for a live run: the run auto-continues across agent
// settlement and compaction while eligible work remains, but an Esc-aborted
// turn pauses it and must not be restarted by agent_settled.

import { blockedLeafIds } from './blockers.js';
import { selectNextLeaf } from './selection.js';
import type { BeanTree } from './discovery.js';
import type { RunPhase, RunState, ScopeManifest } from './types.js';

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

/** True when some manifest leaf is still selectable (present, unblocked, deps done). */
export function eligibleWorkRemains(tree: BeanTree, manifest: ScopeManifest, state: RunState): boolean {
  const completed = manifest.executableLeaves.filter((l) => !tree.byId.has(l.id)).map((l) => l.id);
  const blocked = blockedLeafIds(state);
  const leaves = manifest.executableLeaves
    .filter((l) => tree.byId.has(l.id))
    .map((l) => tree.byId.get(l.id)!);
  return selectNextLeaf(leaves, new Set(completed), blocked) !== null;
}
