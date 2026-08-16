// The host-specific surface of Beanflow.
//
// The core is host-neutral. A host implements this adapter and drives the
// core by calling its lifecycle entry points (added in later leaves). Pi is
// the only V1 host; the core must never import Pi code.

export interface HostAdapter {
  /** Host identifier, e.g. "pi". */
  readonly id: string;

  /**
   * True when the most recent host turn ended with an aborted stop reason
   * (Esc in Pi). The core checks this before auto-continuing a paused run.
   */
  isAborted(): boolean;

  /** Deliver a message to the owner through the host. */
  report(message: string): void | Promise<void>;
}
