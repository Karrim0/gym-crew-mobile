import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputDirectory = resolve(".phase4-test");
rmSync(outputDirectory, { recursive: true, force: true });

const executable = resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);

const compile = spawnSync(
  executable,
  [
    "--ignoreConfig",
    "src/lib/offline/sync-policy.ts",
    "--outDir",
    outputDirectory,
    "--module",
    "node16",
    "--target",
    "ES2022",
    "--moduleResolution",
    "node16",
    "--strict",
    "--skipLibCheck",
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (compile.status !== 0) process.exit(compile.status ?? 1);

const tests = spawnSync(
  process.execPath,
  ["--test", "scripts/phase4-sync-policy.test.mjs"],
  { stdio: "inherit" },
);

process.exit(tests.status ?? 1);
