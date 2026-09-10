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
  epic: BeanRef;
  /** ISO 8601 timestamp of when the manifest was frozen. */
  frozenAt: string;
  /** Milestones retained so deleting their Tasks does not turn them into work. */
  milestones?: BeanRef[];
  tasks: BeanRef[];
}

/** Evidence that a task is genuinely blocked, recorded to the Bean. */
export interface BlockerReceipt {
  task: BeanRef;
  evidence: string;
  requiredDecision: string;
  /** ISO 8601 timestamp of when the blocker was recorded. */
  recordedAt: string;
}

/** Phases of one bounded run. */
export type RunPhase =
  | 'armed' // manifest frozen; authorized but branch/worktree not yet created
  | 'setting-up' // creating branch and worktree, recording base
  | 'running' // selecting and executing tasks
  | 'paused' // owner stopped via Esc or hard stop; resumable
  | 'completed'; // all Milestones and Tasks done and Epic verified

/** Persistent, resumable state for one run. */
export interface RunState {
  schemaVersion: 2;
  runId: string;
  epic: BeanRef;
  manifest: ScopeManifest;
  phase: RunPhase;
  baseBranch: string | null;
  baseCommit: string | null;
  /** Absolute isolated worktree path. Optional only for schema-v1 compatibility. */
  worktreePath?: string | null;
  selectedTask: BeanRef | null;
  blockers: BlockerReceipt[];
  /** Consecutive no-progress attempts per task, keyed by task id. */
  attempts: Record<string, number>;
  /** Optional bounds for an unattended run: max total attempts and a deadline. */
  retryCeiling?: number;
  deadline?: string | null;
  /** ISO 8601 timestamps. */
  startedAt: string;
  updatedAt: string;
}
