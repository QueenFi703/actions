// Credits: QueenFi703
import type { Patch } from "../../types.js";

/**
 * Patches for workflow-level (GitHub Actions infrastructure) failures.
 */

/**
 * Sanitize a failure message for safe use inside Markdown PR/issue comments.
 * - Removes backticks (to prevent accidental code-span injection)
 * - Removes `@` symbols (to prevent unintended @mentions)
 * - Collapses newlines to spaces (to keep the comment single-line readable)
 */
function sanitizeMarkdown(text: string): string {
  return text
    .replace(/`/g, "")
    .replace(/@/g, "")
    .replace(/\r?\n/g, " ")
    .trim();
}

/** Maximum characters of a failure message to embed in a PR/issue comment. */
const MAX_MESSAGE_LENGTH = 120;

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

    // Use the semantic association API rather than scanning all open PRs.
    const { data: prs } = await ctx.octokit.repos.listPullRequestsAssociatedWithCommit({
      owner: ctx.owner,
      repo: ctx.repo,
      commit_sha: headSha,
    });

    const matchingPr = prs.find(pr => pr.state === "open");
    if (!matchingPr) return false;

    const safeMessage = sanitizeMarkdown(workflowFailure.message).slice(0, MAX_MESSAGE_LENGTH);

    await ctx.octokit.issues.createComment({
      owner: ctx.owner,
      repo: ctx.repo,
      issue_number: matchingPr.number,
      body:
        "🤖 **DOT** detected a transient workflow failure " +
        `(\`${safeMessage}\`) on run [#${ctx.runId}](${run.html_url}). ` +
        "Please re-run the failed jobs or push an empty commit to retry.",
    });

    return true;
  },
};

export const workflowPatches: Patch[] = [workflowRetryPatch];
