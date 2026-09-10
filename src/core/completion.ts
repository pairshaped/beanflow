// Completion report and the Epic-deletion decision. The Epic is
// deleted only when every scoped child is complete, verification passed,
// and no blockers remain.

import type { BeanRef, BlockerReceipt, ScopeManifest } from './types.js';

export interface CompletedTask {
  task: BeanRef;
  commitHash: string;
}

export interface VerificationResult {
  passed: boolean;
  evidence: string;
}

export interface CompletionReport {
  epic: BeanRef;
  completed: CompletedTask[];
  blockers: BlockerReceipt[];
  ownerQuestions: string[];
  verification: VerificationResult;
  allTasksComplete: boolean;
}

export function buildReport(
  manifest: ScopeManifest,
  completed: CompletedTask[],
  blockers: BlockerReceipt[],
  verification: VerificationResult,
): CompletionReport {
  const completedIds = new Set(completed.map((c) => c.task.id));
  return {
    epic: manifest.epic,
    completed,
    blockers,
    ownerQuestions: blockers.map((b) => `${b.task.title}: ${b.requiredDecision}`),
    verification,
    allTasksComplete: manifest.tasks.every((task) => completedIds.has(task.id)),
  };
}

export function canDeleteEpic(report: CompletionReport): boolean {
  return report.allTasksComplete && report.verification.passed && report.blockers.length === 0;
}

export interface ChildBeanRequest {
  title: string;
  body: string;
}

/** Produce a Task request for integration work discovered during Epic verification. */
export function integrationChildRequest(title: string, whatToBuild: string, verification: string): ChildBeanRequest {
  return {
    title,
    body: [
      '## What to build',
      '',
      whatToBuild,
      '',
      '## Acceptance criteria',
      '',
      '- [ ] Integration work is complete and verified',
      '',
      '## Verification',
      '',
      `- \`${verification}\``,
      '',
      '## Out of scope',
      '',
      '- Changes outside the discovered integration gap',
    ].join('\n'),
  };
}
