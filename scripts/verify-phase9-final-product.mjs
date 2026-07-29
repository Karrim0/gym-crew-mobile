import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const packageJson = JSON.parse(read("package.json"));
const appConfig = require(resolve(root, "app.config.js"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(path, needle, label) {
  const value = read(path);
  assert(value.includes(needle), `Missing ${label}: ${needle}`);
}

function rejectText(path, needle, label) {
  const value = read(path);
  assert(!value.includes(needle), `Unexpected ${label}: ${needle}`);
}

function requireOrder(path, needles, label) {
  const value = read(path);
  let cursor = -1;
  for (const needle of needles) {
    const next = value.indexOf(needle, cursor + 1);
    assert(next > cursor, `${label} is missing or out of order: ${needle}`);
    cursor = next;
  }
}

assert(packageJson.name === "ovrld-mobile", `Expected package name ovrld-mobile, received ${packageJson.name}`);
assert(packageJson.version === "1.4.0", `Expected package version 1.4.0, received ${packageJson.version}`);
assert(appConfig.name === "OVRLD", `Expected app name OVRLD, received ${appConfig.name}`);
assert(appConfig.version === "1.4.0", `Expected Expo version 1.4.0, received ${appConfig.version}`);
assert(appConfig.android?.versionCode === 12, `Expected Android versionCode 12, received ${appConfig.android?.versionCode}`);
assert(appConfig.ios?.buildNumber === "12", `Expected iOS build 12, received ${appConfig.ios?.buildNumber}`);
assert(appConfig.android?.package === "com.karrim.gymcrew", "Android package identifier changed unexpectedly.");
assert(appConfig.ios?.bundleIdentifier === "com.karrim.gymcrew", "iOS bundle identifier changed unexpectedly.");
assert(Array.isArray(appConfig.scheme) && appConfig.scheme.includes("ovrld") && appConfig.scheme.includes("gymcrew"), "OVRLD and legacy callback schemes must both be preserved.");

requireText("android/app/build.gradle", "versionCode 12", "native Android build number");
requireText("android/app/build.gradle", 'versionName "1.4.0"', "native Android version");
requireText("android/app/build.gradle", "applicationId 'com.karrim.gymcrew'", "native package identifier");
requireText("src/config/app.ts", 'version: "1.4.0"', "runtime version");
requireText("src/config/app.ts", "buildNumber: 12", "runtime build number");

requireText("src/lib/theme/tokens.ts", 'primary: "#C8FF3D"', "OVRLD Volt brand color");
requireText("src/lib/theme/tokens.ts", 'background: "#090B0D"', "dark product background");
requireText("src/lib/theme/tokens.ts", 'background: "#F4F5F1"', "light product background");
requireText("src/lib/theme/tokens.ts", "surfaceRaised", "raised surface token");
requireText("src/lib/theme/tokens.ts", "surfaceSunken", "sunken surface token");

requireOrder(
  "src/app/(tabs)/_layout.tsx",
  ['name="home"', 'name="split"', 'name="workout"', 'name="progress"', 'name="profile"'],
  "Primary tab architecture",
);
requireText("src/app/(tabs)/_layout.tsx", '"النهارده" : "Today"', "Today tab label");
requireText("src/app/(tabs)/_layout.tsx", '"الخطة" : "Plan"', "Plan tab label");
requireText("src/app/(tabs)/_layout.tsx", '"تمرّن" : "Train"', "Train tab label");
requireText("src/app/(tabs)/_layout.tsx", 'name="crew" options={{ href: null', "optional Crew destination");

requireText("src/app/(tabs)/home.tsx", "جلسة مفتوحة", "active-session Today state");
requireText("src/app/(tabs)/home.tsx", "يوم راحة", "recovery Today state");
requireText("src/app/(tabs)/home.tsx", "تمرين النهارده", "scheduled-workout Today state");
requireText("src/app/(tabs)/home.tsx", "ابدأ بخطة واضحة", "no-plan Today state");
rejectText("src/app/(tabs)/home.tsx", "<PhotoHero", "photo-heavy Today hero");

requireText("src/app/(tabs)/workout.tsx", "startQuick", "quick-workout flow");
requireText("src/app/(tabs)/workout.tsx", "repeatLatest", "repeat-previous-workout flow");
requireText("src/app/(tabs)/workout.tsx", 'start: "1"', "quick-workout exercise handoff");
requireText("src/app/exercise-picker.tsx", 'prepare: "1"', "quick-workout preflight handoff");

requireText("src/app/(tabs)/progress.tsx", "type Period = 7 | 30 | 90", "progress period ranges");
requireText("src/app/(tabs)/progress.tsx", "إيقاع آخر 7 أيام", "consistency rhythm");
requireText("src/app/(tabs)/progress.tsx", "أقوى أداء في الفترة", "strength progress section");
rejectText("src/app/(tabs)/progress.tsx", "<PhotoHero", "photo-heavy Progress hero");

requireText("src/app/workout/[sessionId].tsx", "راجع التمرينة", "inline pre-workout review");
requireText("src/app/workout/[sessionId].tsx", "selected.sets.map", "set-status rows");
requireText("src/app/workout/[sessionId].tsx", "اقتراحك للسِت دي", "single primary recommendation");
requireText("src/app/workout/[sessionId].tsx", "خيارات تانية", "compact recommendation alternatives");
requireText("src/app/workout/[sessionId].tsx", "سجّل السِت —", "dynamic fixed logging action");
requireText("src/app/workout/[sessionId].tsx", "autoStartRestTimerEnabled", "optional automatic rest timer");
requireText("src/app/workout/[sessionId].tsx", "افتح مؤقت الراحة", "non-blocking rest mini-player");
requireText("src/app/workout/[sessionId].tsx", "timer.addSeconds(30)", "+30 second rest action");
requireText("src/app/workout/[sessionId].tsx", "محفوظ على الجهاز", "local-save status");
requireText("src/app/workout/[sessionId].tsx", "[-5, -2.5, 2.5, 5]", "quick kg controls");
requireText("src/features/workouts/smart-presets.ts", "allowBodyweight", "bodyweight recommendation guard");

requireText("src/stores/settings-store.ts", "autoStartRestTimerEnabled", "persisted automatic rest preference");
requireText("src/app/settings.tsx", "setAutoStartRestTimerEnabled", "automatic rest setting control");
rejectText("src/app/settings.tsx", "Alert.alert", "native alert based sign-out flow");
rejectText("src/lib/product/encouragement.ts", "فحل", "forced gendered praise");
rejectText("src/lib/product/encouragement.ts", "دبابة", "forced aggressive praise");

assert(existsSync(resolve(root, "src/lib/offline/database.ts")), "Offline database entry point is missing.");
assert(existsSync(resolve(root, "src/lib/offline/sync.ts")), "Offline sync engine is missing.");
assert(existsSync(resolve(root, "supabase/migrations")), "Supabase migration chain is missing.");
requireText("src/stores/settings-store.ts", 'name: "gym-crew:settings"', "legacy settings storage key");
requireText("src/stores/rest-timer-store.ts", 'name: "gym-crew:rest-timer"', "legacy rest-timer storage key");

console.log("OVRLD Phase 9 final product verification");
console.table({
  version: packageJson.version,
  buildNumber: appConfig.android.versionCode,
  destinations: "Today / Plan / Train / Progress / Profile",
  productCore: "individual training",
  crew: "optional",
  gymMode: "preflight + set rows + primary recommendation + fixed action",
  restTimer: "optional auto-start + mini-player",
  offlineContracts: "preserved",
  themes: "light / dark",
  rtl: "preserved",
});
console.log("\nPhase 9 final product contract verified.");
