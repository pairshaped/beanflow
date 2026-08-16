import { parse } from 'yaml';

/** A parsed Bean. */
export interface Bean {
  id: string;
  path: string;
  title: string;
  status: string;
  type: string;
  parent: string | null;
  blockedBy: string[];
  priority: string;
  createdAt: string;
  body: string;
}

/** Derive a bean id from a bean filename: "<id>--<slug>.md". */
export function beanIdFromPath(path: string): string {
  const base = path.split('/').pop() ?? path;
  const stem = base.endsWith('.md') ? base.slice(0, -3) : base;
  const sep = stem.indexOf('--');
  return sep === -1 ? stem : stem.slice(0, sep);
}

interface Frontmatter {
  title?: unknown;
  status?: unknown;
  type?: unknown;
  parent?: unknown;
  blocked_by?: unknown;
  priority?: unknown;
  created_at?: unknown;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function asStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') return [v];
  return [];
}

/** Parse raw bean file text into a Bean. `path` is used to derive the id. */
export function parseBean(path: string, raw: string): Bean {
  const id = beanIdFromPath(path);
  const lines = raw.split('\n');
  const boundaries: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') boundaries.push(i);
  }
  let frontmatter: Frontmatter = {};
  let body = raw;
  if (boundaries.length >= 2) {
    const fmText = lines.slice(boundaries[0] + 1, boundaries[1]).join('\n');
    const parsed = parse(fmText);
    if (parsed && typeof parsed === 'object') frontmatter = parsed as Frontmatter;
    body = lines.slice(boundaries[1] + 1).join('\n');
  }
  return {
    id,
    path,
    title: asString(frontmatter.title) ?? id,
    status: asString(frontmatter.status) ?? 'unknown',
    type: asString(frontmatter.type) ?? 'task',
    parent: asString(frontmatter.parent),
    blockedBy: asStringList(frontmatter.blocked_by),
    priority: asString(frontmatter.priority) ?? 'normal',
    createdAt: asString(frontmatter.created_at) ?? '',
    body,
  };
}
