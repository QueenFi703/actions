import { Octokit } from "@octokit/rest";
import type { BuildFailure } from "../dredge/types.js";

/** Workflow run conclusion values that indicate a failed run. */
const FAILED_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * Fetch the log text for a specific workflow run job.
 * Returns an empty string when logs are unavailable.
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
    return resp.data as unknown as string;
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
 */
export async function failedJobIds(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<number[]> {
  const { data } = await octokit.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
  });
  return data.jobs
    .filter(j => isFailedConclusion(j.conclusion))
    .map(j => j.id);
}

/**
 * Aggregate failures across all failing jobs in a run.
 * Each job's log is fetched and analysed by Quasimoto.
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
    const log = await fetchJobLogs(octokit, owner, repo, jobId);
    const detected = analyze(log);
    allFailures.push(...detected);
  }

  return allFailures;
}
