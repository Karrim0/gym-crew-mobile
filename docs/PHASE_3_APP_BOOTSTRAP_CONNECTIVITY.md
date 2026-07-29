# Gym Crew — Phase 3 App Bootstrap & Connectivity

## Scope

Phase 3 stabilizes application startup and connection handling before the
offline reliability and redesign phases.

## Changes

- Aligns the Expo SDK 57 patch versions reported by `expo install --check`.
- Adds Android `ACCESS_NETWORK_STATE` and `ACCESS_WIFI_STATE` permissions to
  both Expo config and the tracked native manifest.
- Replaces the online boolean assumption with three states:
  `online`, `offline`, and `unknown`.
- Treats a missing, slow, or failed native network API as `unknown`, never as
  confirmed offline.
- Makes sync queue flushing return a controlled result instead of leaking
  top-level promise rejections.
- Adds an eight-second session bootstrap timeout and a visible retry state.
- Prevents auth token refresh events from resetting the whole workspace.
- Loads cached workspace data first and refreshes remote context in background.
- Keeps navigation mounted when workspace context is temporarily unavailable.
- Shows a compact recovery banner with retry instead of blocking every screen.
- Adds a six-second splash safety timeout so startup cannot remain hidden
  forever.
- Removes an accidental duplicated appearance selector in Settings.

## Validation

The Phase 3 workflow performs:

1. Deterministic `npm ci`.
2. Static bootstrap/connectivity contract checks.
3. TypeScript and ESLint.
4. Expo dependency alignment.
5. Expo public config generation.
6. Android JavaScript export.
7. Evidence artifact upload.

## Native note

No `expo prebuild --clean` is used. The project already tracks `android/`, so
the two network permissions are applied directly to the committed manifest and
also declared in `app.config.js`.
