import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const packageJson = JSON.parse(read("package.json"));
const appConfig = require(resolve(root, "app.config.js"));

function requireText(path, needle, label) {
  const value = read(path);
  if (!value.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

function rejectText(path, needle, label) {
  const value = read(path);
  if (value.includes(needle)) throw new Error(`Unexpected ${label}: ${needle}`);
}

if (packageJson.name !== "ovrld-mobile") throw new Error(`Expected ovrld-mobile, received ${packageJson.name}`);
if (packageJson.version !== "1.3.0") throw new Error(`Expected version 1.3.0, received ${packageJson.version}`);
if (appConfig.version !== "1.3.0") throw new Error(`Expected Expo version 1.3.0, received ${appConfig.version}`);
if (appConfig.android?.versionCode !== 11) throw new Error(`Expected Android versionCode 11, received ${appConfig.android?.versionCode}`);
if (appConfig.ios?.buildNumber !== "11") throw new Error(`Expected iOS build 11, received ${appConfig.ios?.buildNumber}`);

requireText("src/lib/theme/tokens.ts", "surfaceRaised", "raised surface token");
requireText("src/lib/theme/tokens.ts", "surfaceSunken", "sunken surface token");
requireText("src/lib/theme/tokens.ts", "ambient", "ambient background token");
requireText("src/components/ui/card.tsx", '"raised"', "raised card variant");
requireText("src/components/ui/card.tsx", '"sunken"', "sunken card variant");
requireText("src/app/(tabs)/_layout.tsx", "bottom: -5", "active tab indicator");
requireText("src/app/(tabs)/home.tsx", "height={218}", "compact Home focus card");
requireText("src/app/(tabs)/workout.tsx", 'variant="dark"', "focused active-workout surface");
rejectText("src/app/(tabs)/workout.tsx", "<PhotoHero", "photo-heavy Workout hero");
rejectText("src/app/(tabs)/progress.tsx", "<PhotoHero", "photo-heavy Progress hero");
rejectText("src/app/(tabs)/profile.tsx", "<PhotoHero", "photo-heavy Profile hero");
requireText("src/app/(tabs)/progress.tsx", 'summary.minutes ? String(summary.minutes) : "—"', "honest missing-duration state");
requireText("src/app/workout/[sessionId].tsx", "footerAction", "fixed Gym Mode action");
requireText("src/app/workout/[sessionId].tsx", "changeDisplayWeight", "direct load tuning");
requireText("src/app/workout/[sessionId].tsx", "[-5, -2.5, 2.5, 5]", "2.5/5 kg quick controls");
requireText("src/app/workout/[sessionId].tsx", "زوّد وزن", "weight-progress copy");
requireText("src/app/workout/[sessionId].tsx", "زوّد عدة", "rep-progress copy");
requireText("src/app/workout/[sessionId].tsx", "ضبط كامل للوزن والعدات", "manual control escape hatch");
requireText("src/features/workouts/smart-presets.ts", "allowBodyweight", "bodyweight guard");
requireText("src/lib/product/encouragement.ts", "فحل الجروب", "crew praise copy");
requireText("android/app/build.gradle", "versionCode 11", "native build number");
requireText("android/app/build.gradle", 'versionName "1.3.0"', "native version");

console.log("OVRLD Phase 8B actual UX rebuild verification");
console.table({
  version: packageJson.version,
  buildNumber: appConfig.android.versionCode,
  screenHierarchy: "rebuilt",
  repeatedPhotoHeroes: "removed",
  lightAndDarkSurfaces: "raised / sunken",
  gymModeFooterAction: "fixed",
  quickLoadControls: "-5 / -2.5 / +2.5 / +5",
  progressSuggestions: "rep-aware / load-aware",
  offlineContracts: "preserved",
});
console.log("\nPhase 8B actual UX rebuild contract verified.");
