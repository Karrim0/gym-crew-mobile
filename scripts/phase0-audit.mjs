import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const walk = (dir) => {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(relative) : [relative.replaceAll("\\", "/")];
  });
};

const findings = [];
const add = (severity, code, message, evidence = []) => findings.push({ severity, code, message, evidence });
const packageJson = JSON.parse(read("package.json"));
const appConfig = read("app.config.js");
const gradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const network = read("src/lib/offline/network.ts");
const rootLayout = read("src/app/_layout.tsx");
const databaseTypes = read("src/lib/supabase/database.types.ts");
const migrations = walk("supabase/migrations").filter((file) => file.endsWith(".sql"));
const sourceFiles = walk("src").filter((file) => /\.(ts|tsx)$/.test(file));
const testFiles = walk("src").filter((file) => /\.(test|spec)\.(ts|tsx)$/.test(file));
const suspicious = [".env.local", "payload.zip", "app.config.ts.bak", "tash list"].filter(exists);

const configVersion = appConfig.match(/\bversion:\s*["']([^"']+)/)?.[1] ?? null;
const configVersionCode = Number(appConfig.match(/\bversionCode:\s*(\d+)/)?.[1] ?? NaN);
const gradleVersion = gradle.match(/versionName\s+["']([^"']+)/)?.[1] ?? null;
const gradleVersionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] ?? NaN);

if (new Set([packageJson.version, configVersion, gradleVersion]).size !== 1 || new Set([configVersionCode, gradleVersionCode]).size !== 1) {
  add("error", "VERSION_DRIFT", "Package, Expo config, and Android native versions are not aligned.", [
    `package=${packageJson.version}`,
    `expo=${configVersion}/${configVersionCode}`,
    `android=${gradleVersion}/${gradleVersionCode}`,
  ]);
} else {
  add("info", "VERSION_ALIGNED", `Version is aligned at ${packageJson.version} / versionCode ${configVersionCode}.`);
}

if (suspicious.length) add("error", "HANDOFF_ARTIFACTS", "Local/packaging artifacts are present.", suspicious);
else add("info", "HANDOFF_CLEAN", "No known local or packaging artifacts are present in the distributable source.");

for (const permission of ["android.permission.ACCESS_NETWORK_STATE", "android.permission.ACCESS_WIFI_STATE"]) {
  if (!manifest.includes(permission)) add("error", "ANDROID_NETWORK_PERMISSION", `${permission} is missing from the committed Android manifest.`, ["android/app/src/main/AndroidManifest.xml"]);
}

if (/catch\s*\{\s*return false;?\s*\}/s.test(network)) {
  add("error", "NETWORK_UNKNOWN_AS_OFFLINE", "A native network exception is converted into confirmed offline state.", ["src/lib/offline/network.ts"]);
}
if (/contextStatus\s*===\s*["']unavailable["']/.test(rootLayout)) {
  add("error", "FULL_APP_CONTEXT_BLOCKER", "The root layout can replace the complete app when context refresh is unavailable.", ["src/app/_layout.tsx"]);
}
if (/release\s*\{[\s\S]*signingConfig signingConfigs\.debug/.test(gradle)) {
  add("warning", "DEBUG_RELEASE_SIGNING", "The committed local release variant uses the debug signing config.", ["android/app/build.gradle"]);
}

const tablesStart = databaseTypes.indexOf("Tables: {");
const functionsStart = databaseTypes.indexOf("Functions: {");
const enumsStart = databaseTypes.indexOf("Enums: {");
const tableSection = databaseTypes.slice(tablesStart, functionsStart);
const functionSection = databaseTypes.slice(functionsStart, enumsStart);
const typedTables = [...tableSection.matchAll(/^      ([a-zA-Z0-9_]+):/gm)].map((match) => match[1]);
const typedFunctions = [...functionSection.matchAll(/^      ([a-zA-Z0-9_]+):/gm)].map((match) => match[1]);
const migrationText = migrations.map(read).join("\n");
const baseTableCreates = [...migrationText.matchAll(/create\s+table/gi)].length;
if (typedTables.length && baseTableCreates === 0) {
  add("error", "DATABASE_NOT_REPRODUCIBLE", "Generated database types contain tables, but repository migrations do not create a base table schema.", [
    `${typedTables.length} typed tables`,
    `${migrations.length} incremental migrations`,
    "0 CREATE TABLE statements",
  ]);
}

const largeFiles = sourceFiles
  .map((file) => ({ file, lines: read(file).split(/\r?\n/).length }))
  .filter(({ lines }) => lines >= 400)
  .sort((a, b) => b.lines - a.lines);
if (largeFiles.length) add("warning", "LARGE_ROUTE_COMPONENTS", "Large source files should be decomposed before UI migration.", largeFiles.map(({ file, lines }) => `${file}: ${lines} lines`));
if (testFiles.length === 0) add("warning", "NO_AUTOMATED_TESTS", "No TypeScript test/spec files were found.");

const result = {
  version: { package: packageJson.version, expo: configVersion, android: gradleVersion, versionCode: configVersionCode },
  inventory: {
    sourceFiles: sourceFiles.length,
    migrations: migrations.length,
    typedTables: typedTables.length,
    typedFunctions: typedFunctions.length,
    tests: testFiles.length,
  },
  findings,
  summary: findings.reduce((acc, item) => ({ ...acc, [item.severity]: (acc[item.severity] ?? 0) + 1 }), {}),
};

const jsonPath = path.join(root, "reports", "phase0-baseline.json");
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);

console.log("Gym Crew Phase 0 baseline");
console.log(`Source files: ${result.inventory.sourceFiles}`);
console.log(`Migrations: ${result.inventory.migrations}`);
console.log(`Typed tables/functions: ${result.inventory.typedTables}/${result.inventory.typedFunctions}`);
for (const item of findings) {
  console.log(`[${item.severity.toUpperCase()}] ${item.code}: ${item.message}`);
  for (const evidence of item.evidence) console.log(`  - ${evidence}`);
}
console.log(`Report: ${path.relative(root, jsonPath)}`);
