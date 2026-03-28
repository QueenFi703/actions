import fs from "fs";
import yaml from "js-yaml";

const raw = fs.readFileSync("manifest/app.yml", "utf-8");
const manifest = yaml.load(raw);
const encoded = encodeURIComponent(JSON.stringify(manifest));

const url = `https://github.com/apps/new?manifest=${encoded}`;

console.log(`\nCreate your app:\n${url}`);
