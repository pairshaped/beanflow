// Codex Stop hook: when the main agent finishes a turn, block (continue) if a
// beanflow run has eligible work and no safety bound is exceeded. Run via:
//   node dist/codex/stop-hook.js

import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { allManifestLeavesComplete, decideContinuation, nextEligibleLeaf } from '../core/continuation.js';
import { discoverBeans } from '../core/discovery.js';
import { activeRunId, isRunWorktree, loadRunState, persistRunState, worktreeStateDir } from '../core/runstate.js';
import { checkBounds, shouldStop } from '../core/safety.js';

export interface StopHookInput {
  hook_event_name?: string;
  cwd?: string;
}

export interface StopHookDecision {
  block: boolean;
  reason?: string;
}

export function decideStopHook(input: StopHookInput): StopHookDecision {
  try {
    if (input.hook_event_name && input.hook_event_name !== 'Stop') {
      return { block: false };
    }
    const cwd = input.cwd ?? process.cwd();
    const runId = activeRunId(cwd);
    if (!runId) return { block: false };

    const state = loadRunState(runId, cwd);
    if (!isRunWorktree(state, cwd)) return { block: false };

    if (shouldStop(checkBounds(state, worktreeStateDir(cwd), new Date().toISOString()))) {
      persistRunState({ ...state, phase: 'paused', updatedAt: new Date().toISOString() }, cwd);
      return { block: false };
    }

    const beansDir = join(cwd, '.beans');
    if (!existsSync(beansDir)) return { block: false };

    const tree = discoverBeans(beansDir);
    const selectedLeaf = nextEligibleLeaf(tree, state.manifest, state);
    const eligible = selectedLeaf !== null;
    if (!eligible && allManifestLeavesComplete(tree, state.manifest)) {
      if (!tree.byId.has(state.parentBean.id)) {
        persistRunState({ ...state, phase: 'completed', selectedLeaf: null, updatedAt: new Date().toISOString() }, cwd);
        return { block: false };
      }
      if (state.blockers.length === 0) {
        persistRunState({ ...state, phase: 'running', selectedLeaf: null, updatedAt: new Date().toISOString() }, cwd);
        return {
          block: true,
          reason: `Continue the beanflow run: verify parent ${state.parentBean.id} and delete it only if verification passes.`,
        };
      }
    }
    if (!eligible && state.phase === 'running') {
      persistRunState({ ...state, phase: 'paused', selectedLeaf: null, updatedAt: new Date().toISOString() }, cwd);
      return { block: false };
    }
    if (selectedLeaf?.id !== state.selectedLeaf?.id) {
      persistRunState({ ...state, selectedLeaf, updatedAt: new Date().toISOString() }, cwd);
    }
    const decision = decideContinuation({ phase: state.phase, lastStopReason: null, eligibleWorkRemains: eligible });
    if (decision.shouldContinue) {
      return {
        block: true,
        reason:
          `Continue the beanflow run as the owner-facing orchestrator beginning with leaf ${selectedLeaf!.id}: ` +
          'reuse its existing implementer thread, or create one only if this run has none. Form a bounded ordered ' +
          'work set of related eligible leaves, send those Bean ids and the worktree path to the beanflow-implementer, ' +
          'and wait for the work-set outcome. Do not require parent acknowledgement between routine leaf commits. ' +
          'If it reports needs_guidance, resolve the question in this parent task and send the guidance back to ' +
          'that same thread.',
      };
    }
    return { block: false };
  } catch {
    return { block: false };
  }
}

function main(): void {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let buf = '';
  rl.on('line', (line) => {
    buf += line;
  });
  rl.on('close', () => {
    let input: StopHookInput = {};
    try {
      input = JSON.parse(buf || '{}') as StopHookInput;
    } catch {
      /* unparseable input: treat as no-op */
    }
    const decision = decideStopHook(input);
    if (decision.block) {
      process.stdout.write(`${JSON.stringify({ decision: 'block', reason: decision.reason })}\n`);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
