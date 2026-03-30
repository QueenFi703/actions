import type { Patch, PatchContext, HealingResult } from "./types.js";
import { registry } from "./registry/index.js";

/**
 * DREDGE — the patch execution engine.
 *
 * Given a populated PatchContext, DREDGE selects applicable patches from the
 * registry and runs them sequentially, collecting results.
 */
export async function execute(context: PatchContext): Promise<HealingResult> {
  const categories = new Set(context.failures.map(f => f.category));

  const candidates: Patch[] = registry.filter(p =>
    p.targets.some(t => categories.has(t))
  );

  console.log(
    `[DREDGE] ${candidates.length} patch(es) selected for categories: ${[...categories].join(", ")}`
  );

  const result: HealingResult = {
    applied: 0,
    skipped: 0,
    appliedPatches: [],
    prOpened: false,
  };

  for (const patch of candidates) {
    let applied = false;
    try {
      applied = await patch.apply(context);
    } catch (err) {
      console.error(`[DREDGE] Patch "${patch.id}" failed with error:`, err);
    }

    if (applied) {
      result.applied++;
      result.appliedPatches.push(patch.id);
    } else {
      result.skipped++;
    }
  }

  return result;
}
