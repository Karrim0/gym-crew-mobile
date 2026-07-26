import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputDirectory = resolve(".phase7-test");
rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const localExecutable = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);
const executable = existsSync(localExecutable)
  ? localExecutable
  : process.platform === "win32" ? "tsc.cmd" : "tsc";

const temporaryConfig = resolve(outputDirectory, "tsconfig.json");
writeFileSync(
  temporaryConfig,
  JSON.stringify(
    {
      compilerOptions: {
        module: "Node16",
        moduleResolution: "Node16",
        target: "ES2022",
        rootDir: resolve("src/features/workouts"),
        outDir: outputDirectory,
        strict: true,
        skipLibCheck: true,
      },
      files: [resolve("src/features/workouts/smart-presets.ts")],
    },
    null,
    2,
  ),
);

const compile = spawnSync(executable, ["--project", temporaryConfig], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (compile.status !== 0) process.exit(compile.status ?? 1);

const tests = spawnSync(
  process.execPath,
  ["--test", "scripts/phase7-smart-presets.test.mjs"],
  { stdio: "inherit" },
);

process.exit(tests.status ?? 1);
