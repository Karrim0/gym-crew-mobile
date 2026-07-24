import { readFileSync } from "node:fs";

const productionPath = "src/lib/supabase/database.types.ts";
const rebuiltPath = ".phase2/database.types.local.ts";

const normalizeGeneratedTypes = (value) => {
  const withoutGeneratorMetadata = value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .replace(
      /^\s*__InternalSupabase:\s*\{\n\s*PostgrestVersion:\s*["'][^"']+["']\n\s*\}\n/m,
      "",
    );

  return (
    withoutGeneratorMetadata
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\n{2,}/g, "\n")
      .trim() + "\n"
  );
};

const production = normalizeGeneratedTypes(
  readFileSync(productionPath, "utf8"),
);
const rebuilt = normalizeGeneratedTypes(readFileSync(rebuiltPath, "utf8"));

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

  console.error(
    `Phase 2 changed the public database contract at normalized line ${mismatch + 1}.`,
  );
  console.error(
    `Production: ${JSON.stringify(productionLines[mismatch] ?? "<EOF>")}`,
  );
  console.error(
    `Rebuilt:    ${JSON.stringify(rebuiltLines[mismatch] ?? "<EOF>")}`,
  );
  process.exit(1);
}

console.log(
  "Phase 2 function-body repairs preserve the production public contract.",
);
