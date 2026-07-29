# Phase 8 — Product Experience Polish

Phase 8 turns the Phase 7 visual rebuild into a release-ready OVRLD product experience without changing the Supabase schema, offline queue, or workout persistence contracts.

## Product decisions

- The UI uses one calmer visual hierarchy across Home, Workout, Progress, Profile, Crew, Settings, and Gym Mode.
- Light and dark themes are designed independently around warm neutral backgrounds and restrained Ember accents.
- Glass surfaces are used for navigation, sheets, and selected cards, not as decoration on every element.
- Photography is limited to high-value hero moments. Metrics and charts sit on readable surfaces instead of fighting the image.
- Arabic copy uses short Egyptian gym language and removes implementation details that do not help the athlete.

## Gym Mode

- The interaction panel no longer stretches to fill the screen and create a large empty area.
- Gym Mode is scroll-safe on compact devices.
- Non-bodyweight exercises never show a false `BW` preset when an old set has a missing load.
- Bodyweight presets remain supported for exercises that can be identified as bodyweight movements.
- The athlete can choose 2.5 kg or 5 kg as the usual load jump, and override it per exercise.
- Weight and reps remain directly adjustable with plus/minus controls.
- One-tap logging stays optional.
- Set feedback uses short praise such as “جامد”, “فحل”, and “دبابة” without blocking the workout.

## Progress and history

- The photo, weekly chart, and metrics are separated into distinct hierarchy levels.
- Implausible legacy workout durations are sanitized before display so values such as thousands of minutes are not shown.

## Crew tone

- First place gets a strong positive line.
- Second place gets a close-chase line.
- The last visible member gets a light reverse-motivation line without insults.
- Ranking is still based on adherence, not lifted weight.

## Release target

- App version: `1.2.0`
- Android versionCode: `10`
- iOS buildNumber: `10`
- Branch: `phase/8-product-experience-polish`
