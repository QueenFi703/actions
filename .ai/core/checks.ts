import { Octokit } from "@octokit/rest";
import type { BuildFailure } from "../dredge/types.js";

/** Workflow run conclusion values that indicate a failed run. */
const FAILED_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * Fetch the log text for a specific workflow run job.
 * Returns an empty string when logs are unavailable.
 *
 * GitHub's API sometimes returns a redirect URL rather than raw text.  When
 * the response data is not a string we follow the redirect with `fetch`.
 */
export async function fetchJobLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number
): Promise<string> {
  try {
    const resp = await octokit.actions.downloadJobLogsForWorkflowRun({
      owner,
      repo,
      job_id: jobId,
    });

    if (typeof resp.data === "string") {
      return resp.data;
    }

    // The SDK may surface a redirect URL instead of the raw body.
    // `resp.url` is the URL of the response after all redirects (OctokitResponse.url).
    if (resp.url) {
      const fetched = await fetch(resp.url);
      return fetched.text();
    }

    return "";
  } catch {
    return "";
  }
}

/** Return true when the supplied workflow run conclusion indicates a failure. */
export function isFailedConclusion(conclusion: string | null | undefined): boolean {
  return !!conclusion && FAILED_CONCLUSIONS.has(conclusion);
}

/**
 * List the IDs of all jobs that failed in the given workflow run.
 * Uses pagination to ensure all jobs are retrieved regardless of run size.
 */
export async function failedJobIds(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<number[]> {
  const jobs = await octokit.paginate(octokit.actions.listJobsForWorkflowRun, {
    owner,
    repo,
    run_id: runId,
    per_page: 100,
  });
  return jobs
    .filter(j => isFailedConclusion(j.conclusion))
    .map(j => j.id);
}

/**
 * Aggregate failures across all failing jobs in a run.
 * Each job's log is fetched and analysed by Quasimoto.
 * A corrupt or unanalysable log for one job does not abort the others.
 */
export async function collectFailures(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
  analyze: (log: string) => BuildFailure[]
): Promise<BuildFailure[]> {
  const jobIds = await failedJobIds(octokit, owner, repo, runId);
  const allFailures: BuildFailure[] = [];

  for (const jobId of jobIds) {
    try {
      const log = await fetchJobLogs(octokit, owner, repo, jobId);
      const detected = analyze(log);
      allFailures.push(...detected);
    } catch (err) {
      console.warn(`[checks] Skipping job ${jobId} — log analysis failed:`, err);
    }
  }

  return allFailures;
}
