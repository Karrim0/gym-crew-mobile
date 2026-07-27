# OVRLD Mobile

OVRLD is an offline-first React Native performance-training app built with Expo Router,
TypeScript, Supabase, and SQLite. It supports solo athletes and workout crews,
while keeping the in-gym flow focused on quick weight and reps logging.

## Current release candidate: 1.2.0

### OVRLD product experience

- Obsidian Ember visual system with an ember-orange accent and warm-white typography.
- Alexandria for Arabic and interface copy; Inter for weights, reps, timers, and metrics.
- Four primary destinations: Home, Workout, Progress, and Profile.
- Locally bundled workout photography, a new adaptive icon, and an OVRLD splash mark.
- Arabic Egyptian and English with RTL/LTR layouts.
- Solo workspace or shared crew with invite code and member roles.
- Personal split, starter templates, weekly schedule, and exercise editing.
- Consistent loading, empty, offline, sync, and recoverable error states.

### Click-first Gym Mode

- First-time exercises ask for weight and reps once.
- Later sets offer Repeat, Progress, and Back-off presets derived from recent performance.
- Optional one-tap logging records a preset immediately.
- Manual editing, notes, undo, extra sets, reorder, and rest timer remain available.
- One exercise stays on screen at a time with large one-hand controls.
- Live elapsed time and local-save/sync status.
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

## Release quality gate

```bash
npm run phase8:check
```

On Windows:

```bat
call VERIFY_PHASE8_PRODUCT.cmd
```

The Phase 8 gate verifies:

- the polished light/dark theme and glass-surface contract;
- smart-set presets, bodyweight guards, and direct load jumps;
- Phase 4 offline and null-safety regressions;
- version `1.2.0` / build `10` synchronization;
- TypeScript, ESLint, Expo dependency alignment, and public config resolution.

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
