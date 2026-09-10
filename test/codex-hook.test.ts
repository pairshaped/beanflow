import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { decideStopHook } from '../src/codex/stop-hook.js';
import { armRun, disarmRun, loadRunState, persistRunState, stateDir } from '../src/core/runstate.js';
import { createHardStop, removeHardStop } from '../src/core/safety.js';
import type { RunState } from '../src/core/types.js';

const stateDirTmp = mkdtempSync(join(tmpdir(), 'beanflow-hook-state-'));
const origEnv = process.env.BEANFLOW_STATE_DIR;

beforeAll(() => {
  process.env.BEANFLOW_STATE_DIR = stateDirTmp;
});

afterEach(() => {
  disarmRun();
  removeHardStop(stateDir());
});

afterAll(() => {
  if (origEnv === undefined) delete process.env.BEANFLOW_STATE_DIR;
  else process.env.BEANFLOW_STATE_DIR = origEnv;
});

function writeBean(dir: string, id: string, title: string, type: string, parent: string | null) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fm = ['---', `# ${id}`, `title: ${title}`, 'status: todo', `type: ${type}`];
  if (parent) fm.push(`parent: ${parent}`);
  fm.push('created_at: 2026-08-16T00:00:00Z', 'updated_at: 2026-08-16T00:00:00Z', '---', '');
  const body = [
    '## What to build',
    '',
    `Build the ${title} feature end to end with tests, verification, and clear scope boundaries.`,
    '',
    '## Acceptance criteria',
    '',
    '- [ ] Done',
    '',
    '## Verification',
    '',
    '- `true`',
    '',
    '## Out of scope',
    '',
    '- Nothing',
  ];
  writeFileSync(join(dir, `${id}--${slug}.md`), fm.join('\n') + body.join('\n'));
}

function makeRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), 'beanflow-hook-repo-'));
  const beans = join(repo, '.beans');
  mkdirSync(beans, { recursive: true });
  writeBean(beans, 'e', 'Build a widget', 'epic', null);
  writeBean(beans, 'm', 'Core Milestone', 'feature', 'e');
  writeBean(beans, 'a', 'Foundation', 'task', 'm');
  return repo;
}

function runState(overrides: Partial<RunState> = {}): RunState {
  return {
    schemaVersion: 3,
    runId: 'r1',
    epic: { id: 'e', path: '.beans/e.md', title: 'E' },
    manifest: {
      epic: { id: 'e', path: '.beans/e.md', title: 'E' },
      frozenAt: 't0',
      milestones: [{
        milestone: { id: 'm', path: '.beans/m.md', title: 'M' },
        tasks: [{ id: 'a', path: '.beans/a.md', title: 'A' }],
      }],
    },
    phase: 'running',
    baseBranch: null,
    baseCommit: null,
    selectedTask: null,
    selectedMilestone: null,
    blockers: [],
    attempts: {},
    startedAt: 't0',
    updatedAt: 't0',
    ...overrides,
  };
}

