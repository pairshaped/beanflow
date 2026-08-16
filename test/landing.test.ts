import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FatalError } from '../src/core/failure.js';
import { land } from '../src/core/landing.js';

function git(dir: string, args: string[]) {
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'beanflow-land-'));
  git(dir, ['init', '-b', 'master', '-q']);
  git(dir, ['config', 'core.hooksPath', mkdtempSync(join(tmpdir(), 'beanflow-hooks-'))]);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  writeFileSync(join(dir, 'base.txt'), 'base');
  git(dir, ['add', 'base.txt']);
  git(dir, ['commit', '-q', '-m', 'base']);
  return dir;
}

function makeRepoWithFeature() {
  const repo = makeRepo();
  const worktree = join(repo, '.worktrees', 'feature');
  git(repo, ['worktree', 'add', '-b', 'feature', worktree]);
  writeFileSync(join(worktree, 'feature.txt'), 'feature');
  git(worktree, ['add', 'feature.txt']);
  git(worktree, ['commit', '-q', '-m', 'feature work']);
  return { repo, worktree };
}

const req = (repo: string, worktree: string, approved: boolean) => ({
  repoDir: repo,
  worktreePath: worktree,
  targetBranch: 'master',
  featureBranch: 'feature',
  approved,
});

describe('land', () => {
  it('performs a clean landing: fast-forwards target and removes worktree and branch', () => {
    const { repo, worktree } = makeRepoWithFeature();
    const featureHead = git(worktree, ['rev-parse', 'HEAD']).trim();
    const result = land(req(repo, worktree, true));
    expect(result.worktreeRemoved).toBe(true);
    expect(git(repo, ['rev-parse', 'HEAD']).trim()).toBe(featureHead);
    expect(existsSync(worktree)).toBe(false);
    expect(git(repo, ['branch', '--list', 'feature']).trim()).toBe('');
  });

  it('refuses without approval and leaves target, worktree, and branch untouched', () => {
    const { repo, worktree } = makeRepoWithFeature();
    const before = git(repo, ['rev-parse', 'HEAD']).trim();
    expect(() => land(req(repo, worktree, false))).toThrow(FatalError);
    expect(() => land(req(repo, worktree, false))).toThrow(/approval/);
    expect(git(repo, ['rev-parse', 'HEAD']).trim()).toBe(before);
    expect(existsSync(worktree)).toBe(true);
    expect(git(repo, ['branch', '--list', 'feature']).trim()).toContain('feature');
  });

  it('runs verification in the branch before touching the target', () => {
    const { repo, worktree } = makeRepoWithFeature();
    let verified = false;
    land(req(repo, worktree, true), () => {
      verified = true;
    });
    expect(verified).toBe(true);
  });
});
