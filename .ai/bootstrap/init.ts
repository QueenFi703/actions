// Credits: QueenFi703
import { Octokit } from "@octokit/rest";
import { analyzeLog } from "../quasimoto/analyzer.js";
import { collectFailures } from "../core/checks.js";
import { orchestrate } from "../core/dot.js";
import { createState, advancePhase, serializeState } from "../core/state.js";
import { buildOctokit, parseRepo, createHealingBranch, openHealingPr } from "../utils/git.js";
import type { PatchContext } from "../dredge/types.js";

/**
 * Bootstrap entry point — called by the fi-core GitHub Actions workflow.
 *
 * Required environment variables:
 *   TARGET_REPO  — "owner/repo" of the repository to heal
 *   RUN_ID       — the numeric ID of the failed workflow run
 *   GH_PAT       — a Personal Access Token with contents:write and pull-requests:write
 *                  (falls back to GITHUB_TOKEN when GH_PAT is absent)
 */
async function main(): Promise<void> {
  const targetRepoEnv = process.env.TARGET_REPO;
  const runIdEnv = process.env.RUN_ID;

  if (!targetRepoEnv) {
    throw new Error("TARGET_REPO environment variable is required.");
  }
  if (!runIdEnv) {
    throw new Error("RUN_ID environment variable is required.");
  }

  const runId = parseInt(runIdEnv, 10);
  if (isNaN(runId)) {
    throw new Error(`RUN_ID must be a valid integer, got: "${runIdEnv}".`);
  }

  const { owner, repo } = parseRepo(targetRepoEnv);
  const octokit: Octokit = buildOctokit();

  let state = createState(targetRepoEnv, runId);
  console.log(`[INIT] Starting healing session: ${serializeState(state)}`);

  // Phase: analyzing
  state = advancePhase(state, "analyzing");
  console.log(`[INIT] Collecting failures from ${targetRepoEnv} run #${runId}…`);

  const failures = await collectFailures(octokit, owner, repo, runId, analyzeLog);
  console.log(`[INIT] Detected ${failures.length} failure(s).`);

  if (failures.length === 0) {
    console.log("[INIT] No actionable failures detected. Exiting cleanly.");
    state = advancePhase(state, "done");
    console.log(`[INIT] Final state: ${serializeState(state)}`);
    return;
  }

  // Create a dedicated healing branch so patches never touch the default branch directly.
  const healingBranch = await createHealingBranch(octokit, owner, repo, runId);
  console.log(`[INIT] Created healing branch: ${healingBranch}`);

  // Phase: patching
  state = advancePhase(state, "patching");
  const context: PatchContext = { octokit, owner, repo, failures, runId, healingBranch };
  const result = await orchestrate(context);

  if (result.applied > 0) {
    // Open (or locate) a PR for the healing branch.
    try {
      const prUrl = await openHealingPr(octokit, owner, repo, healingBranch, runId);
      result.prOpened = true;
      result.prUrl = prUrl;
    } catch (err) {
      console.error("[INIT] Failed to open healing PR:", err);
    }
  }

  state = {
    ...state,
    phase: result.prOpened ? "pr-opened" : "done",
    patchesApplied: result.applied,
    prOpened: result.prOpened,
    prUrl: result.prUrl,
  };

  console.log(`[INIT] Healing complete. Applied: ${result.applied}, Skipped: ${result.skipped}`);
  if (result.appliedPatches.length > 0) {
    console.log(`[INIT] Patches applied: ${result.appliedPatches.join(", ")}`);
  }
  if (result.prUrl) {
    console.log(`[INIT] PR opened: ${result.prUrl}`);
  }

  console.log(`[INIT] Final state: ${serializeState(state)}`);
}

main().catch(err => {
  console.error("[INIT] Fatal error:", err);
  process.exit(1);
});
