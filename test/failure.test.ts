import { describe, expect, it } from 'vitest';
import { BlockerError, classifyError, FatalError, RetryableError } from '../src/core/failure.js';

describe('failure classification', () => {
  it('classifies the three kinds', () => {
    expect(classifyError(new RetryableError('x'))).toBe('retryable');
    expect(classifyError(new BlockerError('x'))).toBe('blocker');
    expect(classifyError(new FatalError('x'))).toBe('fatal');
  });

  it('defaults unknown errors to fatal', () => {
    expect(classifyError(new Error('x'))).toBe('fatal');
    expect(classifyError('a string')).toBe('fatal');
    expect(classifyError(undefined)).toBe('fatal');
  });
});
