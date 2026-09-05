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
  });
});
