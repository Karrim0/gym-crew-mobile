# Gym Crew Mobile

Gym Crew is an offline-first React Native training app built with Expo Router,
TypeScript, Supabase, and SQLite. It supports solo athletes and workout crews,
while keeping the in-gym flow focused on quick weight and reps logging.

## Current release candidate: 1.0.0

### Product experience

- Four primary destinations: Home, Workout, Progress, and Profile.
- Arabic Egyptian and English with RTL/LTR layouts.
- Dark graphite design system with a restrained electric-lime accent.
- Solo workspace or shared crew with invite code and member roles.
- Personal split, starter templates, weekly schedule, and exercise editing.
- Loading, empty, offline, sync, and recoverable error states.

### Gym Mode

- One exercise on screen at a time.
- Large one-hand weight and reps controls.
- Previous performance, target range, and strongest past set.
- Elapsed workout time and live local-save/sync status.
- One dominant action: finish the set.
- Next set, next exercise, extra set, undo, notes, reorder, and optional rest timer.
- Duplicate-tap protection and atomic local persistence after every action.

### Offline reliability

After one successful online warm-up, the app caches the profile, workspace,
training plan, exercise library, active workout, history, and progress data.
An active workout can be continued after force-close while offline. Mutations are
queued in SQLite with idempotency keys, retry backoff, conflict rules, and a
failed-change recovery path.

## Requirements

- Node.js 22 recommended
- npm
- Expo account for EAS cloud builds
- Gym Crew Supabase project with the committed migration chain applied
- Android Studio only for local native builds or an emulator

## Configure

```bash
cp .env.example .env.local
```

Use public mobile values only:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_WEB_API_URL=https://YOUR_WEB_APP.example
```

Never put a service-role key, private API key, or signing credential in an
`EXPO_PUBLIC_` variable.

## Development

```bash
npm ci
npm run typecheck
npm run lint
npx expo start --dev-client --lan --clear
```

## Release quality gate

```bash
npm run release:check
```

On Windows:

```bat
call VERIFY_PHASE6_RELEASE.cmd
```

The release gate verifies:

- Phase 4 offline and null-safety regressions;
- Phase 5 product/navigation contract;
- 1.0.0 version synchronization across Expo and Android native code;
- Android permission allowlist;
- release policy tests;
- TypeScript, ESLint, and Expo dependency alignment.

## Preview APK

```bash
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

The preview profile produces a standalone APK for physical-device testing.
EAS requires a clean committed tree before starting a build.

## Production Android build

```bash
npx eas-cli@latest build --platform android --profile production
```

The production profile produces an Android App Bundle. Complete the physical
release checklist before uploading it to a store track.

## Architecture

```text
src/app                 Expo Router screens
src/components          Shared UI and Gym Mode components
src/features            Auth, profile, crew, split, and workout services
src/lib/offline         SQLite cache, network state, and mutation queue
src/lib/notifications   Rest timer and local notifications
src/stores              Session, settings, timer, notifications, connectivity
src/types               Domain and generated Supabase types
supabase/migrations     Reproducible database migration chain
```

## Release identity

- Expo project: `kareem-hanafy`
- Expo owner: `kaghim0s-team`
- Android package: `com.karrim.gymcrew`
- iOS bundle identifier: `com.karrim.gymcrew`
- App version: `1.0.0`
- Android version code: `8`
- iOS build number: `8`

See `docs/PHASE_6_QA_RELEASE.md` and
`docs/PHYSICAL_DEVICE_RELEASE_CHECKLIST.md` for the final handoff gates.
