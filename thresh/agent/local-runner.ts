// Credits: QueenFi703
/**
 * thresh/agent/local-runner.ts
 *
 * Runs the patch registry against the local checkout — no GitHub App or
 * webhook server required.  Designed to be invoked from a GitHub Actions
 * workflow step so that Thresh can self-heal this repository's own workflows.
 *
 * After applying patches the workflow step should commit + push any changes
 * (see .github/workflows/thresh-agent.yml for the full wiring).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { loadPatches } from "../patches/index.js";
import type { WorkflowFile } from "../shared/types.js";

const WORKFLOWS_DIR = ".github/workflows";

function getWorkflows(): WorkflowFile[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => {
      const raw = readFileSync(`${WORKFLOWS_DIR}/${f}`, "utf-8");
      return {
        name: f,
        raw,
        // sha is empty in local mode; patches that set commit:true are written
        // via writeFileSync instead of the GitHub API
        sha: "",
        parsed: undefined,
      };
    });
}

async function run(): Promise<void> {
  const patches = await loadPatches();
  const workflows = getWorkflows();

  let applied = 0;

  for (const patch of patches) {
    const analysis = { workflows };
    if (!patch.detect(analysis)) continue;

    const result = await Promise.resolve(patch.apply(null, analysis));
    if (!result?.commit) continue;

    writeFileSync(result.path, result.content, "utf-8");
    applied++;
    console.log(`✔ [${patch.id}] patched ${result.path}`);
    if (result.comment) {
      console.log(`   ${result.comment}`);
    }
  }

  if (applied === 0) {
    console.log("✅ No patches needed — all workflows look healthy.");
  } else {
    console.log(`\n🛠  ${applied} patch(es) applied.`);
  }
}

run().catch((err: unknown) => {
  console.error("Thresh local runner failed:", err);
  process.exit(1);
});
