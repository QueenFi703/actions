// .ai/dredge/types.ts
// Core type definitions for the DREDGE Patch Registry system.

/** Signal passed to PatchPlugin.match to determine applicability. */
export interface PatchSignal {
    /** The domain-specific signal data (e.g. parsed YAML, Gradle config, package.json). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
    /** Optional file path the signal was sourced from. */
    filePath?: string
}

/** Context provided to PatchPlugin.apply when a patch is executed. */
export interface PatchContext {
    filePath: string
    repoRoot: string
}

/** Result returned by PatchPlugin.apply. */
export interface PatchResult {
    /** Whether the patch made any changes. */
    changed: boolean
    /** Optional human-readable description of what was done. */
    message?: string
}

/** The three domains a patch plugin can target. */
export type PatchDomain = 'workflow_yaml' | 'gradle_config' | 'node_config'

/**
 * A modular, self-describing patch plugin in the DREDGE registry.
 *
 * Every fix has a unique id, belongs to a domain, knows when it applies
 * (match), and knows how to apply itself (apply).
 */
export interface PatchPlugin {
    /** Unique identifier for this patch, e.g. "workflow/insert-checkout". */
    id: string
    /** Which domain this patch targets. */
    domain: PatchDomain
    /**
     * Returns true when the patch should be applied given the provided signal.
     * @param signal - Domain-specific signal data used to decide applicability.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    match(signal: any): boolean
    /**
     * Applies the patch to the target file/repo.
     * @param context - The file path and repo root to operate on.
     * @returns A PatchResult describing what changed.
     */
    apply(context: PatchContext): Promise<PatchResult>
}
