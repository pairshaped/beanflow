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
          'create a fresh beanflow-implementer thread for this leaf. Reuse that thread only for guidance and repairs ' +
          'on the same leaf, then retire it after acceptance. Send the Bean id and worktree path to the implementer, ' +
          'keep the parent turn active, and wait in bounded intervals for the leaf outcome, focused question, ' +
          'or blocker. Do not end the parent turn and assume a background notification will resume monitoring. ' +
          'Before accepting completed, verify the worktree is clean, Bean deletions are atomic, required checks ran, ' +
          'the leaf formatter and static-analysis gate passed, the code and tests prove the acceptance criteria, ' +
          'and replaced code was deleted or has an explicit cleanup Bean blocking final verification. Treat a failing ' +
          'test that names a changed route, replaced renderer, migrated workflow, shared shell, or other touched boundary ' +
          'as a leaf regression unless it reproduces at the recorded base commit or concrete evidence traces it to ' +
          'unchanged code. A later Bean does not excuse behavior removed by the current migration. ' +
          'Reject failures back to the same implementer in batches of at most three independently checkable gaps without ' +
          'advancing the run. Before inspecting code for needs_guidance, require exactly one GUIDANCE_QUESTION line ' +
          'with a focused unresolved decision, choices, and consequences. If it is absent or invalid, bounce it without ' +
          'code inspection: ask the implementer to continue when the next safe action is clear, or return one valid ' +
          'GUIDANCE_QUESTION with choices and consequences. Otherwise resolve the question and send the guidance ' +
          'back to that same thread. After acceptance, inspect repository-owned build-cache status and clean safely ' +
          'before the next leaf when the cache is at least 10 GiB or the filesystem has less than 20 percent free.',
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
