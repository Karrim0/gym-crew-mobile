# Phase 7 — OVRLD Complete UI Rebuild

## Goal

Rebuild the mobile presentation layer as a premium performance-training product while preserving the proven Supabase, SQLite, offline queue, and workout service layers.

## Product identity

- Name: **OVRLD**
- Wordplay: a compressed form of **overload**, reflecting progressive overload.
- Visual direction: **Obsidian Ember**
- Core colors: Obsidian `#090A0D`, Ember `#FF5A36`, Warm White `#F5F1E8`.
- UI font: Alexandria.
- Metric font: Inter with tabular numbers.
- App icon: a plate-shaped O combined with a rising overload arrow.

## Experience changes

- Rebuilt Home, Workout, Progress, Profile, authentication shell, app header, and bottom navigation.
- Added locally bundled, compressed workout photography with dark overlays.
- Kept the four-tab information architecture: Home, Workout, Progress, Profile.
- Replaced generic gym iconography in hero areas with the OVRLD brand system.
- Added a click-first Gym Mode:
  - First encounter uses manual weight and reps.
  - Later sets show Repeat, Progress, and Back-off presets.
  - Optional one-tap logging records a preset immediately.
  - Manual editing always remains available.
- Smart presets use the latest relevant set, rep range, and the user's available weight step.
- Offline and idempotent workout logging remain unchanged underneath the new interaction.

## Compatibility decisions

The Android package, iOS bundle identifier, SQLite database filename, and existing AsyncStorage keys intentionally remain unchanged. Renaming these technical identifiers would split installs or make existing local workout data appear missing. The user-facing brand, icon, splash, scheme, and product copy are OVRLD.

The legacy `gymcrew` URL scheme remains alongside `ovrld` during the transition so existing authentication callbacks continue to work.

## Release identity

- App version: `1.1.0`
- Android version code: `9`
- iOS build number: `9`

## Verification

Run:

```bat
call INSTALL_PHASE7_DEPENDENCIES.cmd
call VERIFY_PHASE7_UI.cmd
```

The verifier checks identity, fonts, icon assets, local photography, four primary tabs, click-first Gym Mode markers, smart preset tests, TypeScript, ESLint, Expo dependency alignment, and public Expo config resolution.
