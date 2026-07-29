import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const policy = require("../.phase4-test/sync-policy.js");

test("idempotency key is stable for the same entity row", () => {
  assert.equal(
    policy.syncIdempotencyKey("workoutSet", "set-1"),
    "workoutSet:set-1",
  );
});

test("scope inference groups session and exercise mutations", () => {
  assert.equal(
    policy.syncScopeId("workoutSession", { id: "session-1" }),
    "session-1",
  );
  assert.equal(
    policy.syncScopeId("workoutExercise", {
      id: "exercise-1",
      workoutSessionId: "session-1",
    }),
    "session-1",
  );
  assert.equal(
    policy.syncScopeId("workoutSet", { id: "set-1" }, "session-1"),
    "session-1",
  );
});

test("retry schedule backs off and is capped", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 20].map(policy.retryDelayMs),
    [5_000, 15_000, 60_000, 300_000, 900_000, 3_600_000, 3_600_000],
  );
});

test("dead-letter boundary matches the retry budget", () => {
  assert.equal(policy.shouldDeadLetter(policy.MAX_SYNC_ATTEMPTS - 1), false);
  assert.equal(policy.shouldDeadLetter(policy.MAX_SYNC_ATTEMPTS), true);
});

test("ISO timestamp comparison is deterministic", () => {
  assert.equal(
    policy.compareIsoTimestamps(
      "2026-07-24T15:00:01.000Z",
      "2026-07-24T15:00:00.000Z",
    ),
    1,
  );
  assert.equal(policy.compareIsoTimestamps(null, null), 0);
});

test("transport failures are detected without classifying validation errors", () => {
  assert.equal(policy.isLikelyTransportError(new Error("Network request failed")), true);
  assert.equal(policy.isLikelyTransportError(new Error("violates row-level security")), false);
});
