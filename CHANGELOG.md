# Changelog

## [1.3.0] - 2026-07-27

### Rebuilt
- Reconstructed the primary screen hierarchy instead of layering more cards onto the Phase 8 layout.
- Replaced repeated photo-heavy surfaces on Workout, Progress, and Profile with focused native product layouts.
- Added a calmer raised/sunken surface system and a more compact floating navigation bar for both light and dark themes.
- Rebuilt Gym Mode around the current set, thumb-reachable actions, a fixed logging button, and direct load/repetition tuning.

### Improved
- Added explicit `-5`, `-2.5`, `+2.5`, and `+5` kg quick load controls in Gym Mode.
- Split progressive suggestions into clear “add a rep” and “add weight” states based on the actual recommendation.
- Made Back-off values editable without leaving the suggestion flow.
- Reduced visual noise, repeated imagery, oversized hero sections, and low-value copy across Home, Workout, Progress, and Profile.
- Preserved offline storage, sync behavior, database schema, package identifier, and workout service contracts.

## [1.2.0] - 2026-07-26

### Changed
- Rebuilt the shared light/dark visual hierarchy around calmer warm neutrals and restrained Ember accents.
- Added glass navigation, cards, and action sheets with Android-safe fallback surfaces.
- Restructured Home, Workout, Progress, Profile, and Crew for clearer information hierarchy.
- Made Gym Mode scroll-safe and removed the stretched empty interaction area.
- Added direct 2.5 kg / 5 kg load-jump controls and a persistent default jump setting.
- Added Egyptian gym praise and crew ranking copy.

### Fixed
- Prevented non-bodyweight exercises such as Bench Press from receiving false `BW` smart presets.
- Sanitized implausible legacy workout durations before displaying history and weekly totals.
- Removed duplicate language controls from Settings.

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
