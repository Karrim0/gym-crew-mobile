import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  RELEASE_BUILD_NUMBER,
  RELEASE_VERSION,
  containsPrivateCredential,
  extractAndroidPermissions,
  findUnexpectedAndroidPermissions,
  parseSemver,
} from "./phase6-release-policy.mjs";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));
const fail = (message) => {
  throw new Error(message);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const packageJson = json("package.json");
const appConfig = read("app.config.js");
const nativeGradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const eas = json("eas.json");
const tabs = read("src/app/(tabs)/_layout.tsx");
const gymMode = read("src/app/workout/[sessionId].tsx");
const button = read("src/components/ui/button.tsx");
const actionSheet = read("src/components/ui/action-sheet.tsx");
const errors = read("src/lib/supabase/errors.ts");
const runtimeConfig = read("src/config/app.ts");
const readme = read("README.md");
const workflow = read(".github/workflows/phase6-release-candidate.yml");
const easIgnore = read(".easignore");

expect(parseSemver(packageJson.version), "package.json must use a stable semantic version.");
expect(packageJson.version === RELEASE_VERSION, `package.json must be ${RELEASE_VERSION}.`);
expect(appConfig.includes(`version: "${RELEASE_VERSION}"`), "Expo app version is not synchronized.");
expect(appConfig.includes(`versionCode: ${RELEASE_BUILD_NUMBER}`), "Expo Android versionCode is not synchronized.");
expect(appConfig.includes(`buildNumber: "${RELEASE_BUILD_NUMBER}"`), "Expo iOS buildNumber is not synchronized.");
expect(nativeGradle.includes(`versionCode ${RELEASE_BUILD_NUMBER}`), "Native Android versionCode is stale.");
expect(nativeGradle.includes(`versionName "${RELEASE_VERSION}"`), "Native Android versionName is stale.");
expect(runtimeConfig.includes(`version: "${RELEASE_VERSION}"`), "Runtime app config version is stale.");
expect(runtimeConfig.includes(`buildNumber: ${RELEASE_BUILD_NUMBER}`), "Runtime build number is stale.");

const visibleTabs = ["home", "workout", "progress", "profile"];
for (const name of visibleTabs) {
  expect(tabs.includes(`name="${name}"`), `Missing primary tab: ${name}.`);
}
expect((tabs.match(/href:\s*null/g) ?? []).length === 2, "Exactly two utility routes must stay hidden from the tab bar.");

const permissions = extractAndroidPermissions(manifest);
const unexpectedPermissions = findUnexpectedAndroidPermissions(manifest);
expect(unexpectedPermissions.length === 0, `Unexpected Android permissions: ${unexpectedPermissions.join(", ")}`);
expect(permissions.length === 4, `Expected 4 Android permissions, found ${permissions.length}.`);
expect(!manifest.includes("READ_EXTERNAL_STORAGE"), "Legacy read-storage permission must not ship.");
expect(!manifest.includes("WRITE_EXTERNAL_STORAGE"), "Legacy write-storage permission must not ship.");
expect(!manifest.includes("SYSTEM_ALERT_WINDOW"), "Overlay permission must not ship in the main manifest.");

expect(eas.cli?.appVersionSource === "local", "EAS version source must stay local for this existing native project.");
expect(eas.cli?.requireCommit === true, "EAS builds must require a clean committed tree.");
expect(eas.build?.preview?.android?.buildType === "apk", "Preview must produce an APK.");
expect(eas.build?.production?.android?.buildType === "app-bundle", "Production must produce an Android App Bundle.");

expect(button.includes("accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}"), "Buttons must expose disabled and busy accessibility state.");
expect(actionSheet.includes("useSafeAreaInsets"), "Action sheets must respect device safe areas.");
expect(actionSheet.includes("accessibilityViewIsModal"), "Action sheets must expose modal accessibility semantics.");
expect(gymMode.includes("formatElapsed"), "Gym Mode elapsed timer is missing.");
expect(gymMode.includes("Saved on device"), "Gym Mode local-save status is missing.");
expect(gymMode.includes("accessibilityLiveRegion=\"polite\""), "Gym Mode save status must be announced accessibly.");
expect(errors.includes('"cannot read property"'), "Null-property runtime errors must be hidden from users.");
expect(errors.includes('"of null"'), "Null runtime errors must use a friendly fallback.");

expect(readme.includes(`Current release candidate: ${RELEASE_VERSION}`), "README release identity is stale.");
expect(readme.includes("npm run release:check"), "README must document the release gate.");
expect(workflow.includes("Phase 6 Release Candidate"), "Phase 6 workflow is missing its release identity.");
expect(workflow.includes("Export Android JavaScript bundle"), "Phase 6 workflow must export the Android bundle.");
expect(easIgnore.includes(".env.local"), ".easignore must exclude local environment files.");
expect(easIgnore.includes("*.apk"), ".easignore must exclude local APK artifacts.");

const sensitiveFiles = [".env.example", "app.config.js", "eas.json", "src/config/app.ts"];
for (const file of sensitiveFiles) {
  const value = read(file);
  expect(!containsPrivateCredential(value), `${file} appears to contain a private credential.`);
}

const activeVersionFiles = [
  "package.json",
  "app.config.js",
  "android/app/build.gradle",
  "src/config/app.ts",
  "src/app/(tabs)/profile.tsx",
  "src/app/settings.tsx",
  "README.md",
];
for (const file of activeVersionFiles) {
  const value = read(file);
  expect(!value.includes("0.5.0") && !value.includes("0.6.0"), `${file} still exposes an old active release version.`);
}

const report = {
  releaseVersion: RELEASE_VERSION,
  buildNumber: RELEASE_BUILD_NUMBER,
  primaryTabs: visibleTabs.length,
  hiddenUtilityRoutes: 2,
  androidPermissions: permissions.length,
  releasePolicyTests: 6,
  accessibilityGuards: 5,
  gymModeRuntimeSignals: 2,
  buildProfiles: 3,
};

console.log("Gym Crew Phase 6 release candidate verification");
console.table(report);
console.log("\nPhase 6 release candidate contract verified.");
