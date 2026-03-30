import type { Patch, PatchContext, HealingResult } from "../dredge/types.js";
import { registry } from "../dredge/registry/index.js";

/**
 * DOT — the orchestrator.
 *
 * Drives the full healing lifecycle:
 *   1. Select applicable patches from the registry.
 *   2. Execute each patch in priority order.
 *   3. Return an aggregated HealingResult.
 */
export async function orchestrate(context: PatchContext): Promise<HealingResult> {
  const failureCategories = new Set(context.failures.map(f => f.category));

  // Select patches that target at least one of the detected failure categories.
  const applicable: Patch[] = registry.filter(patch =>
    patch.targets.some(t => failureCategories.has(t))
  );

  const result: HealingResult = {
    applied: 0,
    skipped: 0,
    appliedPatches: [],
    prOpened: false,
  };

  for (const patch of applicable) {
    let wasApplied: boolean;
    try {
      wasApplied = await patch.apply(context);
    } catch (err) {
      console.error(`[DOT] Patch "${patch.id}" threw an error:`, err);
      wasApplied = false;
    }

    if (wasApplied) {
      result.applied++;
      result.appliedPatches.push(patch.id);
      console.log(`[DOT] ✅  Applied patch: ${patch.id}`);
    } else {
      result.skipped++;
      console.log(`[DOT] ⏭️  Skipped patch: ${patch.id}`);
    }
  }

  return result;
}
