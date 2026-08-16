// Host-neutral core contract for Beanflow. Nothing in this file may reference
// a specific host (Pi, OMP, Codex). Host specifics belong in the host adapter.

/** A reference to a Bean on the tracker. */
export interface BeanRef {
  id: string;
  path: string;
  title: string;
}

/** A frozen list of approved executable descendants, in dependency order. */
export interface ScopeManifest {
  parentBean: BeanRef;
  /** ISO 8601 timestamp of when the manifest was frozen. */
  frozenAt: string;
  executableLeaves: BeanRef[];
}

/** Evidence that a leaf is genuinely blocked, recorded to the Bean. */
export interface BlockerReceipt {
  leaf: BeanRef;
  evidence: string;
  requiredDecision: string;
  /** ISO 8601 timestamp of when the blocker was recorded. */
  recordedAt: string;
}

/** Phases of one bounded run. */
export type RunPhase =
  | 'armed' // manifest frozen; authorized but branch/worktree not yet created
  | 'setting-up' // creating branch and worktree, recording base
  | 'running' // selecting and executing leaves
  | 'paused' // owner stopped via Esc or hard stop; resumable
  | 'completed'; // all leaves done and parent verified

/** Persistent, resumable state for one run. */
export interface RunState {
  schemaVersion: 1;
  runId: string;
  parentBean: BeanRef;
  manifest: ScopeManifest;
  phase: RunPhase;
  baseBranch: string | null;
  baseCommit: string | null;
  selectedLeaf: BeanRef | null;
  blockers: BlockerReceipt[];
  /** Consecutive no-progress attempts per leaf, keyed by leaf id. */
  attempts: Record<string, number>;
  /** ISO 8601 timestamps. */
  startedAt: string;
  updatedAt: string;
}
