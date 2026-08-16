import { describe, expect, it } from 'vitest';
import type { HostAdapter } from '../src/core/host.js';

describe('HostAdapter contract', () => {
  it('can be implemented host-neutrally', () => {
    const adapter: HostAdapter = {
      id: 'test-host',
      isAborted: () => false,
      report: () => {},
    };
    expect(adapter.id).toBe('test-host');
    expect(adapter.isAborted()).toBe(false);
  });
});
