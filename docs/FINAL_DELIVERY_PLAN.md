# Gym Crew Mobile — Final Delivery Plan

The original remaining work is consolidated into three delivery steps.

## Step 1 — Reliability closure and working APK

Includes the Phase 4 offline work plus the null-data crash hotfix.

Exit gate:

- Home, Split, Workout, Progress, and Settings open without a crash;
- an offline workout survives force-close and reopen;
- restoring the network drains the queue without duplicate rows;
- preview APK 0.5.1 / Android version code 6 passes the phone smoke test.

## Step 2 — Product rebuild (combined design phases)

Combines the old Design System, Navigation, Screen Redesign, and Gym Mode UX
phases into one product pass.

Scope:

- premium graphite/charcoal visual system with restrained lime accent;
- four primary tabs: Home, Workout, Progress, Profile;
- Split moves inside Home/Workout and Crew moves inside Profile;
- complete Arabic RTL and English layout pass;
- redesigned Home, Split, Workout history, Progress, Profile, Settings, auth,
  onboarding, and all empty/loading/error states;
- one-exercise-at-a-time Gym Mode with large one-hand controls and minimal
  alerts;
- consistent spacing, typography, cards, buttons, icons, and touch targets.

Exit gate: every core path is usable on a physical phone and no screen looks or
behaves like a prototype.

## Step 3 — QA, release, and handoff

Combines regression testing, release preparation, and repository cleanup.

Scope:

- functional smoke matrix for online/offline/auth/workout/sync;
- Android preview and production build checks;
- accessibility, RTL, small-screen, loading, empty, and failure-state checks;
- release notes, versioning, screenshots, README, and final branch/tag;
- only release-blocking defects remain open.

Exit gate: a signed release candidate is installable and the repository is left
on a clean, documented release baseline.
