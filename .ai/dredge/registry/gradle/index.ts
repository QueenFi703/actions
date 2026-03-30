import type { Patch } from "../../types.js";

/**
 * Patches for Gradle-related failures.
 *
 * Each patch attempts a targeted fix for a specific Gradle failure pattern.
 */

/** Increase the Gradle JVM heap when an OOM error is detected. */
const gradleOomPatch: Patch = {
  id: "gradle/increase-heap",
  description: "Append org.gradle.jvmargs=-Xmx4g to gradle.properties when OOM is detected",
  targets: ["gradle"],
  async apply(ctx) {
    const oomFailure = ctx.failures.find(
      f => f.category === "gradle" && f.message.includes("OutOfMemoryError")
    );
    if (!oomFailure) return false;

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
      // File doesn't exist yet — we will create it.
    }

    if (currentContent.includes("org.gradle.jvmargs")) return false;

    const newContent = currentContent.trimEnd() + "\norg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m\n";

    await ctx.octokit.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      message: "fix(gradle): increase JVM heap to resolve OOM [DOT]",
      content: Buffer.from(newContent).toString("base64"),
      ...(sha ? { sha } : {}),
      ...(ctx.healingBranch ? { branch: ctx.healingBranch } : {}),
    });

    return true;
  },
};

/** Enable the Gradle build cache when dependency resolution failures are detected. */
const gradleBuildCachePatch: Patch = {
  id: "gradle/enable-build-cache",
  description: "Enable the Gradle build cache via gradle.properties when resolution failures occur",
  targets: ["gradle"],
  async apply(ctx) {
    const resolutionFailure = ctx.failures.find(
      f => f.category === "gradle" && f.message.includes("Could not resolve")
    );
    if (!resolutionFailure) return false;

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
      // File doesn't exist — create it.
    }

    if (currentContent.includes("org.gradle.caching=true")) return false;

    const newContent = currentContent.trimEnd() + "\norg.gradle.caching=true\n";

    await ctx.octokit.repos.createOrUpdateFileContents({
      owner: ctx.owner,
      repo: ctx.repo,
      path,
      message: "fix(gradle): enable build cache to aid dependency resolution [DOT]",
      content: Buffer.from(newContent).toString("base64"),
      ...(sha ? { sha } : {}),
      ...(ctx.healingBranch ? { branch: ctx.healingBranch } : {}),
    });

    return true;
  },
};

export const gradlePatches: Patch[] = [gradleOomPatch, gradleBuildCachePatch];
