// Codex Stop hook: when the main agent finishes a turn, block (continue) if a
// beanflow run has eligible work and no safety bound is exceeded. Run via:
//   node dist/codex/stop-hook.js

import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decideContinuation, eligibleWorkRemains } from '../core/continuation.js';
import { discoverBeans } from '../core/discovery.js';
import { activeRunId, isRunWorktree, loadRunState, persistRunState, stateDir } from '../core/runstate.js';
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
    const runId = activeRunId();
    if (!runId) return { block: false };

    const state = loadRunState(runId);
    const cwd = input.cwd ?? process.cwd();
    if (!isRunWorktree(state, cwd)) return { block: false };

    if (shouldStop(checkBounds(state, stateDir(), new Date().toISOString()))) {
      persistRunState({ ...state, phase: 'paused', updatedAt: new Date().toISOString() });
      return { block: false };
    }

    const beansDir = join(cwd, '.beans');
    if (!existsSync(beansDir)) return { block: false };

    const tree = discoverBeans(beansDir);
    const eligible = eligibleWorkRemains(tree, state.manifest, state);
    if (!eligible && state.phase === 'running') {
      persistRunState({ ...state, phase: 'paused', updatedAt: new Date().toISOString() });
      return { block: false };
    }
    const decision = decideContinuation({ phase: state.phase, lastStopReason: null, eligibleWorkRemains: eligible });
    if (decision.shouldContinue) {
      return { block: true, reason: 'Continue the beanflow run: implement the next eligible leaf.' };
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
