import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBean, type Bean } from './bean.js';

export type BeanKind = 'grouping' | 'leaf';

export interface BeanTree {
  beans: Bean[];
  byId: Map<string, Bean>;
  childrenOf: Map<string, Bean[]>;
  kindOf: Map<string, BeanKind>;
}

/** Build index maps and classify each bean as grouping or executable leaf. */
export function buildTree(beans: Bean[]): BeanTree {
  const byId = new Map(beans.map((b) => [b.id, b]));
  const childrenOf = new Map<string, Bean[]>();
  for (const b of beans) {
    if (b.parent) {
      const list = childrenOf.get(b.parent) ?? [];
      list.push(b);
      childrenOf.set(b.parent, list);
    }
  }
  const kindOf = new Map<string, BeanKind>();
  for (const b of beans) {
    const hasChildren = (childrenOf.get(b.id)?.length ?? 0) > 0;
    const isContainerType = b.type === 'epic' || b.type === 'milestone';
    kindOf.set(b.id, isContainerType || hasChildren ? 'grouping' : 'leaf');
  }
  return { beans, byId, childrenOf, kindOf };
}

/** Read and parse every `.md` Bean file under a directory. Read-only. */
export function discoverBeans(dir: string): BeanTree {
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const beans = files.map((f) => {
    const path = join(dir, f);
    return parseBean(path, readFileSync(path, 'utf8'));
  });
  return buildTree(beans);
}

export function executableLeaves(tree: BeanTree): Bean[] {
  return tree.beans.filter((b) => tree.kindOf.get(b.id) === 'leaf');
}
