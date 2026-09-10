import { describe, expect, it } from 'vitest';
import { buildReport, canDeleteEpic, integrationChildRequest } from '../src/core/completion.js';
import type { BeanRef, ScopeManifest } from '../src/core/types.js';

const ref = (id: string): BeanRef => ({ id, path: `.beans/${id}.md`, title: id });

function manifest(...ids: string[]): ScopeManifest {
  return { epic: ref('e'), frozenAt: 't0', tasks: ids.map(ref) };
}

const passed = { passed: true, evidence: 'pnpm test' };
const failed = { passed: false, evidence: '' };

describe('buildReport', () => {
  it('lists completed tasks and derives owner questions from blockers', () => {
    const report = buildReport(
      manifest('a', 'b', 'c'),
      [{ task: ref('a'), commitHash: 'h1' }, { task: ref('b'), commitHash: 'h2' }],
      [{ task: ref('c'), evidence: 'needs X', requiredDecision: 'choose X or Y', recordedAt: 't1' }],
      passed,
    );
    expect(report.completed.map((c) => c.task.id)).toEqual(['a', 'b']);
    expect(report.ownerQuestions).toEqual(['c: choose X or Y']);
    expect(report.allTasksComplete).toBe(false);
  });

  it('marks allTasksComplete when every task is done', () => {
    const report = buildReport(
      manifest('a', 'b'),
      [{ task: ref('a'), commitHash: 'h1' }, { task: ref('b'), commitHash: 'h2' }],
      [],
      passed,
    );
    expect(report.allTasksComplete).toBe(true);
  });
});

describe('canDeleteEpic', () => {
  const done = [
    { task: ref('a'), commitHash: 'h1' },
    { task: ref('b'), commitHash: 'h2' },
  ];

  it('is true only when all children complete, verification passed, and no blockers', () => {
    expect(canDeleteEpic(buildReport(manifest('a', 'b'), done, [], passed))).toBe(true);
  });

  it('is false when a child is incomplete', () => {
    expect(canDeleteEpic(buildReport(manifest('a', 'b', 'c'), done, [], passed))).toBe(false);
  });

  it('is false when verification failed', () => {
    expect(canDeleteEpic(buildReport(manifest('a', 'b'), done, [], failed))).toBe(false);
  });

  it('is false when blockers remain', () => {
    const blockers = [{ task: ref('c'), evidence: 'needs X', requiredDecision: 'y', recordedAt: 't1' }];
    expect(canDeleteEpic(buildReport(manifest('a', 'b'), done, blockers, passed))).toBe(false);
  });
});

describe('integrationChildRequest', () => {
  it('produces an auditable child body', () => {
    const req = integrationChildRequest('Fix integration', 'Wire the pieces together', 'pnpm test');
    expect(req.body).toContain('## What to build');
    expect(req.body).toContain('## Acceptance criteria');
    expect(req.body).toContain('## Verification');
    expect(req.body).toContain('## Out of scope');
  });
});
