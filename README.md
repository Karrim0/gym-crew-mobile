# OVRLD Mobile

**OVRLD** is an offline-first workout tracking application for iOS and Android.

It helps athletes plan their training, run workout sessions, log sets with minimal interaction, track progressive overload, and review long-term progress.

The individual training experience is the core of OVRLD. Crews are available as an optional social layer for accountability and friendly competition.

## Latest Release

**OVRLD v1.4.0 — Build 12**

The Android APK is available from the repository's **Releases** section.

## Core Features

### Today

- Adaptive daily training overview.
- Scheduled workout state.
- Active-session resume.
- Recovery-day state.
- Weekly consistency summary.
- Recent achievements and upcoming workouts.

### Plan

- Weekly training schedule.
- Ready-made workout splits.
- Custom workout plans.
- Exercise ordering and targets.
- Rest-day management.
- Exercise library and search.

### Train

- Start today's workout.
- Resume an active session.
- Create a quick workout.
- Repeat a previous workout.
- Review and adjust exercises before starting.

### Gym Mode

- Fast set logging designed for one-handed use.
- Completed, current, and upcoming set tracking.
- Weight and repetition controls.
- Manual numeric entry.
- Smart performance recommendations.
- One-tap logging.
- Set editing and undo.
- Exercise notes.
- Exercise reordering and skipping.
- Automatic or manual rest timer.
- Non-blocking rest timer mini-player.
- Workout completion summary.

### Progress

- Workout history.
- Training consistency.
- Volume tracking.
- Strength progress.
- Personal records.
- Exercise performance history.
- Weekly, monthly, and quarterly views.

### Crews

- Optional workout groups.
- Weekly activity ranking.
- Workout completion updates.
- Personal-record sharing.
- Reactions and encouragement.
- Group consistency tracking.

### Offline-First Training

After the initial online data load, OVRLD stores the user's essential training data locally.

Users can:

- Open their current plan offline.
- Start and continue workouts offline.
- Log and edit sets offline.
- Use the rest timer offline.
- Restore an active session after force-closing the app.
- Complete a workout without internet access.

Pending changes are stored in SQLite and synchronized when connectivity returns using retry rules, idempotency keys, and duplicate protection.

## Languages and Appearance

- Arabic with full RTL support.
- English with LTR support.
- Dark theme.
- Light theme.
- System theme.
- Localized workout terminology.
- Accessible touch targets and readable contrast.

## Technology Stack

- React Native
- Expo
- Expo Router
- TypeScript
- Supabase
- SQLite
- Zustand
- EAS Build
- GitHub Actions

## Project Structure

```text
src/app                 Expo Router screens and routes
src/components          Shared interface components
src/features            Product services and feature modules
src/lib/offline         SQLite cache and synchronization system
src/lib/notifications   Rest timer and local notifications
src/lib/theme           Design tokens and theme configuration
src/stores              Application state stores
src/types               Domain and database types
supabase/migrations     Reproducible database migrations
scripts                 Verification and quality scripts
docs                    Product, phase, and release documentation
```

## Requirements

- Node.js 22 recommended
- npm
- Expo account for EAS cloud builds
- Supabase project
- Android Studio for local Android native builds or emulation
- Xcode and macOS for local iOS native builds

## Environment Configuration

Copy the environment template:

```bash
cp .env.example .env.local
```

Add public application values only:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_WEB_API_URL=https://YOUR_WEB_APP.example
```

Never place service-role keys, signing credentials, or private API secrets inside variables prefixed with `EXPO_PUBLIC_`.

## Installation

```bash
npm ci
```

## Development

```bash
npm run typecheck
npm run lint
npx expo start --dev-client --lan --clear
```

## Quality Verification

Run the complete Phase 9 product verification:

```bash
npm run phase9:check
```

On Windows:

```bat
VERIFY_PHASE9_FINAL.cmd
```

The verification process covers:

- Product and release identity.
- TypeScript.
- ESLint.
- Expo dependency alignment.
- Android JavaScript export.
- Smart set recommendation tests.
- Bodyweight and null-value guards.
- Offline reliability contracts.
- Sync retry and idempotency rules.
- Git whitespace validation.

## Android Preview APK

```bash
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

The preview profile generates an APK that can be installed directly on Android devices.

## Android Production Build

```bash
npx eas-cli@latest build --platform android --profile production
```

The production profile generates an Android App Bundle for Google Play.

## Release Information

- App version: `1.4.0`
- Android version code: `12`
- iOS build number: `12`
- Android application ID: `com.karrim.gymcrew`
- iOS bundle identifier: `com.karrim.gymcrew`

## Documentation

Important project documentation:

- `docs/PHASE_9_FINAL_PRODUCT_RELEASE.md`
- `docs/PHYSICAL_DEVICE_RELEASE_CHECKLIST.md`
- `docs/FINAL_DELIVERY_PLAN.md`

## License

This project is licensed under the MIT License.