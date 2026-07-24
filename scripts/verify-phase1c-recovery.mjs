import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const paths = {
  publicBaseline: resolve(root, "supabase/recovery/20260723_remote_public_baseline.sql"),
  authStorage: resolve(root, "supabase/recovery/20260723_auth_storage_baseline.sql"),
  seed: resolve(root, "supabase/recovery/20260723_exercise_catalog_seed.sql"),
  types: resolve(root, "src/lib/supabase/database.types.ts"),
  workflow: resolve(root, ".github/workflows/phase1c-reproducible-db.yml"),
  pgTap: resolve(root, "supabase/tests/phase1c_recovery_test.sql"),
};

for (const [name, file] of Object.entries(paths)) {
  if (!existsSync(file)) throw new Error(`Missing ${name}: ${file}`);
}

const read = (file) => readFileSync(file, "utf8");
const sha = (text) => createHash("sha256").update(text).digest("hex");
const count = (text, regex) => [...text.matchAll(regex)].length;

const baseline = read(paths.publicBaseline);
const authStorage = read(paths.authStorage);
const seed = read(paths.seed);
const types = read(paths.types);

const actual = {
  baselineSha: sha(baseline),
  typesSha: sha(types),
  tables: count(baseline, /^CREATE TABLE IF NOT EXISTS "public"\."[^"]+"/gm),
  enums: count(baseline, /^CREATE TYPE "public"\."[^"]+" AS ENUM/gm),
  functions: count(baseline, /^CREATE OR REPLACE FUNCTION "public"\."[^"]+"\(/gm),
  publicPolicies: count(baseline, /^CREATE POLICY "[^"]+" ON "public"\."[^"]+"/gm),
  seedRows: count(seed, /^\s*\('[0-9a-f-]{36}'::uuid,/gm),
};

const expected = {
  baselineSha: "ceafd9ef65393a92af68a1a2d5b5ddab298f053fda7af53fa31ca10aeecd1672",
  typesSha: "1c08b12cddca1130a13767e2d3b1cfd8e527f466ccaa66dd70ad52b99a4708db",
  tables: 12,
  enums: 7,
  functions: 51,
  publicPolicies: 26,
  seedRows: 40,
};

const failures = [];
for (const [key, expectedValue] of Object.entries(expected)) {
  if (actual[key] !== expectedValue) {
    failures.push(`${key}: expected ${expectedValue}, received ${actual[key]}`);
  }
}

for (const required of [
  "on_auth_user_created",
  "avatars_public_read",
  "avatars_user_insert",
  "avatars_user_update",
  "avatars_user_delete",
]) {
  if (!authStorage.includes(required)) failures.push(`Auth/Storage recovery SQL is missing ${required}`);
}

for (const required of [
  "Back Squat",
  "Bench Press",
  "Hip Thrust",
  "Romanian Deadlift",
  "Wide-Grip Lat Pulldown Machine",
]) {
  if (!seed.includes(required)) failures.push(`Exercise seed is missing ${required}`);
}

for (const requiredRpc of [
  "apply_girls_strength_4_template_v3:",
  "apply_imported_split:",
  "get_group_member_weekly_stats:",
]) {
  if (!types.includes(requiredRpc)) failures.push(`Generated types are missing ${requiredRpc}`);
}

console.log("Gym Crew Phase 1C static recovery verification");
console.table(actual);

if (failures.length) {
  console.error("\nVerification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nStatic recovery artifacts verified.");
console.log("GitHub Actions will perform the cold database rebuild and pgTAP checks.");
