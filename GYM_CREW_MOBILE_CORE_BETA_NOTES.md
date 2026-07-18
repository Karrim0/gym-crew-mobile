# Gym Crew Mobile — Core Beta 0.1.0

## Delivered

- A separate Expo + React Native + TypeScript application, not a WebView wrapper.
- Shared Supabase backend and mapped database types from the current Gym Crew web release.
- Native authentication, protected navigation, onboarding, split setup, exercise selection, Home, Workout, Crew, Progress, and Settings screens.
- Guided Gym Mode designed around tiny decisions instead of form-heavy set logging.
- Previous-performance lookup, tap-first weight/reps pickers, saved equipment increments, automatic rest timer, notification sound, haptics, and keep-awake.
- SQLite workout cache plus ordered offline sync queue using client-generated IDs.
- Arabic Egyptian/English, RTL/LTR, light/dark/system themes.
- Responsive native layouts designed for narrow and older phones.
- Android EAS preview and production profiles.

## Verified

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npx expo install --check` — dependencies reported up to date using Expo's local SDK map.
- Expo public configuration resolved successfully.

## Environment limitation

A full Metro export did not finish inside the artifact environment's time window while rebuilding an empty cache. It did not report a source-code error before the timeout. Run an Android development build or EAS preview build with your environment variables as the final native runtime gate.

## Intentional next-phase items

- Smart plan import review/save on mobile.
- Full crew conversion and administration.
- Background task scheduling beyond the current foreground/offline queue.
- Automated test suite and release telemetry.
