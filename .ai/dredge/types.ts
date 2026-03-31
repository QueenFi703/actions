// Credits: QueenFi703
/** Severity of a detected build failure. */
export type FailureSeverity = "critical" | "error" | "warning";

/** High-level category of a build failure. */
export type FailureCategory = "gradle" | "kotlin" | "workflow" | "unknown";

/** A structured representation of a single detected failure. */
export interface BuildFailure {
  category: FailureCategory;
  severity: FailureSeverity;
  /** Human-readable description of the failure. */
  message: string;
  /** Optional raw log lines that triggered the detection. */
  evidence?: string[];
}

/** A patch that DREDGE knows how to apply. */
export interface Patch {
  /** Unique identifier for this patch. */
  id: string;
  /** Human-readable description. */
  description: string;
  /** Which failure categories this patch can address. */
  targets: FailureCategory[];
  /**
   * Execute the patch against a given target repository.
   * Returns true when the patch was applied, false when it was skipped.
   */
  apply(context: PatchContext): Promise<boolean>;
}

/** Context provided to every patch at execution time. */
export interface PatchContext {
  /** GitHub REST client (already authenticated). */
  octokit: import("@octokit/rest").Octokit;
  /** Owner of the target repository (e.g. "QueenFi703"). */
  owner: string;
  /** Name of the target repository (e.g. "amazon-iap-kotlin"). */
  repo: string;
  /** Failures detected by Quasimoto for this run. */
  failures: BuildFailure[];
  /** The failed workflow run ID. */
  runId: number;
  /**
   * Dedicated healing branch (e.g. "dot/heal/12345") that patches should
   * commit their file changes to.  When absent, patches fall back to the
   * repository's default branch.
   */
  healingBranch?: string;
}

/** Result summary returned after a healing cycle. */
export interface HealingResult {
  /** Number of patches that were applied. */
  applied: number;
  /** Number of patches that were skipped. */
  skipped: number;
  /** IDs of patches that were successfully applied. */
  appliedPatches: string[];
  /** Whether a pull-request was opened as part of healing. */
  prOpened: boolean;
  prUrl?: string;
}
