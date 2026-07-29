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

if (packageJson.name !== "ovrld-mobile") throw new Error(`Expected ovrld-mobile, received ${packageJson.name}`);
if (packageJson.version !== "1.2.0") throw new Error(`Expected version 1.2.0, received ${packageJson.version}`);
if (appConfig.version !== "1.2.0") throw new Error(`Expected Expo version 1.2.0, received ${appConfig.version}`);
if (appConfig.android?.versionCode !== 10) throw new Error(`Expected Android versionCode 10, received ${appConfig.android?.versionCode}`);
if (appConfig.ios?.buildNumber !== "10") throw new Error(`Expected iOS build 10, received ${appConfig.ios?.buildNumber}`);

requireText("src/lib/theme/tokens.ts", 'surfaceGlass: "rgba(255,255,255,0.78)"', "light glass surface");
requireText("src/lib/theme/tokens.ts", 'surfaceGlass: "rgba(18,20,24,0.76)"', "dark glass surface");
requireText("src/components/ui/card.tsx", "BlurView", "glass card rendering");
requireText("src/app/(tabs)/_layout.tsx", "tabBarBackground", "glass tab bar");
requireText("src/app/(tabs)/progress.tsx", "Weekly rhythm", "separated progress hierarchy");
requireText("src/lib/utils/workout-duration.ts", "MAX_REASONABLE_SECONDS", "duration sanitization");
requireText("src/stores/settings-store.ts", "defaultWeightStepKg", "default load jump preference");
requireText("src/app/settings.tsx", "setDefaultWeightStepKg", "2.5/5 kg setting");
requireText("src/features/workouts/smart-presets.ts", "allowBodyweight", "bodyweight guard");
requireText("src/app/workout/[sessionId].tsx", "isLikelyBodyweightExercise", "exercise-aware presets");
requireText("src/app/workout/[sessionId].tsx", "ظبط الوزن والعدات", "Egyptian Gym Mode copy");
requireText("src/lib/product/encouragement.ts", "فحل الجروب", "crew praise copy");
requireText("src/lib/product/encouragement.ts", "دبابة", "achievement praise copy");
requireText("src/app/(tabs)/crew.tsx", "crewRankPraise", "crew ranking tone");
requireText("android/app/build.gradle", "versionCode 10", "native build number");
requireText("android/app/build.gradle", 'versionName "1.2.0"', "native version");

const gymMode = read("src/app/workout/[sessionId].tsx");
if (!gymMode.includes("<Screen\n      showConnectivity={false}")) throw new Error("The active Gym Mode screen must remain scroll-safe on compact devices.");
if (gymMode.includes('flex: 1, minHeight: 0, justifyContent: "space-between"')) throw new Error("Gym Mode still contains the Phase 7 empty-space layout.");

console.log("OVRLD Phase 8 product experience verification");
console.table({
  version: packageJson.version,
  buildNumber: appConfig.android.versionCode,
  lightTheme: "polished",
  darkTheme: "polished",
  glassSystem: "enabled",
  bodyweightGuard: "enabled",
  weightSteps: "2.5 / 5 kg",
  egyptianGymCopy: "enabled",
  durationSanitizer: "enabled",
});
console.log("\nPhase 8 product experience contract verified.");
