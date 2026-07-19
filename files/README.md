# Gym Crew Mobile

Gym Crew is a real React Native application for Android and iOS, built with Expo Router, TypeScript, Supabase and SQLite. It supports solo athletes and workout crews while keeping the in-gym experience focused on the only two values that must be quick: weight and reps.

## Current release candidate: 0.5.0 Rescue

### Core experience

- Arabic Egyptian and English with RTL/LTR.
- Light, dark and system themes using the lime / black / white Gym Crew design system.
- Supabase email authentication, profile and crew onboarding.
- Solo workspace or shared crew with invite code and privacy controls.
- Personal split, starter presets and full day/exercise customization.
- Verified Girls 4-Day Strength preset with 4 training days and 25 exercises.
- Weekly schedule based on Saturday–Friday and Cairo-local dates.

### Focused Gym Mode

- A lightweight order check before every workout.
- One exercise on screen at a time.
- Previous performance and target range visible without clutter.
- Large one-hand weight and reps controls with remembered weight increments.
- One primary action: finish the set.
- One-tap next set, next exercise, extra set and undo.
- Notes and rest timer remain optional and hidden until requested.
- Duplicate-tap protection while a set is saving.
- Automatic local persistence after every action.

### Offline-first workout flow

After one successful online warm-up, the app caches:

- Profile and current workspace.
- Personal split and effective week.
- Exercise library.
- Workout history and active workout.
- Progress and crew summaries where available.

An active workout can be started, updated, closed and reopened offline. Mutations are queued in SQLite and synchronized with Supabase after connectivity returns.

## Requirements

- Node.js 20+
- An Expo account for EAS cloud builds
- The Gym Crew Supabase project with the included migrations applied
- Android Studio is optional unless you want a local emulator or local native build

## Configure

```bash
cp .env.example .env.local
```

Set only public mobile values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
EXPO_PUBLIC_WEB_API_URL=https://YOUR_WEB_APP.vercel.app
```

Never put a Supabase service-role key or any private AI key in an `EXPO_PUBLIC_` variable.

## Development

```bash
npm ci
npm run check
npx expo start --dev-client --lan --clear
```

The installed development build can scan the Metro QR code. A new native build is required only after native dependency/config changes.

## Preview APK

```bash
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

The preview profile creates a standalone APK that does not require Metro or a computer.

## Quality checks

```bash
npm run typecheck
npm run lint
npx expo install --check
npx expo config --type public
```

## Architecture

```text
src/app                 Expo Router screens
src/components          Shared UI and Gym Mode components
src/features            Profile, crew, split and workout services
src/lib/offline         SQLite cache, networking and sync queue
src/lib/notifications   Local notification integration
src/stores              Auth context, settings, timer and connectivity
src/types               Domain and generated Supabase types
supabase/migrations     Idempotent database migrations
```

## Release identity

- Expo project: `kareem-hanafy`
- Expo owner: `kaghim0s-team`
- Android package: `com.karrim.gymcrew`
- iOS bundle identifier: `com.karrim.gymcrew`
- App version: `0.5.0`
- Android version code: `5`
