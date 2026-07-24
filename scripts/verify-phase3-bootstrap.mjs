import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const failures = [];

const expectedSpecs = {
  "expo": "~57.0.8",
  "expo-asset": "~57.0.7",
  "expo-audio": "~57.0.3",
  "expo-constants": "~57.0.7",
  "expo-dev-client": "~57.0.9",
  "expo-linking": "~57.0.4",
  "expo-notifications": "~57.0.7",
  "expo-router": "~57.0.8",
  "expo-splash-screen": "~57.0.5",
  "expo-web-browser": "~57.0.2",
  "react-native-screens": "~4.26.0"
};
const minimumVersions = {
  "expo": "57.0.8",
  "expo-asset": "57.0.7",
  "expo-audio": "57.0.3",
  "expo-constants": "57.0.7",
  "expo-dev-client": "57.0.9",
  "expo-linking": "57.0.4",
  "expo-notifications": "57.0.7",
  "expo-router": "57.0.8",
  "expo-splash-screen": "57.0.5",
  "expo-web-browser": "57.0.2",
  "react-native-screens": "4.26.0"
};

function read(relativePath) {
  const file = resolve(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function parseVersion(value) {
  return value.split(".").map((part) => Number(part.replace(/\D.*$/, "")) || 0);
}

function versionAtLeast(actual, minimum) {
  const left = parseVersion(actual);
  const right = parseVersion(minimum);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));

for (const [name, expectedSpec] of Object.entries(expectedSpecs)) {
  const actualSpec = packageJson.dependencies?.[name];
  if (actualSpec !== expectedSpec) {
    failures.push(`${name} spec: expected ${expectedSpec}, received ${actualSpec}`);
  }

  const lockRootSpec = packageLock.packages?.[""]?.dependencies?.[name];
  if (lockRootSpec !== expectedSpec) {
    failures.push(
      `${name} lock spec: expected ${expectedSpec}, received ${lockRootSpec}`,
    );
  }

  const installed = packageLock.packages?.[`node_modules/${name}`]?.version;
  if (!installed || !versionAtLeast(installed, minimumVersions[name])) {
    failures.push(
      `${name} lock version must be >= ${minimumVersions[name]}, received ${installed}`,
    );
  }
}

const appConfig = read("app.config.js");
const manifest = read("android/app/src/main/AndroidManifest.xml");
for (const permission of [
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.ACCESS_WIFI_STATE",
]) {
  if (!appConfig.includes(permission)) {
    failures.push(`app.config.js is missing ${permission}`);
  }
  if (!manifest.includes(permission)) {
    failures.push(`AndroidManifest.xml is missing ${permission}`);
  }
}

const network = read("src/lib/offline/network.ts");
for (const required of [
  'export type NetworkAvailability = "online" | "offline" | "unknown"',
  'return UNKNOWN_NETWORK',
  '!== "offline"',
]) {
  if (!network.includes(required)) {
    failures.push(`network.ts is missing: ${required}`);
  }
}
if (/catch\s*\{\s*return false;\s*\}/s.test(network)) {
  failures.push("network.ts still converts native API failures into offline=false");
}

const connectivity = read("src/stores/connectivity-store.ts");
for (const required of [
  'networkStatus: "unknown"',
  'network.status === "online"',
  'networkStatus: NetworkAvailability',
]) {
  if (!connectivity.includes(required)) {
    failures.push(`connectivity-store.ts is missing: ${required}`);
  }
}

const session = read("src/stores/session-store.ts");
for (const required of [
  'type BootstrapStatus = "idle" | "loading" | "ready" | "error"',
  "retryBootstrap: async ()",
  "Session bootstrap timed out.",
  'availability === "offline"',
]) {
  if (!session.includes(required)) {
    failures.push(`session-store.ts is missing: ${required}`);
  }
}

const rootLayout = read("src/app/_layout.tsx");
for (const required of [
  "<BootstrapRecovery />",
  "<WorkspaceRecoveryBanner />",
  "Promise.race([bootstrapTasks, delay(6000)])",
]) {
  if (!rootLayout.includes(required)) {
    failures.push(`root layout is missing: ${required}`);
  }
}
if (
  /if\s*\(session\s*&&\s*contextStatus\s*===\s*["']unavailable["']\)\s*\{\s*return\s*\(/s.test(
    rootLayout,
  )
) {
  failures.push("root layout still blocks the entire navigation for unavailable context");
}

const sync = read("src/lib/offline/sync.ts");
if (sync.includes('import * as Network from "expo-network"')) {
  failures.push("sync.ts still queries expo-network directly");
}
for (const required of [
  "getNetworkAvailability",
  "safePendingCount",
  "return { processed, pending, skipped: false, lastError }",
]) {
  if (!sync.includes(required)) {
    failures.push(`sync.ts is missing: ${required}`);
  }
}

const sourceFiles = [
  "src/lib/offline/network.ts",
  "src/lib/offline/sync.ts",
  "src/stores/connectivity-store.ts",
  "src/stores/session-store.ts",
  "src/app/_layout.tsx",
  "src/app/settings.tsx",
  "src/components/layout/connectivity-banner.tsx",
];

for (const relativePath of sourceFiles) {
  const source = read(relativePath);
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: relativePath,
    reportDiagnostics: true,
  });

  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    failures.push(
      `${relativePath}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
    );
  }
}

const metrics = {
  alignedPackages: Object.keys(expectedSpecs).length,
  networkStates: 3,
  androidPermissions: 2,
  syntaxCheckedFiles: sourceFiles.length,
  bootstrapTimeoutSeconds: 8,
  splashSafetyTimeoutSeconds: 6,
};

console.log("Gym Crew Phase 3 bootstrap and connectivity verification");
console.table(metrics);

if (failures.length) {
  console.error("\nVerification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("\nPhase 3 bootstrap and connectivity contract verified.");
