# OVRLD Mobile

OVRLD is an offline-first personal training operating system built with React Native,
Expo Router, TypeScript, Supabase, and SQLite. The individual athlete experience is
the product core; workout crews are an optional social layer.

## Current release candidate: 1.4.0 (build 12)

### Product architecture

- Five primary destinations: Today, Plan, Train, Progress, and Profile.
- Today adapts to a scheduled workout, an open session, a recovery day, or a missing plan.
- Plan contains the weekly schedule, active split, templates, and exercise library.
- Train supports today’s workout, active-session resume, quick workout, and repeat previous workout.
- Progress covers consistency, workout history, strongest performances, volume, and streaks.
- Profile contains Crew, notifications, language, appearance, training preferences, and sync controls.

### OVRLD product identity

- OVRLD Volt `#C8FF3D` is the single focused brand accent.
- Dedicated dark and light theme surfaces.
- Alexandria for Arabic/interface copy and Inter for weights, reps, timers, and metrics.
- Arabic Egyptian and English with RTL/LTR layouts.
- Updated adaptive icon, favicon, and splash mark.

### Gym Mode

- Inline pre-workout review instead of an interruptive ordering prompt.
- Compact session and exercise context.
- Completed, current, and upcoming set rows.
- One primary performance recommendation with compact alternatives.
- Manual weight/repetition entry and quick load controls.
- Dynamic fixed logging action that displays the exact values being saved.
- Optional one-tap logging, undo, extra sets, notes, reordering, and exercise selection.
- Optional automatic rest timer with a non-blocking mini-player.
- Live local-save and sync status.

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
- OVRLD Supabase project with the committed migration chain applied
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

## Phase 9 quality gate

```bash
npm run phase9:check
```

On Windows:

```bat
call VERIFY_PHASE9_FINAL.cmd
```

The Phase 9 gate verifies:

- release identity `1.4.0` / build `12`;
- Today / Plan / Train / Progress / Profile architecture;
- Gym Mode preflight, set rows, recommendations, fixed action, and rest mini-player;
- smart-set recommendation behavior and bodyweight guards;
- offline reliability, null safety, retry, and idempotency regressions;
- TypeScript, ESLint, Expo dependency alignment, public config, and Android export.

## Preview APK

```bash
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

The preview profile produces a standalone APK for physical-device testing.
Do not tag the release until dark/light, Arabic/English, Gym Mode, force-close,
and offline-to-online synchronization checks pass on a physical device.

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
- App version: `1.4.0`
- Android version code: `12`
- iOS build number: `12`

See `docs/PHASE_9_FINAL_PRODUCT_RELEASE.md` and
`docs/PHYSICAL_DEVICE_RELEASE_CHECKLIST.md` for the final handoff gates.
