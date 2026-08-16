// Completion report and the parent-deletion decision. The parent Bean is
// deleted only when every scoped child is complete, verification passed,
// and no blockers remain.

import type { BeanRef, BlockerReceipt, ScopeManifest } from './types.js';

export interface CompletedLeaf {
  leaf: BeanRef;
  commitHash: string;
}

export interface VerificationResult {
  passed: boolean;
  evidence: string;
}

export interface CompletionReport {
  parentBean: BeanRef;
  completed: CompletedLeaf[];
  blockers: BlockerReceipt[];
  ownerQuestions: string[];
  verification: VerificationResult;
  allChildrenComplete: boolean;
}

export function buildReport(
  manifest: ScopeManifest,
  completed: CompletedLeaf[],
  blockers: BlockerReceipt[],
  verification: VerificationResult,
): CompletionReport {
  const completedIds = new Set(completed.map((c) => c.leaf.id));
  return {
    parentBean: manifest.parentBean,
    completed,
    blockers,
    ownerQuestions: blockers.map((b) => `${b.leaf.title}: ${b.requiredDecision}`),
    verification,
    allChildrenComplete: manifest.executableLeaves.every((l) => completedIds.has(l.id)),
  };
}

export function canDeleteParent(report: CompletionReport): boolean {
  return report.allChildrenComplete && report.verification.passed && report.blockers.length === 0;
}

export interface ChildBeanRequest {
  title: string;
  body: string;
}

/** Produce a child Bean request for integration work discovered during parent verification. */
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
