# Gym Crew Mobile — Phase 5 Product Experience Rebuild

## Product direction

Phase 5 stops treating the application as a collection of feature screens and
rebuilds it around the four jobs users repeat in the gym:

1. know what to train today;
2. enter or continue Gym Mode quickly;
3. understand progress without analytics noise;
4. manage the plan, crew, and account from one place.

The visual identity is a dark graphite performance product with warm white text
and one restrained electric-lime action color. Decorative glow, oversized
navigation, excessive card nesting, and duplicate destinations were removed
from the primary experience.

## Navigation architecture

The main tab bar now contains only:

- Home;
- Workout;
- Progress;
- Profile.

Split remains a full feature route but moves behind Home, Workout, and Profile.
Crew moves into Profile. This keeps every feature available while reducing the
persistent navigation from five competing destinations to four clear jobs.

The new tab bar is 64px high, uses four equal destinations, maintains Android
safe-area spacing, and preserves 44px+ interaction targets.

## Design system

- dark graphite background (`#080B0C`);
- electric lime primary (`#B9F34F`);
- flatter surfaces with borders instead of heavy elevation;
- tighter radius scale and spacing rhythm;
- 56px standard buttons and 46px compact buttons;
- restrained haptic feedback on button actions;
- dark-first default for new installs;
- Arabic RTL and English direction remain data-driven.

## Rebuilt product screens

### Home

Home now answers “what do I do now?” before showing statistics. The active or
planned workout owns the first visual block, followed by weekly adherence and a
single route into the training plan.

### Workout

The Workout tab is a resume surface first and a history surface second. An open
session exposes the next exercise, completion percentage, and one primary Gym
Mode action. Plan editing remains available without becoming a permanent tab.

### Progress

Progress presents a seven-day set chart, workout count, completed sets, time,
volume, top performance, and recent history in a compact hierarchy.

### Profile hub

The new fourth tab brings together:

- editable profile;
- training plan;
- crew / solo workspace;
- notifications;
- settings;
- local sync state;
- workout, set, and exercise totals from the loaded history window.

## Gym Mode

The existing one-exercise-at-a-time workflow remains the product center:

- current exercise and set are always visible;
- large weight and rep controls remain one-hand friendly;
- “Set done” is the dominant action;
- reorder, add exercise, timer, finish, and cancel stay secondary tools;
- every set continues to use Phase 4 atomic local persistence.

## Release identity

- application version: `0.6.0`;
- Android version code: `7`;
- iOS build number: `7`.

## Validation gate

The Phase 5 workflow checks the product contract, TypeScript, ESLint, Expo
package alignment, public Expo config, and Android JavaScript export. A physical
phone review remains required for small-screen layout, Arabic RTL, navigation,
Gym Mode, and offline regression.
