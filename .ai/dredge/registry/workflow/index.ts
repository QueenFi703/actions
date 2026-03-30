import type { Patch } from "../../types.js";

/**
 * Patches for workflow-level (GitHub Actions infrastructure) failures.
 */

/** Re-trigger a failed workflow run by adding a workflow_dispatch trigger comment. */
const workflowRetryPatch: Patch = {
  id: "workflow/add-retry-comment",
  description: "Post a comment on the run's triggering PR indicating that a retry is recommended",
  targets: ["workflow"],
  async apply(ctx) {
    const workflowFailure = ctx.failures.find(f => f.category === "workflow");
    if (!workflowFailure) return false;

    // Find PRs associated with this run.
    const { data: run } = await ctx.octokit.actions.getWorkflowRun({
      owner: ctx.owner,
      repo: ctx.repo,
      run_id: ctx.runId,
    });

    const headSha = run.head_sha;

    // Look for open PRs that match the head SHA.
    const { data: prs } = await ctx.octokit.pulls.list({
      owner: ctx.owner,
      repo: ctx.repo,
      state: "open",
    });

    const matchingPr = prs.find(pr => pr.head.sha === headSha);
    if (!matchingPr) return false;

    await ctx.octokit.issues.createComment({
      owner: ctx.owner,
      repo: ctx.repo,
      issue_number: matchingPr.number,
      body:
        "🤖 **DOT** detected a transient workflow failure " +
        `(\`${workflowFailure.message.slice(0, 120)}\`) on run [#${ctx.runId}](${run.html_url}). ` +
        "Please re-run the failed jobs or push an empty commit to retry.",
    });

    return true;
  },
};

export const workflowPatches: Patch[] = [workflowRetryPatch];
