// Credits: QueenFi703
import type { Patch, RepoAnalysis, PatchResult } from "../../shared/types.js";

/**
 * Adds a minimal `permissions:` block to any workflow that lacks one.
 *
 * Following the principle of least privilege, workflows should declare the
 * permissions they need explicitly.  The defaults used here are conservative:
 * read-only for most scopes, write for security-events so that SARIF/code-
 * scanning uploads work.
 *
 * Insertion strategy (string-level, to preserve comments and style):
 *  1. If the file starts with a YAML document separator (`---`), the block is
 *     inserted after that line so the document remains valid.
 *  2. If there is a top-level `name:` key, the block is inserted after it so
 *     the conventional workflow header order (name → permissions → on → jobs)
 *     is respected.
 *  3. Otherwise the block is prepended at the top of the file.
 */
export const permissionsPatch: Patch = {
  id: "fix-missing-permissions",

  detect(analysis: RepoAnalysis): boolean {
    return analysis.workflows.some((wf) => !wf.raw.includes("permissions:"));
  },

  apply(_ctx: unknown, analysis: RepoAnalysis): PatchResult | undefined {
    for (const wf of analysis.workflows) {
      if (!wf.raw.includes("permissions:")) {
        const permissionsBlock =
          "permissions:\n  contents: read\n  security-events: write\n\n";

        let updated: string;

        // Case 1: file begins with YAML document separator
        if (wf.raw.startsWith("---\n")) {
          const afterSeparator = wf.raw.slice(4);
          updated = "---\n" + permissionsBlock + afterSeparator;
        } else {
          // Case 2: file has a top-level `name:` line — insert after it
          const nameLineMatch = /^name:.*\n/m.exec(wf.raw);
          if (nameLineMatch && nameLineMatch.index === 0) {
            const afterName = wf.raw.slice(nameLineMatch[0].length);
            updated = nameLineMatch[0] + permissionsBlock + afterName;
          } else {
            // Case 3: prepend
            updated = permissionsBlock + wf.raw;
          }
        }

        return {
          path: `.github/workflows/${wf.name}`,
          content: updated,
          sha: wf.sha,
          commit: true,
          comment:
            "🔐 Added required `permissions:` block for least-privilege security scanning.",
        };
      }
    }
    return undefined;
  },
};
