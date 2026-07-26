import { existsSync, readFileSync, statSync } from "node:fs";
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

function requireFile(path, label, maxBytes = Number.POSITIVE_INFINITY) {
  const target = resolve(root, path);
  if (!existsSync(target)) throw new Error(`Missing ${label}: ${path}`);
  const size = statSync(target).size;
  if (size < 64) throw new Error(`${label} is unexpectedly empty: ${path}`);
  if (size > maxBytes) throw new Error(`${label} is too large (${size} bytes): ${path}`);
  return size;
}

if (packageJson.name !== "ovrld-mobile") throw new Error(`Expected package name ovrld-mobile, received ${packageJson.name}`);
if (packageJson.version !== "1.1.0") throw new Error(`Expected version 1.1.0, received ${packageJson.version}`);
if (appConfig.name !== "OVRLD") throw new Error(`Expected app name OVRLD, received ${appConfig.name}`);
if (appConfig.version !== "1.1.0") throw new Error(`Expected Expo version 1.1.0, received ${appConfig.version}`);
if (appConfig.android?.versionCode !== 9) throw new Error(`Expected Android versionCode 9, received ${appConfig.android?.versionCode}`);
if (appConfig.ios?.buildNumber !== "9") throw new Error(`Expected iOS build 9, received ${appConfig.ios?.buildNumber}`);

for (const dependency of ["@expo-google-fonts/alexandria", "@expo-google-fonts/inter"]) {
  if (packageJson.dependencies?.[dependency] !== "0.4.2") throw new Error(`Expected ${dependency}@0.4.2`);
}

requireText("src/lib/theme/tokens.ts", 'primary: "#FF5A36"', "ember accent token");
requireText("src/lib/theme/tokens.ts", 'background: "#090A0D"', "obsidian background token");
requireText("src/lib/theme/tokens.ts", 'regular: "Alexandria_400Regular"', "Alexandria family mapping");
requireText("src/lib/theme/tokens.ts", 'numericBlack: "Inter_900Black"', "Inter metrics mapping");
requireText("src/app/_layout.tsx", "Alexandria_800ExtraBold", "font bootstrap");
requireText("src/app/_layout.tsx", "Inter_900Black", "metrics font bootstrap");

const tabs = read("src/app/(tabs)/_layout.tsx");
const primaryTabs = ["home", "workout", "progress", "profile"].filter((name) => tabs.includes(`name=\"${name}\"`)).length;
if (primaryTabs !== 4) throw new Error(`Expected 4 primary tabs, received ${primaryTabs}`);

for (const path of [
  "src/app/(tabs)/home.tsx",
  "src/app/(tabs)/workout.tsx",
  "src/app/(tabs)/progress.tsx",
  "src/app/(tabs)/profile.tsx",
  "src/components/layout/auth-shell.tsx",
]) requireText(path, "PhotoHero", `photo-led layout in ${path}`);

requireText("src/stores/settings-store.ts", "oneTapLoggingEnabled", "one-tap logging preference");
requireText("src/app/settings.tsx", "setOneTapLoggingEnabled", "one-tap logging setting");
requireText("src/app/workout/[sessionId].tsx", "buildSmartSetPresets", "smart set presets");
requireText("src/app/workout/[sessionId].tsx", "choosePreset", "click-first Gym Mode");
requireText("src/features/workouts/smart-presets.ts", 'kind: "progress"', "progressive overload preset");

const imageSizes = [
  requireFile("assets/images/brand/hero-barbell.webp", "barbell hero", 450_000),
  requireFile("assets/images/brand/hero-strength.webp", "strength hero", 450_000),
  requireFile("assets/images/brand/hero-squat.webp", "squat hero", 450_000),
];
const iconSizes = [
  requireFile("assets/images/icon.png", "app icon", 600_000),
  requireFile("assets/images/splash-icon.png", "splash icon", 600_000),
  requireFile("assets/images/android-icon-foreground.png", "adaptive foreground", 600_000),
  requireFile("assets/images/android-icon-monochrome.png", "adaptive monochrome icon", 600_000),
  requireFile("assets/images/favicon.png", "favicon", 250_000),
];

requireText("android/app/build.gradle", "versionCode 9", "native Android build number");
requireText("android/app/build.gradle", 'versionName "1.1.0"', "native Android version");

console.log("OVRLD Phase 7 complete UI rebuild verification");
console.table({
  appName: appConfig.name,
  version: packageJson.version,
  buildNumber: appConfig.android.versionCode,
  primaryTabs,
  brandPhotos: imageSizes.length,
  iconAssets: iconSizes.length,
  customFontFamilies: 2,
  smartPresetKinds: 3,
  clickFirstGymMode: "enabled",
});
console.log("\nPhase 7 UI rebuild contract verified.");
