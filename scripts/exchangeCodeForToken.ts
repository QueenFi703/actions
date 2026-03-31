// Credits: QueenFi703
import fetch from "node-fetch";

const code = process.env.CODE;

if (!code) {
  throw new Error("CODE environment variable is required");
}

const setupPat = process.env.SETUP_PAT;

if (!setupPat) {
  throw new Error("SETUP_PAT environment variable is required");
}

const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${setupPat}`,
    Accept: "application/vnd.github+json",
  },
});

if (!res.ok) {
  const errorBody = await res.text();
  throw new Error(
    `GitHub API request failed: ${res.status} ${res.statusText}: ${errorBody}`
  );
}

const data = (await res.json()) as {
  id: number;
  pem: string;
  installation: { id: number };
};

console.log("App ID:", data.id);
console.log("Private Key: [REDACTED - store as GITHUB_APP_PRIVATE_KEY secret]");
console.log("Installation ID:", data.installation.id);
