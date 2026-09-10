// Codex Stop hook: when the main agent finishes a turn, block (continue) if a
// beanflow run has eligible work and no safety bound is exceeded. Run via:
//   node dist/codex/stop-hook.js

import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { allManifestTasksComplete, decideContinuation, nextEligibleTask } from '../core/continuation.js';
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
    const selectedTask = nextEligibleTask(tree, state.manifest, state);
    const eligible = selectedTask !== null;
    if (!eligible && allManifestTasksComplete(tree, state.manifest)) {
      if (!tree.byId.has(state.epic.id)) {
        persistRunState({ ...state, phase: 'completed', selectedTask: null, updatedAt: new Date().toISOString() }, cwd);
        return { block: false };
      }
      if (state.blockers.length === 0) {
        persistRunState({ ...state, phase: 'running', selectedTask: null, updatedAt: new Date().toISOString() }, cwd);
        return {
          block: true,
          reason: `Continue the beanflow run: verify parent ${state.epic.id} and delete it only if verification passes.`,
        };
      }
    }
    if (!eligible && state.phase === 'running') {
      persistRunState({ ...state, phase: 'paused', selectedTask: null, updatedAt: new Date().toISOString() }, cwd);
      return { block: false };
    }
    if (selectedTask?.id !== state.selectedTask?.id) {
      persistRunState({ ...state, selectedTask, updatedAt: new Date().toISOString() }, cwd);
    }
    const decision = decideContinuation({ phase: state.phase, lastStopReason: null, eligibleWorkRemains: eligible });
    if (decision.shouldContinue) {
      return {
        block: true,
        reason:
          `Continue the beanflow run in this task, beginning with task ${selectedTask!.id}. ` +
          'Implement only the selected task, run its required checks, commit it while keeping the Bean intact, then ' +
          'skeptically review the resulting diff and its criterion-by-criterion proof. Repair any failed review findings ' +
          'and rerun affected checks before acceptance. ' +
          'Before accepting the task, verify the worktree is clean, the Bean remains intact, required checks ran, ' +
          'the task cheap local proof passed, including focused tests, formatting, and reliably scoped static analysis, ' +
          'the code and tests prove the acceptance criteria, ' +
          'and replaced code was deleted or has an explicit cleanup Bean blocking final verification. For a replaced ' +
          'route, renderer, shell, workflow, or shared boundary, inventory the outgoing production path including ' +
          'authentication controls, alerts, metadata, accessibility, responsive controls, scripts, and lifecycle effects; ' +
          'preserve each behavior or require accepted scope that explicitly removes it. Treat a failing ' +
          'test that names a changed route, replaced renderer, migrated workflow, shared shell, or other touched boundary ' +
          'as a task regression unless it reproduces at the recorded base commit or concrete evidence traces it to ' +
          'unchanged code. A later Bean does not excuse behavior removed by the current migration. ' +
          'After acceptance, delete the accepted Bean, commit only its tracker and dependency cleanup, inspect ' +
          'repository-owned build-cache status, clean safely when the cache is at least 10 GiB and the filesystem has ' +
          'less than 20 GiB free. If every Task in the owning Milestone is accepted, run and accept the Milestone ' +
          'checkpoint before continuing with the next selected Task. Pause only when the run is complete, ' +
          'genuinely blocked, explicitly paused or stopped by the owner, or waiting for an owner-only decision.',
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
