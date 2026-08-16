import { describe, expect, it } from 'vitest';
import { beanIdFromPath, parseBean } from '../src/core/bean.js';

describe('beanIdFromPath', () => {
  it('extracts the id before the first --', () => {
    expect(beanIdFromPath('.beans/beanflow-67xs--single-leaf.md')).toBe('beanflow-67xs');
  });

  it('handles a path without a slug separator', () => {
    expect(beanIdFromPath('beanflow-gh4l.md')).toBe('beanflow-gh4l');
  });
});

describe('parseBean', () => {
  const raw = `---
# beanflow-67xs
title: Single-leaf selection and atomic completion commit
status: todo
type: task
tags:
    - ready-for-agent
parent: beanflow-twc8
blocked_by:
    - beanflow-7pq9
priority: normal
created_at: 2026-08-16T00:00:00Z
---

## What to build

Do the thing.

## Verification

- \`pnpm test\`
`;

  it('parses frontmatter and body', () => {
    const bean = parseBean('.beans/beanflow-67xs--single-leaf.md', raw);
    expect(bean.id).toBe('beanflow-67xs');
    expect(bean.title).toBe('Single-leaf selection and atomic completion commit');
    expect(bean.status).toBe('todo');
    expect(bean.type).toBe('task');
    expect(bean.parent).toBe('beanflow-twc8');
    expect(bean.blockedBy).toEqual(['beanflow-7pq9']);
    expect(bean.priority).toBe('normal');
    expect(bean.createdAt).toBe('2026-08-16T00:00:00Z');
    expect(bean.body).toContain('## What to build');
  });

  it('tolerates missing parent and blocked_by', () => {
    const minimal = `---
# beanflow-x
title: X
---

body`;
    const bean = parseBean('beanflow-x--x.md', minimal);
    expect(bean.parent).toBeNull();
    expect(bean.blockedBy).toEqual([]);
  });
});
