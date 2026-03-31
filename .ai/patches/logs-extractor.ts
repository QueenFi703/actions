import AdmZip from "adm-zip";

export async function extractLogsFromRedirect(downloadResp: {
  headers?: Record<string, string>;
}): Promise<string> {
  const headers = downloadResp?.headers ?? {};
  const location = headers["location"] ?? headers["Location"];
  if (!location) throw new Error("Missing redirect location for logs download.");

  const archiveResp = await fetch(location);
  if (!archiveResp.ok) {
    throw new Error(
      `Failed to fetch logs archive: ${archiveResp.status} ${archiveResp.statusText}`,
    );
  }

  const buffer = Buffer.from(await archiveResp.arrayBuffer());
  const zip = new AdmZip(buffer);

  const logEntries: string[] = [];
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory) logEntries.push(zip.readAsText(entry));
  }
  return logEntries.join("\n");
}
