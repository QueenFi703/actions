// Credits: QueenFi703
import yaml from "js-yaml";
import type { RepoAnalysis, WorkflowFile } from "../shared/types.js";

/** Shape of a single entry returned by the GitHub "list directory contents" API. */
interface ContentEntry {
  type: string;
  name: string;
  path: string;
  sha: string;
}

/** Shape of a single file returned by the GitHub "get file contents" API. */
interface ContentFile {
  type: string;
  name: string;
  sha: string;
  content: string;
  encoding: string;
}

/** Minimal Octokit surface needed by the perception layer. */
interface PerceptionOctokit {
  repos: {
    getContent(params: {
      owner: string;
      repo: string;
      path: string;
    }): Promise<{ data: unknown }>;
  };
}

/** Minimal Probot context surface needed by the perception layer. */
export interface PerceptionContext {
  octokit: PerceptionOctokit;
  repo<T extends Record<string, unknown>>(
    extra?: T
  ): { owner: string; repo: string } & T;
}

/**
 * Retrieve and parse every workflow file in `.github/workflows/`.
 *
 * The GitHub API returns only metadata (no content) when listing a directory,
 * so each file is fetched individually.
 */
export async function analyzeRepo(
  ctx: PerceptionContext
): Promise<RepoAnalysis> {
  const { data: dirData } = await ctx.octokit.repos.getContent(
    ctx.repo({ path: ".github/workflows" })
  );

  const entries = dirData as ContentEntry[];
  const workflows: WorkflowFile[] = [];

  for (const entry of entries) {
    if (entry.type !== "file") continue;
    if (!entry.name.endsWith(".yml") && !entry.name.endsWith(".yaml")) continue;

    const { data: fileData } = await ctx.octokit.repos.getContent(
      ctx.repo({ path: entry.path })
    );

    const file = fileData as ContentFile;
    const raw =
      file.encoding === "base64"
        ? Buffer.from(file.content.replace(/\n/g, ""), "base64").toString(
            "utf-8"
          )
        : file.content;

    workflows.push({
      name: entry.name,
      parsed: yaml.load(raw),
      raw,
      sha: file.sha,
    });
  }

  return { workflows };
}
