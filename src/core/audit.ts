// Audit each executable leaf for the six criteria the workflow requires:
// focused scope, sufficient context, explicit acceptance criteria,
// verification commands, resolvable dependencies, and safe autonomy.

import type { Bean } from './bean.js';
import type { BeanTree } from './discovery.js';

export interface AuditFinding {
  check: string;
  pass: boolean;
  reason: string;
}

export interface LeafAudit {
  leaf: Bean;
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

function checkFocusedScope(leaf: Bean): AuditFinding {
  const wtb = headingCount(leaf.body, 'What to build');
  if (wtb !== 1) {
    return { check: 'focused-scope', pass: false, reason: `expected one "What to build" section, found ${wtb}` };
  }
  const ac = checkboxCount(section(leaf.body, 'Acceptance criteria'));
  if (ac < 1 || ac > MAX_AC_ITEMS) {
    return { check: 'focused-scope', pass: false, reason: `acceptance criteria count ${ac} outside 1..${MAX_AC_ITEMS}` };
  }
  return { check: 'focused-scope', pass: true, reason: 'single focused scope with a bounded acceptance checklist' };
}

function checkContext(leaf: Bean): AuditFinding {
  const wtb = section(leaf.body, 'What to build');
  if (wtb.length < MIN_CONTEXT_CHARS) {
    return { check: 'context', pass: false, reason: `"What to build" is too thin (${wtb.length} chars)` };
  }
  return { check: 'context', pass: true, reason: 'sufficient context in "What to build"' };
}

function checkAcceptanceCriteria(leaf: Bean): AuditFinding {
  const ac = section(leaf.body, 'Acceptance criteria');
  const count = checkboxCount(ac);
  if (count < 1) {
    return { check: 'acceptance-criteria', pass: false, reason: 'no checkboxed acceptance criteria found' };
  }
  return { check: 'acceptance-criteria', pass: true, reason: `${count} acceptance criteria found` };
}

function checkVerification(leaf: Bean): AuditFinding {
  const v = section(leaf.body, 'Verification');
  if (v.length === 0) {
    return { check: 'verification', pass: false, reason: 'no verification commands' };
  }
  return { check: 'verification', pass: true, reason: 'verification commands present' };
}

function checkDependencies(leaf: Bean, tree: BeanTree): AuditFinding {
  const missing: string[] = [];
  if (leaf.parent !== null && !tree.byId.has(leaf.parent)) missing.push(`parent ${leaf.parent}`);
  for (const dep of leaf.blockedBy) {
    if (!tree.byId.has(dep)) missing.push(`blocked-by ${dep}`);
  }
  if (missing.length > 0) {
    return { check: 'dependencies', pass: false, reason: `unresolvable: ${missing.join(', ')}` };
  }
  return { check: 'dependencies', pass: true, reason: 'parent and blocked-by resolve within the tree' };
}

function checkSafeAutonomy(leaf: Bean): AuditFinding {
  const oos = section(leaf.body, 'Out of scope');
  if (oos.length === 0) {
    return { check: 'safe-autonomy', pass: false, reason: 'no "Out of scope" boundaries' };
  }
  return { check: 'safe-autonomy', pass: true, reason: 'scope boundaries declared' };
}

export function auditLeaf(leaf: Bean, tree: BeanTree): LeafAudit {
  const findings = [
    checkFocusedScope(leaf),
    checkContext(leaf),
    checkAcceptanceCriteria(leaf),
    checkVerification(leaf),
    checkDependencies(leaf, tree),
    checkSafeAutonomy(leaf),
  ];
  return { leaf, findings, passed: findings.every((f) => f.pass) };
}

export function auditTree(tree: BeanTree): LeafAudit[] {
  return tree.beans
    .filter((b) => tree.kindOf.get(b.id) === 'leaf')
    .map((b) => auditLeaf(b, tree));
}
