# Gym Crew Mobile — Phase 6 QA, Release, and Handoff

Phase 6 converts the rebuilt product into a verifiable `1.0.0` release
candidate. It does not add another feature surface. It closes release risks,
keeps native and JavaScript identity synchronized, improves physical-device
behavior, and leaves repeatable evidence for every build.

## Release identity

- user-facing version: `1.0.0`;
- Android `versionCode`: `8`;
- iOS `buildNumber`: `8`;
- preview artifact: installable APK;
- production artifact: Android App Bundle.

Because this repository contains an `android` directory, native Android version
values are kept in sync with `app.config.js` and `package.json`.

## Runtime hardening

- Gym Mode shows elapsed time without opening another surface.
- Gym Mode announces whether data is synced, waiting, or saved locally offline.
- main controls expose accessibility roles, busy state, disabled state, and
  descriptive labels;
- action sheets respect the device bottom safe area and use modal accessibility
  semantics;
- toasts and connectivity status use live-region announcements;
- technical null-property errors are converted to a safe user-facing fallback;
- legacy storage and overlay permissions are removed from the main Android
  manifest.

## Build hardening

- EAS refuses to build an uncommitted working tree;
- `.easignore` excludes local environment, credentials, caches, and binaries;
- release verification checks Expo, package, runtime, and native versions;
- Android permissions are checked against a four-permission allowlist;
- preview remains APK and production remains App Bundle;
- CI exports the Android JavaScript bundle and uploads release evidence.

## Automated gate

Run locally:

```bat
call VERIFY_PHASE6_RELEASE.cmd
```

The gate runs:

1. Phase 6 release contract;
2. six release policy tests;
3. Phase 4 offline, null-safety, and idempotency regressions;
4. Phase 5 product contract;
5. TypeScript;
6. ESLint;
7. Expo dependency alignment;
8. Expo public config resolution.

GitHub Actions additionally performs an Android JavaScript export and retains
release evidence for 30 days.

## Release gate

The branch is ready to merge only when:

- the Phase 6 workflow is green;
- preview APK `1.0.0 (8)` installs over the previous build;
- every row in the physical-device checklist is marked pass;
- an offline workout survives force-close and syncs once after reconnecting;
- Arabic and English layouts are checked on a small Android phone;
- no release-blocking defect remains open.

## Handoff

After merge to `develop`:

1. create an annotated tag `v1.0.0`;
2. build the production Android App Bundle;
3. retain the workflow artifact and EAS build link;
4. publish the changelog with known non-blocking limitations;
5. start future work from a new branch without modifying the release tag.
