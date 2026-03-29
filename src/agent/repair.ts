import { type Issue } from "./diagnostics.js";

export async function repair(issue: Issue): Promise<void> {
  switch (issue) {
    case "MISSING_APP_AUTH":
      console.log("🔧 Triggering app registration flow...");
      console.log("→ Run: publish-github-app → generate-registration-url");
      break;

    case "MISSING_INSTALLATION_ID":
      console.log("🔧 Attempting auto-resolution...");
      // call getInstallationId()
      break;

    case "WORKFLOW_FAILURE":
      console.log("🔁 Restarting workflow...");
      // future: trigger workflow dispatch
      break;

    case "PERMISSION_DENIED":
      console.log("⚠️ Permissions issue detected.");
      console.log("→ Suggest updating manifest permissions.");
      break;
  }
}
