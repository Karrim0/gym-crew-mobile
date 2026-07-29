import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const migrationPath = resolve(
  root,
  "supabase/migrations/202607240001_fix_database_integrity_rpc_lint.sql",
);
const testPath = resolve(root, "supabase/tests/phase2_rpc_integrity_test.sql");
const workflowPath = resolve(
  root,
  ".github/workflows/phase2-database-integrity.yml",
);

for (const file of [migrationPath, testPath, workflowPath]) {
  if (!existsSync(file)) throw new Error(`Missing Phase 2 file: ${file}`);
}

const migration = readFileSync(migrationPath, "utf8");
const tests = readFileSync(testPath, "utf8");
const sha = (value) =>
  createHash("sha256").update(value).digest("hex");

const migrationFiles = readdirSync(resolve(root, "supabase/migrations"))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

const metrics = {
  migrationSha: sha(migration),
  activeMigrations: migrationFiles.length,
  repairedFunctions: [
    "apply_split_template",
    "apply_imported_split",
    "assert_base_schedule_has_no_three_rest_days",
    "assert_week_schedule_has_no_three_rest_days",
    "reorder_personal_split_days",
  ].filter((name) =>
    migration.includes(`CREATE OR REPLACE FUNCTION "public"."${name}"`),
  ).length,
  pgTapAssertions: Number(
    tests.match(/select plan\((\d+)\)/)?.[1] ?? 0,
  ),
};

const failures = [];

if (metrics.migrationSha !== "10a171034bf15ace0bcae74f686a25f98b623a9309931744ac5a40e34be2e378") {
  failures.push(
    `migrationSha: expected 10a171034bf15ace0bcae74f686a25f98b623a9309931744ac5a40e34be2e378, received ${metrics.migrationSha}`,
  );
}
if (metrics.activeMigrations !== 15) {
  failures.push(
    `activeMigrations: expected 15, received ${metrics.activeMigrations}`,
  );
}
if (migrationFiles.at(-1) !==
    "202607240001_fix_database_integrity_rpc_lint.sql") {
  failures.push(`Unexpected latest migration: ${migrationFiles.at(-1)}`);
}
if (metrics.repairedFunctions !== 5) {
  failures.push(
    `repairedFunctions: expected 5, received ${metrics.repairedFunctions}`,
  );
}
if (metrics.pgTapAssertions !== 12) {
  failures.push(
    `pgTapAssertions: expected 12, received ${metrics.pgTapAssertions}`,
  );
}

for (const required of [
  "array[]::public.weekday[]",
  "for scan_start in 0..6 loop",
  "scan_start := changed_date - 2 + scan_offset",
  "for position_index in 1..7 loop",
  "notify pgrst, 'reload schema'",
]) {
  if (!migration.includes(required)) {
    failures.push(`Migration is missing: ${required}`);
  }
}

for (const forbidden of [
  "imported_weekdays public.weekday[] := '{}'",
  "fri uuid",
  "window_start integer",
  "window_step integer",
  "index_value integer",
]) {
  if (migration.includes(forbidden)) {
    failures.push(`Migration still contains forbidden pattern: ${forbidden}`);
  }
}

console.log("Gym Crew Phase 2 RPC repair verification");
console.table(metrics);

if (failures.length) {
  console.error("\nVerification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nPhase 2 RPC repair artifacts are structurally valid.");
console.log("GitHub Actions will cold-rebuild, run pgTAP, and fail on DB warnings.");
