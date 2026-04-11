// Credits: QueenFi703
import { loadPatches } from "../patches/index.js";
import { analyzeRepo } from "./perception.js";
import type { PerceptionContext } from "./perception.js";

/** Extended context surface required by the agent (adds issues + PR payload). */
export interface AgentContext extends PerceptionContext {
  octokit: PerceptionContext["octokit"] & {
    repos: PerceptionContext["octokit"]["repos"] & {
      createOrUpdateFileContents(params: {
        owner: string;
        repo: string;
        path: string;
        message: string;
        content: string;
        sha: string;
      }): Promise<unknown>;
    };
    issues: {
      createComment(params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }): Promise<unknown>;
    };
  };
  payload: {
    pull_request?: { number: number };
  };
}

export const agent = {
  /**
   * Triggered on pull_request.opened / pull_request.synchronize.
   *
   * Analyses all workflow files in the head branch, runs each registered
   * patch's detect(), and commits fixes + posts PR comments for anything
   * that matches.
   */
  async handlePullRequest(ctx: AgentContext): Promise<void> {
    const patches = await loadPatches();
    const analysis = await analyzeRepo(ctx);

    for (const patch of patches) {
      if (!patch.detect(analysis)) continue;

      const result = await Promise.resolve(patch.apply(ctx, analysis));
      if (!result) continue;

      if (result.commit) {
        await ctx.octokit.repos.createOrUpdateFileContents({
          ...ctx.repo(),
          path: result.path,
          message: `🛠 Thresh: ${patch.id}`,
          content: Buffer.from(result.content, "utf-8").toString("base64"),
          sha: result.sha,
        });
      }

      if (result.comment && ctx.payload.pull_request) {
        await ctx.octokit.issues.createComment({
          ...ctx.repo(),
          issue_number: ctx.payload.pull_request.number,
          body: result.comment,
        });
      }
    }
  },

  /** Triggered on push events.  Extend to add lightweight push-time checks. */
  async handlePush(_ctx: AgentContext): Promise<void> {
    // reserved for future push-time analysis
  },

  /** Triggered on workflow_run.completed.  Extend to react to CI failures. */
  async handleWorkflow(_ctx: AgentContext): Promise<void> {
    // reserved for failure-driven patch triggers
  },
};
