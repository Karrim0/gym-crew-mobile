# Phase 0 — Android Emulator Baseline Checklist

Record the current behavior before any repair. Do not change code while completing this list.

## Environment

- Branch: `audit/current-v050-baseline`
- Node version:
- Java version:
- Android emulator/API:
- App version/versionCode: `0.5.0 / 5`
- Supabase project: record only the project reference, never keys.

## Commands

```bat
cd /d E:\A-KAREEM-TECH\MobileApps\gym-crew-mobile
npm ci
npm run audit:baseline
npm run typecheck
npm run lint
npx expo install --check
npx expo run:android
```

## Smoke matrix

| Scenario | Expected baseline evidence | Actual result | Screenshot/log |
|---|---|---|---|
| Fresh install, online | App reaches auth/onboarding |  |  |
| Existing session, online | Workspace loads |  |  |
| Existing session, network API error | Current defect may show full-screen blocker |  |  |
| Airplane mode with cache | Cached workspace should be observable |  |  |
| Airplane mode without cache | Setup/recovery state |  |  |
| Login/logout/login as another user | No previous-user cached data visible |  |  |
| Open Home | Record layout and data errors |  |  |
| Open Workout/Gym Mode | Record crashes, stale data, and UX friction |  |  |
| Open Split and apply template | Record RPC/database result |  |  |
| Open Progress | Record RPC/database result |  |  |
| Force-close during workout | Record whether current set survives |  |  |

## Evidence rules

- Capture the first error, not only the final screen.
- Copy the last 50 Metro/Gradle lines for failures.
- Never include `.env.local`, access tokens, refresh tokens, or Supabase keys.
- Do not mark a row passed without testing it on the emulator.
