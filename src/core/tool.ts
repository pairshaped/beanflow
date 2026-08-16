// Map a plain-language beanflow request to an operation. Users never memorize
// commands; the tool takes one request string and resolves it here.

export type BeanflowOperation = 'status' | 'resume' | 'refresh' | 'land' | 'unknown';

export function parseOperation(text: string): BeanflowOperation {
  const t = text.trim().toLowerCase();
  if (!t) return 'unknown';
  if (/\bstatus\b|\bprogress\b|\bwhere are we\b/.test(t)) return 'status';
  if (/\bresume\b|\bcontinue\b|\bkeep going\b|\bcarry on\b/.test(t)) return 'resume';
  if (/\brefresh\b|\bre-?freeze\b|\brefreeze\b|\bnew child\b|\bupdate manifest\b/.test(t)) return 'refresh';
  if (/\bland\b|\bmerge\b|\bfast-?forward\b|\bship\b/.test(t)) return 'land';
  return 'unknown';
}
