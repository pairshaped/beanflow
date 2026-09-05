import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function profile(name: string): string {
  return readFileSync(join(process.cwd(), 'codex', 'agents', `${name}.toml`), 'utf8');
}

describe('Codex Beanflow agent profiles', () => {
  it('pins routine implementation to Luna medium', () => {
    const contents = profile('beanflow-implementer');
    expect(contents).toContain('name = "beanflow-implementer"');
    expect(contents).toContain('model = "gpt-5.6-luna"');
    expect(contents).toContain('model_reasoning_effort = "medium"');
    expect(contents).toContain('BEANFLOW_OUTCOME: needs_guidance');
    expect(contents).toContain('BEANFLOW_OUTCOME: owner_blocker');
    expect(contents).toContain('same Beanflow run');
    expect(contents).toContain('bounded ordered work set');
    expect(contents).toContain('continue through the delegated work set');
    expect(contents).toContain('ordered Bean-to-commit list');
    expect(contents).toContain('Never batch Bean deletions');
    expect(contents).toContain('exact verification commands');
    expect(contents).toContain('git status --short');
    expect(contents).toContain('Rust Clippy when Rust changed');
    expect(contents).toContain('TypeScript lint and typecheck');
    expect(contents).toContain('do not need to run after every leaf');
    expect(contents).toContain('complete-then-delete lifecycle as one sequence');
    expect(contents).toContain('does not cancel an explicit verification item');
    expect(contents).toContain('must exercise the owning boundary named by the Bean');
    expect(contents).toContain('An ad hoc page or fixture');
    expect(contents).toContain('For every acceptance criterion');
    expect(contents).toContain('If the evidence only proves part of a criterion');
    expect(contents).toContain('exact test file');
    expect(contents).toContain('would visibly fail if the prohibited behavior occurred');
    expect(contents).toContain('friendly conditions that mask');
    expect(contents).toContain('prove every required event target exists before dispatch');
    expect(contents).toContain('no-op path');
    expect(contents).toContain('scope that owns them');
    expect(contents).toContain('subtree query cannot prove document-level identity');
    expect(contents).toContain('real production creation path');
    expect(contents).toContain('post-creation repair or attachment helper');
    expect(contents).toContain('executable parser fixture');
  });
});
