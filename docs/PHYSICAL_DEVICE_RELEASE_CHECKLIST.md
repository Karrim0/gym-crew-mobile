# Gym Crew Mobile 1.0.0 — Physical Device Release Checklist

Device: ____________________  Android: __________  Tester: __________
Build shown by EAS: `1.0.0 (8)`  Date: __________

Mark each item `PASS`, `FAIL`, or `N/A` and attach a screenshot for failures.

## Install and bootstrap

- [ ] APK installs over the previous version without clearing app data.
- [ ] Splash opens without a blank white frame or crash.
- [ ] Existing signed-in session restores.
- [ ] Login, registration, and password reset keyboard flows remain usable.
- [ ] Home, Workout, Progress, Profile, Split, Crew, and Settings open.

## Gym Mode

- [ ] Starting today’s workout opens the order preflight once.
- [ ] Exercise name, target range, previous set, elapsed time, and data status fit.
- [ ] Weight and reps can be changed with one hand.
- [ ] Double-tapping “Set done” creates one completed set only.
- [ ] Undo restores the set correctly.
- [ ] Next set, next exercise, extra set, notes, reorder, and timer work.
- [ ] Force-closing and reopening restores the active workout.
- [ ] Finishing routes to Progress and creates one history entry.

## Offline and sync

- [ ] Open the app online once, then enable Airplane Mode.
- [ ] Home, plan, active workout, history, and progress show cached data.
- [ ] Log at least three sets offline.
- [ ] Force-close and reopen while still offline; all sets remain.
- [ ] The UI says data is saved on the device and does not block training.
- [ ] Reconnect; pending count reaches zero.
- [ ] Supabase contains one session and one row per set, with no duplicates.
- [ ] A failed queued change can be retried from Settings.

## Layout and accessibility

- [ ] Arabic RTL: labels, rows, arrows, values, sheets, and tab order are correct.
- [ ] English LTR remains correct after switching language without reinstalling.
- [ ] System font at 130% does not hide primary actions.
- [ ] Keyboard does not cover auth, profile, note, or custom-number fields.
- [ ] Bottom tab bar clears gesture/navigation insets.
- [ ] Action sheets clear the bottom inset and can close with Android Back.
- [ ] TalkBack announces main buttons, notifications, save state, and errors.
- [ ] Dark, light, and system appearance remain readable.

## Release integrity

- [ ] App displays version `1.0.0`.
- [ ] Android app info reports build/version code `8` where available.
- [ ] Runtime permission prompts are limited to features actually used.
- [ ] No raw SQL, JavaScript, Supabase, or stack-trace message reaches the UI.
- [ ] Phase 6 GitHub Actions workflow is green.
- [ ] EAS preview build is linked in the release notes.

Release decision: [ ] GO  [ ] NO-GO

Blocking defects:

1. ______________________________________________________________________
2. ______________________________________________________________________
3. ______________________________________________________________________
