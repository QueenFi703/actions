// Credits: QueenFi703
import type { Patch } from "../shared/types.js";
import { linuxRunnerPatch } from "./github-actions/linux-runner.js";
import { permissionsPatch } from "./github-actions/permissions.js";

/**
 * Return all registered patches in priority order.
 *
 * Patches are evaluated sequentially; the first matching patch wins per run.
 * Add new patches here to extend Thresh's capabilities.
 */
export async function loadPatches(): Promise<Patch[]> {
  return [linuxRunnerPatch, permissionsPatch];
}
