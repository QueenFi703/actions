import type { PatchContext, HealingResult } from "../dredge/types.js";
import { execute } from "../dredge/executor.js";

/**
 * DOT — the orchestrator.
 *
 * Drives the full healing lifecycle by delegating patch execution to DREDGE,
 * which acts as the single execution engine.  All patch runs go through
 * `execute()` to avoid duplicated logic and behaviour drift.
 */
export async function orchestrate(context: PatchContext): Promise<HealingResult> {
  console.log("[DOT] Delegating patch execution to DREDGE…");
  return execute(context);
}
