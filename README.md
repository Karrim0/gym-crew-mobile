# Gym Crew Mobile

A native React Native rebuild of Gym Crew, built with Expo, TypeScript, Expo Router, Supabase, SQLite, and an offline-first workout queue.

## Current mobile release: Core Beta 0.1.0

This first native milestone focuses on the product's highest-value loop:

- Arabic Egyptian and English, with RTL/LTR switching.
- Light, dark, and system appearance.
- Supabase email authentication and onboarding.
- Personal split setup, starter templates, day editing, exercise search, and targets.
- Home dashboard with today's planned workout and weekly schedule.
- Guided Gym Mode:
  - choose any exercise first;
  - see previous sets;
  - focus screen while performing the set;
  - tap weight and reps instead of typing by default;
  - configurable weight increments per exercise;
  - automatic rest timer, sound, haptics, and local notification;
  - reorder exercises and add extra sets;
  - keep the screen awake during an active workout.
- SQLite workout cache and queued Supabase synchronization.
- Workout history, weekly stats, top weights, and crew adherence leaderboard.
- Safe-area, keyboard, 320px-screen, and dynamic type considerations.

The existing Next.js app remains the web product and server API. Mobile and web share the same Supabase project and database schema.

## Requirements

- Node.js 20+
- Android Studio for local Android emulators/native builds
- Expo account for EAS builds
- The Gym Crew Supabase project with the existing migrations applied

## Configure

```bash
cp .env.example .env.local
```

Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
EXPO_PUBLIC_WEB_API_URL=https://YOUR_WEB_APP.vercel.app
```

Never place a Supabase service-role key or an OpenAI key in an `EXPO_PUBLIC_` variable.

## Run

```bash
npm install
npm run check
npx expo start
```

Open Android with `a`, or scan the development QR code. Native notification sound behavior should be verified in a development build rather than relying only on Expo Go.

## EAS builds

```bash
npm install -g eas-cli
eas login
eas init
```

Copy the generated project ID into `EXPO_PUBLIC_EAS_PROJECT_ID`, then:

```bash
# Internal Android APK
eas build --platform android --profile preview

# Play Store AAB
eas build --platform android --profile production
```

Change `com.karrim.gymcrew` in `app.config.ts` before the first store release if a different permanent application ID is required. Once published, the application ID should not change.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run check
npx expo install --check
```

## Architecture

```text
src/app                 Expo Router screens
src/components          Reusable native UI and Gym Mode components
src/features            Supabase-facing feature services
src/lib/offline         SQLite cache and ordered sync queue
src/lib/notifications   Rest notification and timer integration
src/stores              Persisted settings, auth context, timer state
src/types               Shared app-facing domain and generated DB types
```

## Next production milestones

1. Mobile plan import review and save flow using the existing web API.
2. Full crew administration, invites, activity feed, and challenges.
3. Background-sync hardening and conflict-resolution telemetry.
4. Exercise media library and richer muscle illustrations.
5. Automated unit, integration, and Maestro end-to-end tests.
6. Store privacy forms, crash reporting, analytics consent, and staged beta release.
