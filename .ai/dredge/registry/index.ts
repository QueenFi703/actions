import { gradlePatches } from "./gradle/index.js";
import { kotlinPatches } from "./kotlin/index.js";
import { workflowPatches } from "./workflow/index.js";
import type { Patch } from "../types.js";

/**
 * Master registry of all patches known to DREDGE.
 *
 * Patches are applied in the order they appear here, so higher-priority
 * patches should be listed first.
 */
export const registry: Patch[] = [
  ...gradlePatches,
  ...kotlinPatches,
  ...workflowPatches,
];

/** Look up a patch by its unique ID. */
export function findPatch(id: string): Patch | undefined {
  return registry.find(p => p.id === id);
}
