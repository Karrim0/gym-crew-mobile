import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  ".gitattributes",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/phase.yml",
  "docs/PHASE_0_BASELINE.md",
  "docs/PHASE_0_EMULATOR_CHECKLIST.md",
  "scripts/phase0-audit.mjs",
  "reports/phase0-baseline.json",
];
const forbidden = ["payload.zip", "app.config.ts.bak", "tash list"];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}`);
for (const file of forbidden) if (fs.existsSync(path.join(root, file))) errors.push(`Forbidden artifact exists: ${file}`);
if (!fs.existsSync(path.join(root, ".env.example"))) errors.push("Missing .env.example");
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
if (!gitignore.includes(".env.*")) errors.push(".gitignore does not protect environment files");
if (!gitignore.includes("*.zip")) errors.push(".gitignore does not protect generated archives");
if (errors.length) {
  console.error("Phase 0 verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Phase 0 safety baseline verified.");
console.log("Known app/database defects are intentionally recorded, not fixed, in this phase.");
