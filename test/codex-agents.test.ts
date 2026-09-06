import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function profile(name: string): string {
  return readFileSync(join(process.cwd(), 'codex', 'agents', `${name}.toml`), 'utf8');
}

describe('Codex Beanflow agent profiles', () => {
  it('pins routine implementation to Sol low', () => {
    const contents = profile('beanflow-implementer');
    expect(contents).toContain('name = "beanflow-implementer"');
    expect(contents).toContain('model = "gpt-5.6-sol"');
    expect(contents).toContain('model_reasoning_effort = "low"');
    expect(contents).toContain('BEANFLOW_OUTCOME: needs_guidance');
    expect(contents).toContain('BEANFLOW_OUTCOME: owner_blocker');
    expect(contents).toContain('one audited Beanflow leaf');
    expect(contents).toContain('guidance and repair loops on that leaf');
    expect(contents).toContain('do not accept or select a later leaf');
    expect(contents).toContain('Bean-to-commit result');
    expect(contents).toContain('Never batch Bean deletions');
    expect(contents).toContain('exact verification commands');
    expect(contents).toContain('git status --short');
    expect(contents).toContain('Rust Clippy when Rust changed');
    expect(contents).toContain('TypeScript lint and typecheck');
    expect(contents).toContain('never launch duplicate Cargo or Clippy processes');
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
    expect(contents).toContain("provider's current first-party documentation");
    expect(contents).toContain('must not invent provider output or callbacks');
    expect(contents).toContain("host framework's production composition path");
    expect(contents).toContain("must not become the owner of shared behavior");
    expect(contents).toContain("starts importing another route module's loader");
    expect(contents).toContain('must distinguish real elements from escaped markup text');
    expect(contents).toContain('explicit reviewed raw/trusted boundary');
    expect(contents).toContain('Do not add parallel writable implementations or sources of truth');
    expect(contents).toContain('cleanup blocks final integration or verification');
    expect(contents).toContain("return `needs_guidance` before adding it");
    expect(contents).toContain('Unfinished acceptance criteria');
    expect(contents).toContain('A `needs_guidance` report without that line is invalid');
    expect(contents).toContain('GUIDANCE_QUESTION:');
    expect(contents).toContain('Do not ask the same question again');
    expect(contents).toContain('Do not place the only assertions inside conditional `if let`');
    expect(contents).toContain('remove the old overlapping fixture condition');
    expect(contents).toContain("inspect the delta from the parent's rejected commit");
    expect(contents).toContain('Broad suite totals do not prove');
    expect(contents).toContain('do not dismiss them as baseline');
    expect(contents).toContain('reproduce the same failure at the recorded base commit');
    expect(contents).toContain('does not excuse behavior this leaf removed');
  });
});
