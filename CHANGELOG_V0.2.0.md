# Gym Crew Mobile v0.2.0

## Critical fixes

- Correct local date-only and Saturday–Friday week calculations.
- Prevent stale in-progress sessions from hijacking today's workout.
- Show an explicit continue/replace flow for an older active workout.
- Fix temporary onboarding redirects while profile/group context is loading.
- Fix the ambiguous `user_id` group statistics RPC with explicit aliases.
- Mask private crew statistics inside the RPC, not only in the UI.

## Profile and navigation

- Real profile avatar with Supabase Storage upload.
- Editable display name and crew privacy settings.
- Profile workout statistics.
- Independent Profile, Settings, and Notifications actions in the header.
- Safe-area-aware bottom navigation.
- Read-only workout history details screen.

## UI/UX overhaul

- Unified light/dark design tokens, spacing, borders, shadows, and states.
- Redesigned Home, Crew, Split, Workout, Progress, Profile, and Settings screens.
- Skeleton loading states, clearer empty/error states, press feedback, and haptics.
- Improved small-screen wrapping and overflow behavior.
- Removed visible placeholder/Coming Soon actions.

## Workout experience

- Faster guided set flow with previous performance.
- Exercise notes.
- Add an exercise during an active session.
- Add and reorder sets/exercises.
- Input validation and safer error handling.
- Persistent rest timer across app restarts.

## Notifications

- Permission flow and system-settings fallback.
- Sound/vibration combinations through dedicated Android channels.
- Foreground and background rest alerts.
- Deep links to the current workout/settings.
- Local Notification Center with unread badge and history.
- Avoid duplicate foreground sound when a native notification is scheduled.

## Offline and sync

- SQLite schema upgrades for entity-aware sync queue records.
- Mutation de-duplication and retry metadata.
- Newer-remote conflict protection for sessions and sets.
- Automatic sync on reconnect/app foreground.
- Manual Sync Now and global offline/pending banner.
- Cached exercise library, split, weekly schedule, active workout, and history.
- Local data and notification cleanup on sign out.

## Release

- App version `0.2.0` / Android versionCode `2` / iOS buildNumber `2`.
- Preview profile creates a standalone APK without Development Client.
- Added `npm run dev`, `npm run qa`, and `npm run bundle:android`.
