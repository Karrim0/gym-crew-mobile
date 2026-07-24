# Gym Crew — Phase 4 Offline Reliability

## Goal

A workout must survive a network outage, an app restart, and repeated sync
attempts without losing or duplicating sessions, exercises, or sets.

## Local database upgrade

The SQLite database now has an explicit version (`PRAGMA user_version = 4`).
Existing installs are migrated in place. The sync queue adds:

- stable idempotency keys per remote row;
- workout scope and user ownership metadata;
- pending, processing, failed, and dead-letter states;
- retry timestamps and processing leases;
- indexes for due work, workout scope, and ownership.

The migration backfills existing queue rows and coalesces duplicate mutations
before creating the unique idempotency index.

## Atomic workout writes

Every workout mutation writes the complete local workout snapshot and its sync
queue changes inside one SQLite transaction. A queue failure therefore rolls
back the cache write instead of showing a change that can never reach Supabase.

This covers:

- starting, completing, and cancelling a workout;
- logging and undoing a set;
- adding a set;
- adding or reordering session exercises;
- updating exercise notes.

## Retry and failure policy

- Mutations are processed session → exercise → set.
- Repeated edits to the same row coalesce by idempotency key.
- Retry delays are 5s, 15s, 1m, 5m, 15m, then 1h.
- A transport failure stops the batch so child rows do not waste attempts.
- A processing lease recovers rows after an interrupted app process.
- Six failed attempts move a row to the dead-letter state.
- The banner and Settings screen expose failed rows and allow a manual retry.

## Conflict rule

For sessions and sets, the newest valid `updated_at` wins. While a workout has
local pending mutations, the local snapshot remains authoritative. Once the
queue is clear, a newer remote snapshot can replace the local cache.

## Validation

The Phase 4 workflow verifies the source contract, runs policy tests for
idempotency/backoff/dead-letter behavior, runs TypeScript and ESLint, checks Expo
alignment, exports the Android JavaScript bundle, and uploads the evidence.

## Manual device gate

Before merging the phase, test on a physical Android phone:

1. Open a cached workout while online.
2. Turn on airplane mode.
3. Start or resume the workout and complete several sets.
4. Force-close and reopen the app; confirm the same workout and sets return.
5. Finish the workout offline.
6. Restore the network and tap Sync now.
7. Confirm one remote session, one copy of each exercise, and one copy of each
   set, with zero pending or failed queue entries.
