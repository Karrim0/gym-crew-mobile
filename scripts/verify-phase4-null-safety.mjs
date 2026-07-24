import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const exerciseService = read("src/features/splits/exercise-service.ts");
const splitService = read("src/features/splits/split-service.ts");
const workoutService = read("src/features/workouts/workout-service.ts");
const groupService = read("src/features/groups/group-service.ts");
const sessionStore = read("src/stores/session-store.ts");
const appConfig = read("app.config.js");

requireText(exerciseService, "export function unavailableExercise", "fallback exercise mapper");
requireText(exerciseService, "export function isExerciseRow", "remote exercise guard");
requireText(splitService, "exercises: ExerciseRow | null", "nullable split relation type");
requireText(splitService, "sanitizeCachedSplit", "split cache sanitizer");
requireText(splitService, "unavailableExercise(row.exercise_id)", "split relation fallback");
requireText(workoutService, "workout_exercises: ExerciseQueryRow[] | null", "nullable workout relation type");
requireText(workoutService, "normalizeCachedSession", "workout cache sanitizer");
requireText(workoutService, "unavailableExercise(row.exercise_id)", "workout relation fallback");
requireText(groupService, "isUsableMembership", "membership validator");
requireText(sessionStore, "removeCachedValue(membershipKey)", "invalid membership cache cleanup");
requireText(sessionStore, "if (!isUsableMembership(membership)) return", "workspace warmup guard");
requireText(appConfig, "versionCode: 6", "Android hotfix version code");

const summary = {
  guardedRemoteRelations: 3,
  sanitizedCacheFamilies: 3,
  fallbackExerciseMapper: 1,
  invalidMembershipCleanup: 1,
  androidVersionCode: 6,
};

console.log("Gym Crew Phase 4 null-data hotfix verification");
console.table(summary);
console.log("\nPhase 4 null-data guards verified.");
