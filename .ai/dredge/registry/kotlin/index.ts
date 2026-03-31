// Credits: QueenFi703
import type { Patch } from "../../types.js";

/**
 * Patches for Kotlin compiler failures.
 */

/** Bump the Kotlin compiler daemon heap when a daemon-related error is detected. */
const kotlinDaemonPatch: Patch = {
  id: "kotlin/daemon-heap",
  description: "Increase kotlin.daemon.jvm.options heap size in gradle.properties when Kotlin daemon fails",
  targets: ["kotlin"],
  async apply(ctx) {
    const daemonFailure = ctx.failures.find(
      f => f.category === "kotlin" && /kotlin.*daemon/i.test(f.message)
    );
    if (!daemonFailure) return false;

    const path = "gradle.properties";
    let currentContent = "";
    let sha: string | undefined;

    try {
      const { data } = await ctx.octokit.repos.getContent({
        owner: ctx.owner,
        repo: ctx.repo,
        path,
      });
      if ("content" in data) {
        currentContent = Buffer.from(data.content, "base64").toString("utf8");
        sha = data.sha;
      }
    } catch {
      // File doesn't exist yet.
    }

    if (currentContent.includes("kotlin.daemon.jvm.options")) return false;

    const newContent =
      currentContent.trimEnd() +
      "\nkotlin.daemon.jvm.options=-Xmx2g -XX:MaxMetaspaceSize=256m\n";

    await ctx.octokit.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      message: "fix(kotlin): increase Kotlin daemon JVM heap [DOT]",
      content: Buffer.from(newContent).toString("base64"),
      ...(sha ? { sha } : {}),
      ...(ctx.healingBranch ? { branch: ctx.healingBranch } : {}),
    });

    return true;
  },
};

export const kotlinPatches: Patch[] = [kotlinDaemonPatch];
