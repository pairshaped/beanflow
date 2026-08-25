// Map a plain-language beanflow request to an operation and decide whether an
// active run can resume. Users never memorize commands; the tool takes one
// request string and resolves it here.

import { nextEligibleLeaf } from './continuation.js';
import type { BeanTree } from './discovery.js';
import type { RunState } from './types.js';

export type BeanflowOperation = 'start' | 'status' | 'resume' | 'refresh' | 'land' | 'unknown';

export interface ResumeDecision {
  canResume: boolean;
  state: RunState;
  message: string;
}

export function decideResume(state: RunState, tree: BeanTree, resumedAt: string): ResumeDecision {
  const selectedLeaf = nextEligibleLeaf(tree, state.manifest, state);
  if (!selectedLeaf) {
    const blockerCount = state.blockers.length;
    const blockerDetail =
      blockerCount > 0
        ? ` while ${blockerCount} recorded blocker${blockerCount === 1 ? '' : 's'} remain${blockerCount === 1 ? 's' : ''} unresolved`
        : '';
    return {
      canResume: false,
      state: state.phase === 'running' || state.selectedLeaf !== null
        ? { ...state, phase: 'paused', selectedLeaf: null, updatedAt: resumedAt }
        : state,
      message: `Beanflow cannot resume: no eligible leaf exists${blockerDetail}.`,
    };
  }

  return {
    canResume: true,
    state: {
      ...state,
      phase: 'running',
      selectedLeaf,
      updatedAt: resumedAt,
    },
    message: 'Resuming the beanflow run.',
  };
}

export function parseOperation(text: string): BeanflowOperation {
  const t = text.trim().toLowerCase();
  if (!t) return 'unknown';
  if (/\bstart\b|\bbegin\b|\bbootstrap\b|\badopt (?:this|the) worktree\b/.test(t)) return 'start';
  if (/\bstatus\b|\bprogress\b|\bwhere are we\b/.test(t)) return 'status';
  if (/\bresume\b|\bcontinue\b|\bkeep going\b|\bcarry on\b/.test(t)) return 'resume';
  if (/\brefresh\b|\bre-?freeze\b|\brefreeze\b|\bnew child\b|\bupdate manifest\b/.test(t)) return 'refresh';
  if (/\bland\b|\bmerge\b|\bfast-?forward\b|\bship\b/.test(t)) return 'land';
  return 'unknown';
}
