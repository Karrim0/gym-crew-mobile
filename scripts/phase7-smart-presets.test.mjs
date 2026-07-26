import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { buildSmartSetPresets } = require("../.phase7-test/smart-presets.js");

test("first-time exercises do not invent a load", () => {
  assert.deepEqual(buildSmartSetPresets({ baseline: null, targetRepsMin: 8, targetRepsMax: 12, weightStepKg: 2.5 }), []);
});

test("repeat keeps the last completed set", () => {
  const [repeat] = buildSmartSetPresets({ baseline: { weightKg: 80, reps: 10 }, targetRepsMin: 8, targetRepsMax: 12, weightStepKg: 2.5 });
  assert.deepEqual(repeat, { kind: "repeat", weightKg: 80, reps: 10 });
});

test("progress adds a rep while inside the target range", () => {
  const presets = buildSmartSetPresets({ baseline: { weightKg: 80, reps: 10 }, targetRepsMin: 8, targetRepsMax: 12, weightStepKg: 2.5 });
  assert.deepEqual(presets.find((preset) => preset.kind === "progress"), { kind: "progress", weightKg: 80, reps: 11 });
});

test("progress adds load after reaching the top of the range", () => {
  const presets = buildSmartSetPresets({ baseline: { weightKg: 80, reps: 12 }, targetRepsMin: 8, targetRepsMax: 12, weightStepKg: 2.5 });
  assert.deepEqual(presets.find((preset) => preset.kind === "progress"), { kind: "progress", weightKg: 82.5, reps: 8 });
});

test("backoff rounds to the available plate step", () => {
  const presets = buildSmartSetPresets({ baseline: { weightKg: 81, reps: 9 }, targetRepsMin: 8, targetRepsMax: 12, weightStepKg: 2.5 });
  assert.deepEqual(presets.find((preset) => preset.kind === "backoff"), { kind: "backoff", weightKg: 72.5, reps: 11 });
});

test("bodyweight presets preserve a null load", () => {
  const presets = buildSmartSetPresets({ baseline: { weightKg: null, reps: 8 }, targetRepsMin: 8, targetRepsMax: 15, weightStepKg: 2.5 });
  assert.equal(presets.every((preset) => preset.weightKg === null), true);
});
