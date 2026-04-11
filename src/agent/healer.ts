import { detectIssues } from "./diagnostics.js";
import { repair } from "./repair.js";

export async function runHealer(): Promise<void> {
  const issues = detectIssues(process.env);

  if (issues.length === 0) {
    console.log("✅ System healthy.");
    return;
  }

  console.log("🧠 Issues detected:", issues);

  for (const issue of issues) {
    await repair(issue);
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  await runHealer();
}
