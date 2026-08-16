// Failure semantics: classify errors so the runner knows how to react.
//
// - retryable: transient, worth retrying with backoff up to the retry ceiling.
// - blocker: needs a decision or external change; record evidence and skip the leaf.
// - fatal: unrecoverable or a violated safety invariant; stop the run.

export type FailureKind = 'retryable' | 'blocker' | 'fatal';

export class RetryableError extends Error {
  readonly kind = 'retryable';
}

export class BlockerError extends Error {
  readonly kind = 'blocker';
}

export class FatalError extends Error {
  readonly kind = 'fatal';
}

/** Classify any thrown value. Unknown errors default to fatal: never guess. */
export function classifyError(err: unknown): FailureKind {
  if (err instanceof RetryableError) return 'retryable';
  if (err instanceof BlockerError) return 'blocker';
  if (err instanceof FatalError) return 'fatal';
  return 'fatal';
}
