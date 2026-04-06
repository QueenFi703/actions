// Credits: QueenFi703
/** A single workflow file loaded from .github/workflows/. */
export interface WorkflowFile {
  /** Filename, e.g. "ci.yml" */
  name: string;
  /** Raw YAML text */
  raw: string;
  /**
   * Parsed YAML object (js-yaml output).
   * Optional: the local runner skips YAML parsing since all built-in patches
   * operate on the raw text.  The perception layer always populates this field
   * when running in server (Probot) mode.
   */
  parsed?: unknown;
  /** Git blob SHA (needed for file-update API calls) */
  sha: string;
}

/** Snapshot of everything the agent has observed about a repository. */
export interface RepoAnalysis {
  workflows: WorkflowFile[];
}

/** The outcome produced by a patch's apply() function. */
export interface PatchResult {
  /** Repo-relative path to write, e.g. ".github/workflows/ci.yml" */
  path: string;
  /** New file content (plain text, NOT base64) */
  content: string;
  /** Current blob SHA for optimistic-concurrency update */
  sha: string;
  /** When true, commit the updated file via the API */
  commit?: boolean;
  /** When set, post this as a PR comment */
  comment?: string;
}

/** A single modular fix that Thresh can detect and apply. */
export interface Patch {
  /** Unique identifier used in commit messages and logs */
  id: string;
  /** Return true if this patch should be applied given the analysis */
  detect(analysis: RepoAnalysis): boolean;
  /** Produce a PatchResult (or undefined if nothing to do) */
  apply(
    ctx: unknown,
    analysis: RepoAnalysis
  ): Promise<PatchResult | undefined> | PatchResult | undefined;
}
