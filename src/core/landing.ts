// Separately authorized landing flow. Landing is not part of autonomous
// execution: it requires explicit owner approval and follows repository merge
// and cleanup policy (merge target into feature, verify there, fast-forward
// the target, then remove the clean worktree and merged branch).

import { execFileSync } from 'node:child_process';
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

export interface LandingRequest {
  /** Main repository directory (target branch checked out here). */
  repoDir: string;
  /** Worktree directory (feature branch checked out here). */
  worktreePath: string;
  targetBranch: string;
  featureBranch: string;
  /** Explicit owner approval. Without it, landing is refused. */
  approved: boolean;
}

export interface LandingResult {
  targetBranch: string;
  featureBranch: string;
  worktreeRemoved: boolean;
}

export function land(req: LandingRequest, verify?: () => void): LandingResult {
  if (!req.approved) {
    throw new FatalError('landing requires explicit owner approval');
  }
  if (!req.repoDir || !req.worktreePath || !req.targetBranch || !req.featureBranch) {
    throw new FatalError('landing requires repoDir, worktreePath, targetBranch, and featureBranch');
  }
  // Merge the target into the feature branch, in the worktree. Conflicts surface here.
  git(req.worktreePath, ['merge', '--no-edit', req.targetBranch]);
  // Verify in the branch before touching the target.
  if (verify) verify();
  // Fast-forward the target branch to the verified result.
  git(req.repoDir, ['merge', '--ff-only', req.featureBranch]);
  // Remove the clean worktree and the merged branch.
  git(req.repoDir, ['worktree', 'remove', req.worktreePath]);
  git(req.repoDir, ['branch', '-d', req.featureBranch]);
  return { targetBranch: req.targetBranch, featureBranch: req.featureBranch, worktreeRemoved: true };
}
