# OVRLD Phase 9 — Final Product Release

## Objective

Phase 9 converts the Phase 8B baseline into the final product direction for OVRLD 1.4.0 (build 12). The individual training experience remains the product core; Crew stays optional.

## Product architecture

The five primary destinations are:

1. Today
2. Plan
3. Train
4. Progress
5. Profile

Crew remains available from the profile and contextual product surfaces rather than becoming a mandatory top-level destination.

## Included in Revision 1

### Today

- Active-session resume state.
- Scheduled-workout state.
- Recovery-day state.
- No-plan empty state.
- Current-week consistency and compact performance metrics.

### Plan

- Existing split, schedule, templates, and exercise-library functionality is preserved.
- Plan is promoted to a first-class destination.

### Train

- Resume an active session.
- Start today’s scheduled workout.
- Start a quick workout from the exercise picker.
- Repeat the most recent completed workout.
- Browse recent workout history.

### Gym Mode

- Inline pre-workout review.
- Compact active-session header.
- Current exercise and previous-performance context.
- Completed/current/upcoming set rows.
- One primary performance recommendation with compact alternatives.
- Manual and quick weight/repetition controls.
- Dynamic fixed set-logging action.
- One-tap logging and undo.
- Optional automatic rest-timer start.
- Non-blocking rest mini-player.
- Exercise list, reordering, add exercise, finish, and cancel flows.
- Local-first persistence and sync status.

### Progress

- 7, 30, and 90-day periods.
- Session, set, time, volume, and streak summaries.
- Seven-day consistency rhythm.
- Strongest performances.
- Recent workout history.

### Settings and product tone

- Automatic rest-timer preference.
- Neutral default achievement copy.
- Existing language, appearance, notification, weight-unit, load-step, sync, and offline controls remain available.
- App icon, adaptive foreground, favicon, and splash mark now use OVRLD Volt.

## Preserved contracts

- Android package: `com.karrim.gymcrew`
- iOS bundle identifier: `com.karrim.gymcrew`
- Legacy `gymcrew` callback scheme alongside `ovrld`
- Existing SQLite database and migration chain
- Existing AsyncStorage and secure-storage keys
- Existing offline queue, idempotency, and retry rules
- Existing Supabase schema and service contracts

## Release gates

Revision 1 is ready for local verification and visual QA. It becomes the release candidate only after all of these pass:

- Phase 9 static product contract.
- Smart-preset tests.
- Offline and null-safety regressions.
- TypeScript and ESLint.
- Expo dependency and public-config checks.
- Android JavaScript export.
- Dark/light and Arabic/English physical-device review.
- Active-workout force-close/reopen test.
- Offline logging followed by successful, duplicate-free sync.

## Required visual QA captures

Capture these screens from the preview build:

1. Today — scheduled workout.
2. Plan — current week.
3. Train — no active session.
4. Progress — populated period.
5. Gym Mode — recommendation state.
6. Gym Mode — rest mini-player.
7. Light mode — Today or Train.
8. Arabic RTL and English LTR examples.

## Release identity

- Product version: `1.4.0`
- Android versionCode: `12`
- iOS buildNumber: `12`
- Target tag after approval: `v1.4.0`
