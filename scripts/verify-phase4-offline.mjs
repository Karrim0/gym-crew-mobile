import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const files = {
  database: resolve(root, "src/lib/offline/database.ts"),
  sync: resolve(root, "src/lib/offline/sync.ts"),
  policy: resolve(root, "src/lib/offline/sync-policy.ts"),
  events: resolve(root, "src/lib/offline/sync-events.ts"),
  workout: resolve(root, "src/features/workouts/workout-service.ts"),
  connectivity: resolve(root, "src/stores/connectivity-store.ts"),
  banner: resolve(root, "src/components/layout/connectivity-banner.tsx"),
  settings: resolve(root, "src/app/settings.tsx"),
  workflow: resolve(root, ".github/workflows/phase4-offline-reliability.yml"),
  policyTests: resolve(root, "scripts/phase4-sync-policy.test.mjs"),
};

for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) throw new Error(`Missing ${name}: ${path}`);
}

const read = (path) => readFileSync(path, "utf8");
const database = read(files.database);
const sync = read(files.sync);
const policy = read(files.policy);
const workout = read(files.workout);
const connectivity = read(files.connectivity);
const banner = read(files.banner);

const count = (value, pattern) => [...value.matchAll(pattern)].length;
const version = Number(
  database.match(/const LOCAL_DATABASE_VERSION = (\d+);/)?.[1] ?? 0,
);
const maxAttempts = Number(
  policy.match(/export const MAX_SYNC_ATTEMPTS = (\d+);/)?.[1] ?? 0,
);

const metrics = {
  localDatabaseVersion: version,
  maxSyncAttempts: maxAttempts,
  queueReliabilityColumns: [
    "idempotency_key",
    "scope_id",
    "status",
    "next_attempt_at",
    "dead_lettered_at",
    "updated_at",
  ].filter((column) => database.includes(column)).length,
  atomicWorkoutCommits: count(workout, /persistWorkout\(/g) - 1,
  retryPolicyTests: Number(
    [...read(files.policyTests).matchAll(/test\(/g)].length,
  ),
};

const failures = [];
if (metrics.localDatabaseVersion !== 4) {
  failures.push(`localDatabaseVersion: expected 4, received ${metrics.localDatabaseVersion}`);
}
if (metrics.maxSyncAttempts !== 6) {
  failures.push(`maxSyncAttempts: expected 6, received ${metrics.maxSyncAttempts}`);
}
if (metrics.queueReliabilityColumns !== 6) {
  failures.push(
    `queueReliabilityColumns: expected 6, received ${metrics.queueReliabilityColumns}`,
  );
}
if (metrics.atomicWorkoutCommits < 8) {
  failures.push(
    `atomicWorkoutCommits: expected at least 8, received ${metrics.atomicWorkoutCommits}`,
  );
}
if (metrics.retryPolicyTests !== 6) {
  failures.push(`retryPolicyTests: expected 6, received ${metrics.retryPolicyTests}`);
}

for (const required of [
  "withTransactionAsync",
  "ON CONFLICT(idempotency_key)",
  "PRAGMA user_version",
  "sync_queue_idempotency_idx",
]) {
  if (!database.includes(required)) failures.push(`Database layer is missing: ${required}`);
}

for (const required of [
  "recoverExpiredProcessingRows",
  "retryDeadLetterQueue",
  "shouldDeadLetter",
  "isLikelyTransportError",
  "hasPendingWorkoutSync",
]) {
  if (!sync.includes(required)) failures.push(`Sync layer is missing: ${required}`);
}

for (const required of [
  "commitWorkoutMutation",
  "compareIsoTimestamps",
  "scopeId: session.id",
]) {
  if (!workout.includes(required)) failures.push(`Workout service is missing: ${required}`);
}

for (const required of ["failed:", "nextRetryAt:", "retryFailed:"]) {
  if (!connectivity.includes(required)) failures.push(`Connectivity store is missing: ${required}`);
}
if (!banner.includes("changes need retry")) {
  failures.push("Connectivity banner does not surface dead-lettered changes");
}

for (const forbidden of [
  'await enqueueSync("workoutSet"',
  'await enqueueSync("workoutExercise"',
  'await enqueueSync("workoutSession"',
]) {
  if (workout.includes(forbidden)) {
    failures.push(`Workout writes are still non-atomic: ${forbidden}`);
  }
}

console.log("Gym Crew Phase 4 offline reliability verification");
console.table(metrics);

if (failures.length) {
  console.error("\nVerification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nPhase 4 offline reliability contract verified.");
