import type { BuildFailure } from "../dredge/types.js";

/** Patterns that identify known Gradle failure signatures in log output. */
const GRADLE_PATTERNS: RegExp[] = [
  /Could not resolve/i,
  /BUILD FAILED/,
  /Execution failed for task/i,
  /Could not GET/i,
  /Connection refused/i,
  /Unable to load class/i,
  /Unsupported class file major version/i,
  /java\.lang\.OutOfMemoryError/,
];

/** Patterns that identify known Kotlin compiler failure signatures. */
const KOTLIN_PATTERNS: RegExp[] = [
  /error: unresolved reference/i,
  /error: type mismatch/i,
  /error: none of the following functions/i,
  /Kotlin compiler daemon/i,
  /KotlinCompileDaemon/i,
  /kotlin\.KotlinNullPointerException/i,
];

/** Patterns that indicate a general workflow / infrastructure failure. */
const WORKFLOW_PATTERNS: RegExp[] = [
  /Error: The process .* failed with exit code/i,
  /Process completed with exit code [^0]/,
  /##\[error\]/,
  /runner: Can't find action/i,
];

/**
 * Analyze raw log text from a failed CI run and return structured failures.
 */
export function analyzeLog(log: string): BuildFailure[] {
  const lines = log.split("\n");
  const failures: BuildFailure[] = [];

  for (const line of lines) {
    for (const pattern of GRADLE_PATTERNS) {
      if (pattern.test(line)) {
        failures.push({
          category: "gradle",
          severity: line.includes("BUILD FAILED") ? "critical" : "error",
          message: line.trim(),
          evidence: [line],
        });
        break;
      }
    }

    for (const pattern of KOTLIN_PATTERNS) {
      if (pattern.test(line)) {
        failures.push({
          category: "kotlin",
          severity: "error",
          message: line.trim(),
          evidence: [line],
        });
        break;
      }
    }

    for (const pattern of WORKFLOW_PATTERNS) {
      if (pattern.test(line)) {
        failures.push({
          category: "workflow",
          severity: "warning",
          message: line.trim(),
          evidence: [line],
        });
        break;
      }
    }
  }

  return deduplicate(failures);
}

/** Remove exact-duplicate failure messages to keep the result concise. */
function deduplicate(failures: BuildFailure[]): BuildFailure[] {
  const seen = new Set<string>();
  return failures.filter(f => {
    if (seen.has(f.message)) return false;
    seen.add(f.message);
    return true;
  });
}