describe('Codex Stop hook', () => {
  it('does not block when there is no armed run', () => {
    const repo = makeRepo();
    expect(decideStopHook({ hook_event_name: 'Stop', cwd: repo }).block).toBe(false);
  });

  it('does not block for non-Stop events', () => {
    const repo = makeRepo();
    armRun('r1');
    expect(decideStopHook({ hook_event_name: 'SessionStart', cwd: repo }).block).toBe(false);
  });

  it('blocks with a continue reason when eligible work remains', () => {
    const repo = makeRepo();
    persistRunState(runState());
    armRun('r1');
    const decision = decideStopHook({ hook_event_name: 'Stop', cwd: repo });
    expect(decision.block).toBe(true);
    expect(decision.reason).toMatch(/Continue the beanflow run/);
    expect(decision.reason).toContain('Task a');
    expect(decision.reason).toContain('Implement only the selected Task');
    expect(decision.reason).toContain('skeptically review the resulting diff');
    expect(decision.reason).toContain('Repair any failed review findings');
    expect(decision.reason).toContain('delete the accepted Bean');
    expect(decision.reason).toContain('commit only its tracker and dependency cleanup');
    expect(decision.reason).toContain('run and accept the Milestone checkpoint');
    expect(decision.reason).toContain('next selected Task');
    expect(decision.reason).toContain('verify the worktree is clean');
    expect(decision.reason).toContain('the Bean remains intact');
    expect(decision.reason).toContain('cheap local proof for the Task passed');
    expect(decision.reason).toContain('focused tests, formatting, and reliably scoped static analysis');
    expect(decision.reason).toContain('explicit cleanup Bean blocking final verification');
    expect(decision.reason).toContain('inventory the outgoing production path');
    expect(decision.reason).toContain('responsive controls, scripts, and lifecycle effects');
    expect(decision.reason).toContain('Treat a failing test that names a changed route');
    expect(decision.reason).toContain('reproduces at the recorded base commit');
    expect(decision.reason).toContain('A later Bean does not excuse behavior removed');
    expect(decision.reason).toContain('build-cache status');
  });

  it('does not continue a run from a different working directory', () => {
    const worktree = makeRepo();
    const otherCheckout = makeRepo();
    const state = runState();
    state.epic.path = join(worktree, '.beans', 'e--build-a-widget.md');
    state.manifest.epic.path = state.epic.path;
    persistRunState(state);
    armRun('r1');

    expect(decideStopHook({ hook_event_name: 'Stop', cwd: otherCheckout }).block).toBe(false);
  });

  it('continues concurrent worktree runs independently', () => {
    const worktreeA = makeRepo();
    const worktreeB = makeRepo();
    execFileSync('git', ['init', '-q', '-b', 'f/run-a'], { cwd: worktreeA });
    execFileSync('git', ['init', '-q', '-b', 'f/run-b'], { cwd: worktreeB });
    const stateA = runState({ runId: 'run-a', worktreePath: worktreeA });
    const stateB = runState({ runId: 'run-b', worktreePath: worktreeB });
    persistRunState(stateA, worktreeA);
    persistRunState(stateB, worktreeB);
    armRun(stateA.runId, worktreeA);
    armRun(stateB.runId, worktreeB);

    expect(decideStopHook({ hook_event_name: 'Stop', cwd: worktreeA }).block).toBe(true);
    expect(decideStopHook({ hook_event_name: 'Stop', cwd: worktreeB }).block).toBe(true);
    expect(loadRunState(stateA.runId, worktreeA).phase).toBe('running');
    expect(loadRunState(stateB.runId, worktreeB).phase).toBe('running');

    disarmRun(worktreeA);
    disarmRun(worktreeB);
  });

  it('pauses the run when every remaining task is blocked', () => {
    const repo = makeRepo();
    const state = runState({
      blockers: [
        {
          task: { id: 'a', path: '.beans/a.md', title: 'A' },
          evidence: 'Owner input needed',
          requiredDecision: 'Choose one',
          recordedAt: 't1',
        },
      ],
    });
    persistRunState(state);
    armRun('r1');

    expect(decideStopHook({ hook_event_name: 'Stop', cwd: repo }).block).toBe(false);
    expect(loadRunState('r1').phase).toBe('paused');
  });

  it('continues into the Milestone checkpoint when every scoped Task is complete', () => {
    const repo = makeRepo();
    unlinkSync(join(repo, '.beans', 'a--foundation.md'));
    const state = runState();
    persistRunState(state);
    armRun('r1');

    const decision = decideStopHook({ hook_event_name: 'Stop', cwd: repo });
    expect(decision.block).toBe(true);
    expect(decision.reason).toContain('Milestone checkpoint for m');
    expect(loadRunState('r1').selectedMilestone?.id).toBe('m');
    expect(loadRunState('r1').phase).toBe('running');
  });

  it('continues into the Epic checkpoint after the Milestone is accepted', () => {
    const repo = makeRepo();
    unlinkSync(join(repo, '.beans', 'a--foundation.md'));
    unlinkSync(join(repo, '.beans', 'm--core-milestone.md'));
    const state = runState();
    persistRunState(state);
    armRun('r1');

    const decision = decideStopHook({ hook_event_name: 'Stop', cwd: repo });
    expect(decision.block).toBe(true);
    expect(decision.reason).toContain('verify parent e');
  });

  it('completes the run after the Epic checkpoint deletes the Epic', () => {
    const repo = makeRepo();
    unlinkSync(join(repo, '.beans', 'a--foundation.md'));
    unlinkSync(join(repo, '.beans', 'm--core-milestone.md'));
    unlinkSync(join(repo, '.beans', 'e--build-a-widget.md'));
    const state = runState();
    persistRunState(state);
    armRun('r1');

    expect(decideStopHook({ hook_event_name: 'Stop', cwd: repo }).block).toBe(false);
    expect(loadRunState('r1').phase).toBe('completed');
  });

  it('pauses instead of blocking when a bound is exceeded', () => {
    const repo = makeRepo();
    persistRunState(runState());
    armRun('r1');
    createHardStop(stateDir());
    const decision = decideStopHook({ hook_event_name: 'Stop', cwd: repo });
    expect(decision.block).toBe(false);
  });
});
