// Audit each executable task for the six criteria the workflow requires:
// focused scope, sufficient context, explicit acceptance criteria,
// verification commands, resolvable dependencies, and safe autonomy.

import type { Bean } from './bean.js';
import type { BeanTree } from './discovery.js';

export interface AuditFinding {
  check: string;
  pass: boolean;
  reason: string;
}

export interface TaskAudit {
  task: Bean;
  findings: AuditFinding[];
  passed: boolean;
}

export interface MilestoneAudit {
  milestone: Bean;
  findings: AuditFinding[];
  passed: boolean;
}

/** Extract the body of a `## <heading>` section, up to the next `## ` heading. */
function section(body: string, heading: string): string {
  const lines = body.split('\n');
  let inSection = false;
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      if (inSection) break;
      if (trimmed.slice(3).trim() === heading) {
        inSection = true;
        continue;
      }
    }
    if (inSection) out.push(line);
  }
  return out.join('\n').trim();
}

function headingCount(body: string, heading: string): number {
  let count = 0;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ') && trimmed.slice(3).trim() === heading) count++;
  }
  return count;
}

function checkboxCount(text: string): number {
  return text.split('\n').filter((l) => /^\s*[-*]\s+\[[ x]\]/.test(l)).length;
}

const MIN_CONTEXT_CHARS = 40;
const MAX_AC_ITEMS = 15;

function checkFocusedScope(task: Bean): AuditFinding {
  const wtb = headingCount(task.body, 'What to build');
  if (wtb !== 1) {
    return { check: 'focused-scope', pass: false, reason: `expected one "What to build" section, found ${wtb}` };
  }
  const ac = checkboxCount(section(task.body, 'Acceptance criteria'));
  if (ac < 1 || ac > MAX_AC_ITEMS) {
    return { check: 'focused-scope', pass: false, reason: `acceptance criteria count ${ac} outside 1..${MAX_AC_ITEMS}` };
  }
  return { check: 'focused-scope', pass: true, reason: 'single focused scope with a bounded acceptance checklist' };
}

function checkContext(task: Bean): AuditFinding {
  const wtb = section(task.body, 'What to build');
  if (wtb.length < MIN_CONTEXT_CHARS) {
    return { check: 'context', pass: false, reason: `"What to build" is too thin (${wtb.length} chars)` };
  }
  return { check: 'context', pass: true, reason: 'sufficient context in "What to build"' };
}

function checkAcceptanceCriteria(task: Bean): AuditFinding {
  const ac = section(task.body, 'Acceptance criteria');
  const count = checkboxCount(ac);
  if (count < 1) {
    return { check: 'acceptance-criteria', pass: false, reason: 'no checkboxed acceptance criteria found' };
  }
  return { check: 'acceptance-criteria', pass: true, reason: `${count} acceptance criteria found` };
}

function checkVerification(task: Bean): AuditFinding {
  const v = section(task.body, 'Verification');
  if (v.length === 0) {
    return { check: 'verification', pass: false, reason: 'no verification commands' };
  }
  return { check: 'verification', pass: true, reason: 'verification commands present' };
}

function checkDependencies(
  task: Bean,
  tree: BeanTree,
  satisfiedDependencies: ReadonlySet<string> = new Set(),
): AuditFinding {
  const missing: string[] = [];
  if (task.parent !== null && !tree.byId.has(task.parent) && !satisfiedDependencies.has(task.parent)) {
    missing.push(`parent ${task.parent}`);
  }
  for (const dep of task.blockedBy) {
    if (!tree.byId.has(dep) && !satisfiedDependencies.has(dep)) missing.push(`blocked-by ${dep}`);
  }
  if (missing.length > 0) {
    return { check: 'dependencies', pass: false, reason: `unresolvable: ${missing.join(', ')}` };
  }
  return { check: 'dependencies', pass: true, reason: 'parent and blocked-by resolve within the tree' };
}

function checkSafeAutonomy(task: Bean): AuditFinding {
  const oos = section(task.body, 'Out of scope');
  if (oos.length === 0) {
    return { check: 'safe-autonomy', pass: false, reason: 'no "Out of scope" boundaries' };
  }
  return { check: 'safe-autonomy', pass: true, reason: 'scope boundaries declared' };
}

export function auditTask(
  task: Bean,
  tree: BeanTree,
  satisfiedDependencies: ReadonlySet<string> = new Set(),
): TaskAudit {
  const findings = [
    checkFocusedScope(task),
    checkContext(task),
    checkAcceptanceCriteria(task),
    checkVerification(task),
    checkDependencies(task, tree, satisfiedDependencies),
    checkSafeAutonomy(task),
  ];
  return { task, findings, passed: findings.every((f) => f.pass) };
}

export function auditMilestone(
  milestone: Bean,
  tree: BeanTree,
  satisfiedDependencies: ReadonlySet<string> = new Set(),
): MilestoneAudit {
  const checkpoint = section(milestone.body, 'Milestone checkpoint');
  const checkpointCount = headingCount(milestone.body, 'Milestone checkpoint');
  const findings = [
    checkpointCount === 1 && checkboxCount(checkpoint) > 0
      ? { check: 'milestone-checkpoint', pass: true, reason: 'explicit checkpoint checklist present' }
      : {
          check: 'milestone-checkpoint',
          pass: false,
          reason: 'expected one "Milestone checkpoint" section with at least one checklist item',
        },
    checkDependencies(milestone, tree, satisfiedDependencies),
  ];
  return { milestone, findings, passed: findings.every((finding) => finding.pass) };
}

export function auditTree(tree: BeanTree): TaskAudit[] {
  return tree.beans
    .filter((b) => tree.kindOf.get(b.id) === 'task')
    .map((b) => auditTask(b, tree));
}
