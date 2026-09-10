import { describe, expect, it } from 'vitest';
import { decideResume, parseOperation } from '../src/core/tool.js';
import { buildTree } from '../src/core/discovery.js';
import type { Bean } from '../src/core/bean.js';
import type { RunState } from '../src/core/types.js';

describe('parseOperation', () => {
  it.each([
    ['status', 'status'],
    ['what is the status', 'status'],
    ['where are we', 'status'],
    ['show progress', 'status'],
    ['resume', 'resume'],
    ['continue the run', 'resume'],
    ['keep going', 'resume'],
    ['refresh', 'refresh'],
    ['refresh the manifest', 'refresh'],
    ['re-freeze the plan', 'refresh'],
    ['add a new child', 'refresh'],
    ['land', 'land'],
    ['land the branch', 'land'],
    ['merge it', 'land'],
    ['ship it', 'land'],
  ])('maps %j to %s', (text, expected) => {
    expect(parseOperation(text)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(parseOperation('STATUS')).toBe('status');
    expect(parseOperation('Land It')).toBe('land');
  });

  it('uses the first command phrase instead of keywords in a later path', () => {
    expect(parseOperation('resume in worktree /tmp/beanflow-status-check')).toBe('resume');
    expect(parseOperation('start epic example in worktree /tmp/land')).toBe('start');
  });

  it('returns unknown for unrecognized or empty input', () => {
    expect(parseOperation('blah blah')).toBe('unknown');
    expect(parseOperation('')).toBe('unknown');
  });
});

describe('decideResume', () => {
  const task = { id: 'task', path: '.beans/task.md', title: 'Task' };
  const milestone = { id: 'milestone', path: '.beans/milestone.md', title: 'Milestone' };
  const parent = { id: 'epic', path: '.beans/epic.md', title: 'Epic' };
  const state: RunState = {
    schemaVersion: 3,
    runId: 'run',
    epic: parent,
    manifest: { epic: parent, frozenAt: 't0', milestones: [{ milestone, tasks: [task] }] },
    phase: 'running',
    baseBranch: 'main',
    baseCommit: 'abc123',
    selectedTask: task,
    selectedMilestone: null,
    blockers: [],
    attempts: {},
    startedAt: 't0',
    updatedAt: 't0',
  };
  const epic: Bean = {
    ...parent,
    status: 'in-progress',
    type: 'epic',
    parent: null,
    blockedBy: [],
    priority: 'normal',
    createdAt: 't0',
    body: '',
  };

  const milestoneBean: Bean = {
    ...milestone,
    status: 'in-progress',
    type: 'feature',
    parent: 'epic',
    blockedBy: [],
    priority: 'normal',
    createdAt: 't0',
    body: '',
  };

  it('advances to the Milestone checkpoint after its last Task is deleted', () => {
    const tree = buildTree([epic, milestoneBean]);
    const decision = decideResume(state, tree, 't1');

    expect(decision.canResume).toBe(true);
    expect(decision.state.phase).toBe('running');
    expect(decision.state.selectedTask).toBeNull();
    expect(decision.state.selectedMilestone?.id).toBe('milestone');
    expect(decision.message).toContain('Milestone checkpoint');
  });

  it('advances to Epic checkpoint only after the Milestone is accepted', () => {
    const tree = buildTree([epic]);
    const decision = decideResume(state, tree, 't1');

    expect(decision.canResume).toBe(true);
    expect(decision.state.selectedMilestone).toBeNull();
    expect(decision.message).toContain('Epic checkpoint');
  });

  it('completes the run after the verified parent is deleted', () => {
    const tree = buildTree([]);
    const decision = decideResume(state, tree, 't1');

    expect(decision.canResume).toBe(false);
    expect(decision.state.phase).toBe('completed');
    expect(decision.message).toContain('run is complete');
  });
});
