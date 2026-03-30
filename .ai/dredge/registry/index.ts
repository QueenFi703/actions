// .ai/dredge/registry/index.ts
// Patch Registry — the single source of truth for all known DREDGE patches.
//
// To add a new patch:
//   1. Create the plugin file under the appropriate domain subdirectory.
//   2. Import it here and add it to the `ALL_PATCHES` array.

import type { PatchPlugin } from '../types.js'

import { insertCheckout } from './workflow/insert-checkout.js'
import { fixActionVersion } from './workflow/fix-action-version.js'
import { enableCache } from './gradle/enable-cache.js'
import { fixWrapper } from './gradle/fix-wrapper.js'
import { setupNode } from './node/setup-node.js'
import { fixLockfile } from './node/fix-lockfile.js'

/** All registered patch plugins, in priority order. */
export const ALL_PATCHES: PatchPlugin[] = [
    // ── Workflow domain ──────────────────────────────────────────────────────
    insertCheckout,
    fixActionVersion,
    // ── Gradle domain ────────────────────────────────────────────────────────
    enableCache,
    fixWrapper,
    // ── Node domain ──────────────────────────────────────────────────────────
    setupNode,
    fixLockfile,
]

/**
 * Look up a registered patch by its unique id.
 *
 * @param id - The patch id, e.g. "workflow/insert-checkout".
 * @returns The matching PatchPlugin, or undefined if not found.
 */
export function findPatchById(id: string): PatchPlugin | undefined {
    return ALL_PATCHES.find(p => p.id === id)
}

/**
 * Return all patches that match the provided signal for a given domain.
 *
 * @param domain - The patch domain to filter by.
 * @param signal - The domain-specific signal data.
 * @returns All matching PatchPlugin instances.
 */
export function matchPatches(
    domain: PatchPlugin['domain'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signal: any
): PatchPlugin[] {
    return ALL_PATCHES.filter(p => p.domain === domain && p.match(signal))
}
