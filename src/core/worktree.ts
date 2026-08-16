// Branch and worktree setup driven by explicit repository policy.
// The agent reads AGENTS.md and passes the concrete values in; these
// operations only run deterministic git commands and reject a bad base.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FatalError } from './failure.js';

function git(repoDir: string, args: string[]): string {
  try {
    return execFileSync('git', ['-C', repoDir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    throw new FatalError(`git ${args.join(' ')} failed: ${e.stderr ?? e.message ?? 'unknown error'}`);
  }
}

export interface RepoPolicy {
  branchName: string;
  /** Absolute or repo-root-relative path for the new worktree. */
  worktreeDir: string;
  baseBranch: string;
  /** Optional .gitignore pattern to ensure, e.g. ".worktrees/". */
  ignorePattern?: string;
}

export interface RunSetup {
  baseBranch: string;
  baseCommit: string;
  branchName: string;
  worktreePath: string;
}

export function checkBaseClean(repoDir: string): void {
  const status = git(repoDir, ['status', '--porcelain']);
  if (status.trim() !== '') {
    throw new FatalError('base is dirty; refusing to start a run');
  }
}

/** Return the current branch name, or null when HEAD is detached. */
function currentBranch(repoDir: string): string | null {
  try {
    return git(repoDir, ['symbolic-ref', '--short', 'HEAD']).trim();
  } catch {
    return null;
  }
}

export function resolveBase(repoDir: string, expectedBranch: string): { baseBranch: string; baseCommit: string } {
  const baseBranch = currentBranch(repoDir);
  if (baseBranch === null) {
    throw new FatalError('base is a detached HEAD; refusing to start a run');
  }
  if (baseBranch !== expectedBranch) {
    throw new FatalError(`base branch ${baseBranch} does not match expected ${expectedBranch}`);
  }
  let baseCommit: string;
  try {
    baseCommit = git(repoDir, ['rev-parse', 'HEAD']).trim();
  } catch {
    throw new FatalError('no base commit to record (repository has no commits)');
  }
  return { baseBranch, baseCommit };
}

/** Ensure `pattern` is present in the repo-root .gitignore, creating it if needed. */
export function ensureGitignoreEntry(repoDir: string, pattern: string): void {
  const giPath = join(repoDir, '.gitignore');
  const existing = existsSync(giPath) ? readFileSync(giPath, 'utf8') : '';
  if (existing.split('\n').some((l) => l.trim() === pattern)) return;
  const suffix = existing === '' || existing.endsWith('\n') ? '' : '\n';
  writeFileSync(giPath, `${existing}${suffix}${pattern}\n`);
}

/** Create a branch and worktree for a run on a clean, unambiguous base. */
export function setupIsolatedRun(repoDir: string, policy: RepoPolicy): RunSetup {
  if (!policy.branchName || !policy.worktreeDir || !policy.baseBranch) {
    throw new FatalError('repo policy must specify branchName, worktreeDir, and baseBranch');
  }
  checkBaseClean(repoDir);
  const { baseBranch, baseCommit } = resolveBase(repoDir, policy.baseBranch);
  if (existsSync(policy.worktreeDir)) {
    throw new FatalError(`worktree path already exists: ${policy.worktreeDir}`);
  }
  if (policy.ignorePattern) ensureGitignoreEntry(repoDir, policy.ignorePattern);
  git(repoDir, ['worktree', 'add', '-b', policy.branchName, policy.worktreeDir, baseCommit]);
  return {
    baseBranch,
    baseCommit,
    branchName: policy.branchName,
    worktreePath: policy.worktreeDir,
  };
}
