// Credits: QueenFi703
import fs from "fs";
import yaml from "js-yaml";

const raw = fs.readFileSync("manifest/app.yml", "utf-8");
const manifest = yaml.load(raw);

if (manifest === undefined || manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
  throw new Error(
    "Parsed manifest must be a YAML mapping (plain object). Please check manifest/app.yml."
  );
}

const encoded = encodeURIComponent(JSON.stringify(manifest));

const url = `https://github.com/apps/new?manifest=${encoded}`;

console.log(`\nCreate your app:\n${url}`);
