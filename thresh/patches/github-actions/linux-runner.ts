// Credits: QueenFi703
import type { Patch, RepoAnalysis, PatchResult } from "../../shared/types.js";

/**
 * Replaces `windows-latest` runners with `ubuntu-latest`.
 *
 * Windows GitHub-hosted runners are roughly 2× more expensive and slower to
 * start.  Most Gradle / JVM builds run identically on Ubuntu.
 */
export const linuxRunnerPatch: Patch = {
  id: "enforce-linux-runner",

  detect(analysis: RepoAnalysis): boolean {
    return analysis.workflows.some((wf) => wf.raw.includes("windows-latest"));
  },

  apply(_ctx: unknown, analysis: RepoAnalysis): PatchResult | undefined {
    for (const wf of analysis.workflows) {
      if (wf.raw.includes("windows-latest")) {
        const updated = wf.raw.replace(/windows-latest/g, "ubuntu-latest");
        return {
          path: `.github/workflows/${wf.name}`,
          content: updated,
          sha: wf.sha,
          commit: true,
          comment:
            "⚙️ Replaced Windows runner with Ubuntu for compatibility and cost efficiency.",
        };
      }
    }
    return undefined;
  },
};
