// Scope-isolated atomic commit: stage exactly the given paths and commit,
// refusing to touch anything else in the working tree. Never pushes.

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

function parseStatusPath(line: string): string {
  return line.slice(3).trim();
}

function normalize(p: string): string {
  return p.replace(/^\.\//, '');
}

/** Stage `paths` (additions, modifications, or deletions) and commit. Returns the commit hash. */
export function commitAtomic(repoDir: string, message: string, paths: string[]): string {
  if (paths.length === 0) throw new FatalError('no paths to commit');
  const status = git(repoDir, ['status', '--porcelain']);
  const changed = status.split('\n').filter(Boolean).map(parseStatusPath);
  const allowed = new Set(paths.map(normalize));
  const unrelated = changed.filter((p) => !allowed.has(normalize(p)));
  if (unrelated.length > 0) {
    throw new FatalError(`unrelated changes present; refusing to commit: ${unrelated.join(', ')}`);
  }
  git(repoDir, ['add', '--', ...paths]);
  const staged = new Set(
    git(repoDir, ['diff', '--cached', '--name-only']).trim().split('\n').filter(Boolean).map(normalize),
  );
  for (const p of paths) {
    if (!staged.has(normalize(p))) throw new FatalError(`expected to stage ${p} but it is not staged`);
  }
  git(repoDir, ['commit', '-q', '-m', message]);
  return git(repoDir, ['rev-parse', 'HEAD']).trim();
}
