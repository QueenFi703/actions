/** Persistent state for a single healing session. */
export interface HealingState {
  /** ISO timestamp when the session started. */
  startedAt: string;
  /** Target repository in "owner/repo" form. */
  target: string;
  /** The failing workflow run ID that triggered healing. */
  runId: number;
  /** Current phase of the healing pipeline. */
  phase: HealingPhase;
  /** Number of patches applied so far. */
  patchesApplied: number;
  /** Whether a PR has been opened. */
  prOpened: boolean;
  prUrl?: string;
}

export type HealingPhase =
  | "initializing"
  | "analyzing"
  | "patching"
  | "committing"
  | "pr-opened"
  | "done"
  | "failed";

/** Create a fresh healing-session state object. */
export function createState(target: string, runId: number): HealingState {
  return {
    startedAt: new Date().toISOString(),
    target,
    runId,
    phase: "initializing",
    patchesApplied: 0,
    prOpened: false,
  };
}

/** Return a copy of the state with the phase advanced. */
export function advancePhase(state: HealingState, next: HealingPhase): HealingState {
  return { ...state, phase: next };
}

/** Serialize state to a single-line JSON string for logging. */
export function serializeState(state: HealingState): string {
  return JSON.stringify(state);
}
