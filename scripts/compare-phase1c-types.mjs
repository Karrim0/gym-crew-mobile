import { readFileSync } from "node:fs";

const productionPath = "src/lib/supabase/database.types.ts";
const rebuiltPath = ".phase1c/database.types.local.ts";

const normalize = (value) => {
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  return normalized.replace(/\n+$/g, "") + "\n";
};

const production = normalize(readFileSync(productionPath, "utf8"));
const rebuilt = normalize(readFileSync(rebuiltPath, "utf8"));

if (production !== rebuilt) {
  const productionLines = production.split("\n");
  const rebuiltLines = rebuilt.split("\n");
  const maxLines = Math.max(productionLines.length, rebuiltLines.length);

  let mismatch = 0;
  while (
    mismatch < maxLines &&
    productionLines[mismatch] === rebuiltLines[mismatch]
  ) {
    mismatch += 1;
  }

  console.error(`Generated database types differ at line ${mismatch + 1}.`);
  console.error(
    `Production: ${JSON.stringify(productionLines[mismatch] ?? "<EOF>")}`,
  );
  console.error(`Rebuilt:    ${JSON.stringify(rebuiltLines[mismatch] ?? "<EOF>")}`);
  process.exit(1);
}

console.log("Generated database types match production types.");
