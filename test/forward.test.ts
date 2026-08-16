// Forward test: run the whole Beanflow pipeline on a temporary Beans
// repository, from discovery through landing, to prove the modules compose.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditTree } from '../src/core/audit.js';
import { commitAtomic } from '../src/core/commit.js';
import { buildReport, canDeleteParent } from '../src/core/completion.js';
import { discoverBeans } from '../src/core/discovery.js';
import { freezeManifest } from '../src/core/manifest.js';
import { selectNextLeaf } from '../src/core/selection.js';
import { setupIsolatedRun } from '../src/core/worktree.js';
import { land } from '../src/core/landing.js';

function git(dir: string, args: string[]) {
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function writeBean(dir: string, id: string, title: string, type: string, parent: string | null, blockedBy: string[]) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fm: string[] = ['---', `# ${id}`, `title: ${title}`, 'status: todo', `type: ${type}`];
  if (parent) fm.push(`parent: ${parent}`);
  if (blockedBy.length) {
    fm.push('blocked_by:');
    for (const b of blockedBy) fm.push(`    - ${b}`);
  }
  fm.push('created_at: 2026-08-16T00:00:00Z', 'updated_at: 2026-08-16T00:00:00Z', '---', '');
  const body = [
    '## What to build',
    '',
    `Build the ${title} feature end to end with tests, verification, and clear scope boundaries.`,
    '',
    '## Acceptance criteria',
    '',
    '- [ ] Done',
    '',
    '## Verification',
    '',
    '- `true`',
    '',
    '## Out of scope',
    '',
    '- Nothing',
  ];
  writeFileSync(join(dir, `${id}--${slug}.md`), fm.join('\n') + body.join('\n'));
}

function makeRepoWithBeans(): string {
  const repo = mkdtempSync(join(tmpdir(), 'beanflow-forward-'));
  git(repo, ['init', '-b', 'master', '-q']);
  git(repo, ['config', 'core.hooksPath', mkdtempSync(join(tmpdir(), 'beanflow-hooks-'))]);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'user.name', 'Test']);
  const beans = join(repo, '.beans');
  mkdirSync(beans, { recursive: true });
  writeBean(beans, 'e', 'Build a widget', 'epic', null, []);
  writeBean(beans, 'g', 'Core', 'feature', 'e', []);
  writeBean(beans, 'a', 'Foundation', 'task', 'g', []);
  writeBean(beans, 'b', 'Do work', 'task', 'g', ['a']);
  git(repo, ['add', '.beans']);
  git(repo, ['commit', '-q', '-m', 'base with beans']);
  return repo;
}

describe('forward test', () => {
  it('runs the full pipeline on a temporary Beans repository', () => {
    const repo = makeRepoWithBeans();
    const beansDir = join(repo, '.beans');

    // Discovery and audit.
    const tree = discoverBeans(beansDir);
    expect(auditTree(tree).every((a) => a.passed)).toBe(true);

    // Manifest freeze.
    const manifest = freezeManifest(tree, 'e', 't0');
    expect(manifest.executableLeaves.map((l) => l.id)).toEqual(['a', 'b']);

    // Isolated run setup.
    const worktree = join(repo, '.worktrees', 'run-1');
    const setup = setupIsolatedRun(repo, {
      branchName: 'run-1',
      worktreeDir: worktree,
      baseBranch: 'master',
      ignorePattern: '.worktrees/',
    });
    expect(setup.baseCommit).toMatch(/^[0-9a-f]{40}$/);

    const completed: string[] = [];
    const leavesOf = (dir: string) => {
      const t = discoverBeans(dir);
      return t.beans.filter((b) => t.kindOf.get(b.id) === 'leaf');
    };

    // Complete leaf a: implement, delete its Bean, commit atomically.
    {
      const next = selectNextLeaf(leavesOf(join(worktree, '.beans')), new Set(completed), new Set());
      expect(next?.id).toBe('a');
      writeFileSync(join(worktree, 'foundation.txt'), 'foundation');
      rmSync(join(worktree, '.beans', 'a--foundation.md'));
      commitAtomic(worktree, 'complete a', ['foundation.txt', '.beans/a--foundation.md']);
      completed.push('a');
    }

    // Complete leaf b after a is done.
    {
      const next = selectNextLeaf(leavesOf(join(worktree, '.beans')), new Set(completed), new Set());
      expect(next?.id).toBe('b');
      writeFileSync(join(worktree, 'work.txt'), 'work');
      rmSync(join(worktree, '.beans', 'b--do-work.md'));
      commitAtomic(worktree, 'complete b', ['work.txt', '.beans/b--do-work.md']);
      completed.push('b');
    }

    // Completion report: parent deletable.
    const report = buildReport(
      manifest,
      completed.map((id) => ({ leaf: { id, path: `.beans/${id}.md`, title: id }, commitHash: 'h' })),
      [],
      { passed: true, evidence: 'true' },
    );
    expect(canDeleteParent(report)).toBe(true);

    // Landing.
    const result = land({
      repoDir: repo,
      worktreePath: worktree,
      targetBranch: 'master',
      featureBranch: 'run-1',
      approved: true,
    });
    expect(result.worktreeRemoved).toBe(true);
    expect(existsSync(worktree)).toBe(false);
  });
});
