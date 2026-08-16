import { describe, expect, it } from 'vitest';
import { parseOperation } from '../src/core/tool.js';

describe('parseOperation', () => {
  it.each([
    ['status', 'status'],
    ['what is the status', 'status'],
    ['where are we', 'status'],
    ['show progress', 'status'],
    ['resume', 'resume'],
    ['continue the run', 'resume'],
    ['keep going', 'resume'],
    ['refresh', 'refresh'],
    ['refresh the manifest', 'refresh'],
    ['re-freeze the plan', 'refresh'],
    ['add a new child', 'refresh'],
    ['land', 'land'],
    ['land the branch', 'land'],
    ['merge it', 'land'],
    ['ship it', 'land'],
  ])('maps %j to %s', (text, expected) => {
    expect(parseOperation(text)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(parseOperation('STATUS')).toBe('status');
    expect(parseOperation('Land It')).toBe('land');
  });

  it('returns unknown for unrecognized or empty input', () => {
    expect(parseOperation('blah blah')).toBe('unknown');
    expect(parseOperation('')).toBe('unknown');
  });
});
