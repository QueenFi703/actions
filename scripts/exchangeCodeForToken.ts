import fetch from "node-fetch";

const code = process.env.CODE;

if (!code) {
  throw new Error("CODE environment variable is required");
}

const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.SETUP_PAT}`,
    Accept: "application/vnd.github+json",
  },
});

const data = (await res.json()) as {
  id: number;
  pem: string;
  installation: { id: number };
};

console.log("App ID:", data.id);
console.log("Private Key:", data.pem);
console.log("Installation ID:", data.installation.id);
