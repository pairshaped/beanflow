import { describe, expect, it } from 'vitest';
import { deserializeState, roundTripState, serializeState } from '../src/core/state.js';
import type { RunState } from '../src/core/types.js';

const leaf = (id: string, title: string) => ({ id, path: `.beans/${id}.md`, title });

function sampleState(): RunState {
  const parentBean = { id: 'beanflow-gh4l', path: '.beans/beanflow-gh4l.md', title: 'Build Beanflow' };
  return {
    schemaVersion: 1,
    runId: 'run-1',
    parentBean,
    manifest: {
      parentBean,
      frozenAt: '2026-08-16T00:00:00Z',
      executableLeaves: [leaf('beanflow-a', 'Leaf A'), leaf('beanflow-b', 'Leaf B')],
    },
    phase: 'running',
    baseBranch: 'master',
    baseCommit: 'abc123',
    selectedLeaf: leaf('beanflow-a', 'Leaf A'),
    blockers: [
      {
        leaf: leaf('beanflow-c', 'Leaf C'),
        evidence: 'needs decision X',
        requiredDecision: 'choose X or Y',
        recordedAt: '2026-08-16T00:00:00Z',
      },
    ],
    attempts: { 'beanflow-a': 1 },
    startedAt: '2026-08-16T00:00:00Z',
    updatedAt: '2026-08-16T00:00:00Z',
  };
}

describe('state schema', () => {
  it('round-trips a RunState without loss', () => {
    expect(roundTripState(sampleState())).toEqual(sampleState());
  });

  it('serializes stable JSON with the schema version', () => {
    expect(serializeState(sampleState())).toContain('"schemaVersion": 1');
  });

  it('rejects an unknown schema version', () => {
    const json = JSON.stringify({ ...sampleState(), schemaVersion: 2 });
    expect(() => deserializeState(json)).toThrow(/schema/i);
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeState('{nope')).toThrow(/invalid state JSON/i);
  });

  it('rejects a state missing required fields', () => {
    expect(() => deserializeState('{"schemaVersion":1}')).toThrow(/invalid RunState/i);
  });
});
