import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

const root = process.cwd();
const migrationDir = resolve(root, "supabase/migrations");
const seedPath = resolve(root, "supabase/seed.sql");
const expectedVersions = [
  "202607140001",
  "202607140002",
  "202607140003",
  "202607140004",
  "202607140005",
  "202607140006",
  "202607150007",
  "202607150008",
  "202607160009",
  "202607180001",
  "202607180002",
  "202607190001",
  "202607190002",
  "202607190003"
];

if (!existsSync(migrationDir)) throw new Error("Missing supabase/migrations");
if (!existsSync(seedPath)) throw new Error("Missing supabase/seed.sql");

const migrationFiles = readdirSync(migrationDir)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

const versions = migrationFiles.map((name) => name.split("_", 1)[0]);
const failures = [];

if (migrationFiles.length !== 14) {
  failures.push(`Expected 14 active migrations, received ${migrationFiles.length}`);
}

if (new Set(versions).size !== versions.length) {
  failures.push("Migration timestamps are not unique");
}

if (JSON.stringify(versions) !== JSON.stringify(expectedVersions)) {
  failures.push(
    `Migration versions differ.\nExpected: ${expectedVersions.join(", ")}\nActual:   ${versions.join(", ")}`,
  );
}

const initial = readFileSync(
  resolve(migrationDir, "202607140001_initial_schema.sql"),
  "utf8",
);
const seed = readFileSync(seedPath, "utf8");

const count = (text, regex) => [...text.matchAll(regex)].length;
const metrics = {
  migrations: migrationFiles.length,
  tables: count(initial, /^CREATE TABLE IF NOT EXISTS "public"\."[^"]+"/gm),
  enums: count(initial, /^CREATE TYPE "public"\."[^"]+" AS ENUM/gm),
  functions: count(initial, /^CREATE OR REPLACE FUNCTION "public"\."[^"]+"\(/gm),
  publicPolicies: count(initial, /^CREATE POLICY "[^"]+" ON "public"\."[^"]+"/gm),
  seedRows: count(seed, /^\s*\('[0-9a-f-]{36}'::uuid,/gm),
};

for (const [key, expected] of Object.entries({
  tables: 12,
  enums: 7,
  functions: 51,
  publicPolicies: 26,
  seedRows: 40,
})) {
  if (metrics[key] !== expected) {
    failures.push(`${key}: expected ${expected}, received ${metrics[key]}`);
  }
}

for (const required of [
  "drop trigger if exists on_auth_user_created on auth.users",
  "execute function public.handle_new_auth_user()",
]) {
  if (!initial.includes(required)) failures.push(`Initial migration is missing: ${required}`);
}

const markerVersions = [
  "202607140002",
  "202607140003",
  "202607140004",
  "202607140005",
  "202607140006",
  "202607150007",
  "202607150008",
  "202607160009"
];
for (const version of markerVersions) {
  const file = migrationFiles.find((name) => name.startsWith(`${version}_`));
  const content = readFileSync(resolve(migrationDir, file), "utf8");
  if (!content.includes("intentionally contains no executable SQL")) {
    failures.push(`Remote history marker is malformed: ${file}`);
  }
}

console.log("Gym Crew Phase 1D active migration-chain verification");
console.table(metrics);
console.log(migrationFiles.join("\n"));

if (failures.length) {
  console.error("\nVerification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nActive migration chain is structurally complete.");
console.log("GitHub Actions will rebuild it from zero before any remote history repair.");
