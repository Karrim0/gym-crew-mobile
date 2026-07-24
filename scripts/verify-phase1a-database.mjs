import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const files = {
  schema: resolve(root, "supabase/baseline/20260722_remote_public_schema.sql"),
  migrations: resolve(root, "supabase/baseline/20260722_remote_migration_list.txt"),
  lint: resolve(root, "supabase/baseline/20260722_remote_db_lint.txt"),
  types: resolve(root, "src/lib/supabase/database.types.ts"),
};

for (const [name, file] of Object.entries(files)) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${name} file: ${file}`);
  }
}

const schema = readFileSync(files.schema, "utf8");
const migrations = readFileSync(files.migrations, "utf8");
const lint = readFileSync(files.lint, "utf8");
const types = readFileSync(files.types, "utf8");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const count = (regex, value) => [...value.matchAll(regex)].length;

const expected = {
  schemaSha: "465a67bc587c5b1dc347693e207b1eb8ba644ea79b3d7c088c97919cb6838d76",
  typesSha: "1c08b12cddca1130a13767e2d3b1cfd8e527f466ccaa66dd70ad52b99a4708db",
  tables: 12,
  enums: 7,
  functions: 51,
  policies: 26,
  rlsTables: 12,
  triggers: 26,
  indexes: 8,
  remoteOnlyMigrations: 9,
  localOnlyMigrations: 5,
};

const actual = {
  schemaSha: sha256(schema),
  typesSha: sha256(types),
  tables: count(/^CREATE TABLE IF NOT EXISTS "public"\."[^"]+"/gm, schema),
  enums: count(/^CREATE TYPE "public"\."[^"]+" AS ENUM/gm, schema),
  functions: count(/^CREATE OR REPLACE FUNCTION "public"\."[^"]+"\(/gm, schema),
  policies: count(/^CREATE POLICY "[^"]+" ON "public"\."[^"]+"/gm, schema),
  rlsTables: count(/^ALTER TABLE "public"\."[^"]+" ENABLE ROW LEVEL SECURITY;/gm, schema),
  triggers: count(/^CREATE OR REPLACE TRIGGER "[^"]+"/gm, schema),
  indexes: count(/^CREATE (?:UNIQUE )?INDEX "[^"]+"/gm, schema),
  remoteOnlyMigrations: count(/^\s*` `\s*\|\s*`\d+`/gm, migrations),
  localOnlyMigrations: count(/^\s*`\d+`\s*\|\s*` `/gm, migrations),
};

const failures = [];
for (const key of Object.keys(expected)) {
  if (actual[key] !== expected[key]) {
    failures.push(`${key}: expected ${expected[key]}, received ${actual[key]}`);
  }
}

const requiredRpcs = [
  "add_template_exercise",
  "apply_girls_strength_4_template_v3",
  "apply_imported_split",
  "apply_split_template",
  "assert_base_schedule_has_no_three_rest_days",
  "assert_week_schedule_has_no_three_rest_days",
  "reorder_personal_split_days",
];

for (const rpc of requiredRpcs) {
  if (!types.includes(`${rpc}:`)) {
    failures.push(`Generated types are missing RPC: ${rpc}`);
  }
}

if (!lint.includes('"function": "public.apply_imported_split"')) {
  failures.push("Expected apply_imported_split lint finding was not preserved.");
}

console.log("Gym Crew Phase 1A database baseline");
console.table(actual);

if (failures.length) {
  console.error("\nBaseline verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nPhase 1A baseline verified.");
console.log("Known migration drift is recorded and intentionally unresolved until Phase 1B.");
