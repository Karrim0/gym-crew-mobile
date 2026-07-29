# Gym Crew Mobile — Phase 0 Safety Baseline

## Scope

This phase freezes and sanitizes the supplied `0.5.0` source. It intentionally does **not** repair application behavior, database behavior, offline sync, or UI/UX.

## Source inventory

- Expo/React Native application with committed Android native project.
- Package/app/native version: `0.5.0`, Android `versionCode 5`.
- 79 TypeScript/TSX files under `src`.
- 5 incremental Supabase migrations.
- Generated Supabase types describe 12 public tables and 34 functions/RPCs.
- No automated TypeScript test/spec files in the supplied source.

## Confirmed critical defects

1. `src/lib/offline/network.ts` converts every `expo-network` exception to confirmed offline status.
2. The committed Android manifest is missing `ACCESS_NETWORK_STATE` and `ACCESS_WIFI_STATE` while the app directly uses `expo-network`.
3. `src/app/_layout.tsx` can replace the whole navigation tree when workspace context is unavailable.
4. The migration folder cannot reproduce the database represented by `database.types.ts`; it contains incremental changes but no base table schema.

## Recorded high risks

- Local release Gradle configuration references the debug signing config.
- SQLite initialization uses ad-hoc column checks rather than an explicit schema version ledger.
- Sync queue has no documented retry/backoff/dead-letter contract.
- Girls template currently has legacy/v2/v3 RPC compatibility paths.
- Large route components mix orchestration and presentation; Gym Mode must be decomposed before redesign.
- The supplied archive contained `.env.local`, nested payload archive, backup config, and terminal-output artifacts. They are excluded from the sanitized source and patch.

## Phase 0 changes

- Added repeatable source audit and JSON report.
- Added Windows verification commands.
- Added emulator evidence checklist.
- Added GitHub issue and pull-request templates with QA gates.
- Added `.gitattributes` to stop LF/CRLF churn.
- Removed packaging/local artifacts from distributable source.
- Archived v0.5 release notes under `docs/archive/v0.5.0`.

## Dependency-check limitation

`npm ci` was attempted in the audit environment, but the package gateway returned HTTP 503 while downloading `zustand@5.0.14`. Therefore semantic TypeScript, ESLint, Expo dependency, Android build, and runtime checks must be run on the user's machine and attached to the Phase 0 PR.

## Exit gate

Phase 0 can merge only when:

- the audit and verification scripts run;
- `npm ci`, typecheck, lint, and Expo dependency check outputs are attached;
- the Android emulator checklist records the current behavior;
- a sanitized Supabase schema dump and migration ledger are captured for Phase 1;
- no application, database, or UI fix is mixed into this PR.
