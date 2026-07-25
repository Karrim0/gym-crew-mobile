import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const tabs = read("src/app/(tabs)/_layout.tsx");
const tokens = read("src/lib/theme/tokens.ts");
const settings = read("src/stores/settings-store.ts");
const button = read("src/components/ui/button.tsx");
const home = read("src/app/(tabs)/home.tsx");
const workout = read("src/app/(tabs)/workout.tsx");
const progress = read("src/app/(tabs)/progress.tsx");
const profile = read("src/app/(tabs)/profile.tsx");
const gymMode = read("src/app/workout/[sessionId].tsx");

assert(tabs.includes('name="profile"'), "Profile must be a primary tab");
assert(tabs.includes('name="split" options={{ href: null'), "Split must move out of the primary tab bar");
assert(tabs.includes('name="crew" options={{ href: null'), "Crew must move out of the primary tab bar");
assert((tabs.match(/<Tabs\.Screen/g) ?? []).length === 6, "Expected four primary routes plus two hidden routes");
assert(tokens.includes('background: "#080B0C"'), "Dark graphite product background is missing");
assert(tokens.includes('primary: "#B9F34F"'), "Electric lime accent is missing");
assert(settings.includes('colorMode: "dark"'), "New installs must start with the dark product identity");
assert(button.includes("minHeight: compact ? 46 : 56"), "Buttons must keep senior-level touch targets");
assert(button.includes("Haptics.selectionAsync"), "Primary interactions must include restrained haptics");
assert(home.includes("Start gym mode") && home.includes("Training plan"), "Home product hierarchy is incomplete");
assert(workout.includes("ACTIVE WORKOUT") && workout.includes("Plan & schedule"), "Workout hub is incomplete");
assert(progress.includes("LAST 7 DAYS") && progress.includes("Top performance"), "Progress experience is incomplete");
assert(profile.includes("Data status") && profile.includes("Training plan"), "Profile hub is incomplete");
assert(gymMode.includes("WorkoutValueControl") && gymMode.includes("Set done"), "One-hand Gym Mode controls must remain intact");

const summary = {
  primaryTabs: 4,
  hiddenUtilityRoutes: 2,
  touchTarget: 56,
  productScreens: 4,
  gymMode: "one-exercise-at-a-time",
};

console.log("Gym Crew Phase 5 product experience verification");
console.table(summary);
console.log("\nPhase 5 product experience contract verified.");
