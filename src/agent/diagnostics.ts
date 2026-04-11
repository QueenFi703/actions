export type Issue =
  | "MISSING_APP_AUTH"
  | "MISSING_INSTALLATION_ID"
  | "WORKFLOW_FAILURE"
  | "PERMISSION_DENIED";

export function detectIssues(env: NodeJS.ProcessEnv): Issue[] {
  const issues: Issue[] = [];

  if (!env.GITHUB_TOKEN) {
    issues.push("WORKFLOW_FAILURE");
  }

  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    issues.push("MISSING_APP_AUTH");
  }

  if (!env.GITHUB_APP_INSTALLATION_ID) {
    issues.push("MISSING_INSTALLATION_ID");
  }

  return issues;
}
