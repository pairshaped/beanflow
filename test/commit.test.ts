import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commitAtomic } from '../src/core/commit.js';
import { FatalError } from '../src/core/failure.js';

function git(dir: string, args: string[]) {
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'beanflow-commit-'));
  git(dir, ['init', '-b', 'master', '-q']);
  git(dir, ['config', 'core.hooksPath', mkdtempSync(join(tmpdir(), 'beanflow-hooks-'))]);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  writeFileSync(join(dir, 'base.txt'), 'base');
  git(dir, ['add', 'base.txt']);
  git(dir, ['commit', '-q', '-m', 'base']);
  return dir;
}

function committedFiles(dir: string): string[] {
  return git(dir, ['show', '--name-only', '--pretty=format:', 'HEAD'])
    .trim()
    .split('\n')
    .filter(Boolean);
}

describe('commitAtomic', () => {
  it('stages exactly the given paths and commits', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'a.ts'), 'a');
    writeFileSync(join(repo, 'b.ts'), 'b');
    const hash = commitAtomic(repo, 'leaf commit', ['a.ts', 'b.ts']);
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
    expect(committedFiles(repo).sort()).toEqual(['a.ts', 'b.ts']);
  });

  it('stages a deletion', () => {
    const repo = makeRepo();
    rmSync(join(repo, 'base.txt'));
    commitAtomic(repo, 'delete bean', ['base.txt']);
    expect(committedFiles(repo)).toEqual(['base.txt']);
    expect(existsSync(join(repo, 'base.txt'))).toBe(false);
  });

  it('refuses when unrelated changes are present', () => {
    const repo = makeRepo();
    writeFileSync(join(repo, 'a.ts'), 'a');
    writeFileSync(join(repo, 'unrelated.ts'), 'x');
    expect(() => commitAtomic(repo, 'leaf commit', ['a.ts'])).toThrow(FatalError);
    expect(() => commitAtomic(repo, 'leaf commit', ['a.ts'])).toThrow(/unrelated/);
  });

  it('refuses an empty path set', () => {
    const repo = makeRepo();
    expect(() => commitAtomic(repo, 'empty', [])).toThrow(/no paths/);
  });
});
