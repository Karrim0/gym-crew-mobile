# Gym Crew Mobile v0.2.0 — QA Report

## Automated/static checks completed

- `npm ci`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings/errors.
- `npx expo install --check`: dependencies reported up to date using Expo's local SDK map.
- `npx expo config --type public`: config resolved correctly as Gym Crew `0.2.0`.
- `npx expo prebuild --platform android --clean --no-install`: passed in a clean temporary copy.
- Android Metro production export with minification + Hermes bytecode: passed.
- `git diff --check`: passed.
- `expo-doctor`: 18/20 checks passed; the remaining two require internet access to Expo/React Native Directory and failed only because the validation environment had no network.

## Dependency audit

- No high or critical npm advisories were reported.
- 11 moderate advisories remain in transitive Expo tooling (`uuid`/`xcode` chain). A forced audit upgrade was intentionally not applied because it can break Expo SDK compatibility.

## Requires real environment validation

The following cannot be honestly certified inside the isolated build environment and must be tested using the included checklist:

- Applying the two SQL migrations to the real Supabase project.
- RLS behavior with two real group accounts.
- Avatar upload to the real Storage bucket.
- Android foreground/background notification behavior on the user's device.
- Airplane-mode persistence and reconnect sync against the real database.
- EAS Cloud Preview APK installation.

The patch is a release candidate until these device/backend checks pass.
