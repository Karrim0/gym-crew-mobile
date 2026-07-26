# Changelog

## 1.1.0 — OVRLD UI Rebuild

### Brand

- Renamed the user-facing product to OVRLD and introduced the Obsidian Ember identity.
- Added a new adaptive app icon, monochrome icon, splash mark, and OVRLD wordmark.
- Added Alexandria for interface copy and Inter for numeric performance data.
- Bundled three optimized workout photographs locally for offline-safe hero imagery.

### Product experience

- Rebuilt Home, Workout, Progress, Profile, authentication, the app header, and bottom navigation.
- Added Click-first Gym Mode with Repeat, Progress, and Back-off presets.
- Added an optional one-tap logging mode while preserving manual editing.
- Kept four primary tabs and moved plan and crew tools into their product-appropriate locations.

### Compatibility

- Preserved the existing package identifier, SQLite database, storage keys, and legacy callback scheme so installed users keep their local data and authentication continuity.

## 1.0.0 — Release Candidate

### Product

- Rebuilt the primary navigation around Home, Workout, Progress, and Profile.
- Introduced the graphite/lime design system across the main product surfaces.
- Kept Gym Mode focused on one exercise, weight, reps, and one dominant action.
- Added elapsed workout time and visible local-save/sync status in Gym Mode.

### Reliability

- Added versioned SQLite migrations and atomic workout persistence.
- Added idempotent sync keys, retry backoff, dead-letter recovery, and conflict rules.
- Added cached-context recovery and null-safe Supabase relation mapping.
- Preserved active workouts and queued sets across offline force-close/reopen.

### Release hardening

- Synchronized version `1.0.0` and build `8` across package, Expo, runtime, and Android native code.
- Removed legacy storage and overlay permissions from the main Android manifest.
- Added accessibility state to shared controls and safe-area-aware action sheets.
- Added release policy tests, Phase 6 CI, EAS upload exclusions, and a physical-device checklist.
