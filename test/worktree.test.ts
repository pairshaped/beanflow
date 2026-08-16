import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FatalError } from '../src/core/failure.js';
import { setupIsolatedRun } from '../src/core/worktree.js';

function git(repoDir: string, args: string[]) {
  return execFileSync('git', ['-C', repoDir, ...args], { encoding: 'utf8' });
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'beanflow-git-'));
  git(dir, ['init', '-b', 'master', '-q']);
  // Neutralize any global commit-msg hooks (e.g. an author-enforcement hook).
  git(dir, ['config', 'core.hooksPath', mkdtempSync(join(tmpdir(), 'beanflow-hooks-'))]);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'file.txt'), 'hello');
  git(dir, ['add', 'file.txt']);
  git(dir, ['commit', '-q', '-m', 'base']);
  return dir;
}

const policy = (repo: string) => ({
  branchName: 'feature-1',
  worktreeDir: join(repo, '.worktrees', 'feature-1'),
  baseBranch: 'master',
  ignorePattern: '.worktrees/',
});

describe('setupIsolatedRun', () => {
  it('creates a branch and worktree on a clean base', () => {
    const repo = makeRepo();
    const result = setupIsolatedRun(repo, policy(repo));
    expect(result.baseBranch).toBe('master');
    expect(result.baseCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(result.branchName).toBe('feature-1');
    expect(existsSync(join(repo, '.worktrees', 'feature-1', 'file.txt'))).toBe(true);
    expect(git(repo, ['branch', '--list', 'feature-1'])).toContain('feature-1');
  });

  it('records the ignore pattern in .gitignore', () => {
    const repo = makeRepo();
    setupIsolatedRun(repo, policy(repo));
    expect(existsSync(join(repo, '.gitignore'))).toBe(true);
  });

  it('refuses a dirty base', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'dirty.txt'), 'x');
    expect(() => setupIsolatedRun(repo, policy(repo))).toThrow(FatalError);
    expect(() => setupIsolatedRun(repo, policy(repo))).toThrow(/dirty/);
  });

  it('refuses a repo with no commits', () => {
    const repo = mkdtempSync(join(tmpdir(), 'beanflow-git-'));
    git(repo, ['init', '-b', 'master', '-q']);
    expect(() => setupIsolatedRun(repo, policy(repo))).toThrow(/no base commit/);
  });

  it('refuses a detached HEAD', () => {
    const repo = makeRepo();
    git(repo, ['checkout', '-q', '--detach']);
    expect(() => setupIsolatedRun(repo, policy(repo))).toThrow(/detached/);
  });
});
