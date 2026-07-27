# OVRLD Phase 8B — Actual UX Rebuild

Phase 8B replaces the card-heavy Phase 8 presentation with a more deliberate mobile product hierarchy while preserving all database, offline, authentication, and workout service contracts.

## Product changes

- A calmer raised/sunken surface system for both light and dark modes.
- A smaller floating navigation bar with a restrained active indicator.
- One photo-led focus surface on Home; repeated photo heroes were removed from Workout, Progress, and Profile.
- Compact information density and clearer primary/secondary actions across the four main tabs.
- Honest duration display when legacy sessions do not contain a usable duration.

## Gym Mode

- Fixed primary logging action near the thumb.
- Compact current-exercise context.
- Direct `-5`, `-2.5`, `+2.5`, and `+5` kg controls.
- Direct repetition tuning.
- Progress suggestion labels distinguish adding a rep from adding weight.
- Repeat, progress, and back-off suggestions remain editable before logging.
- Offline persistence, sync indicators, rest timer, undo, notes, reorder, and exercise-list tools remain available.

## Compatibility

- No database migration.
- No new dependency.
- Android package and iOS bundle identifier remain unchanged.
- Existing local data, active workouts, queues, auth sessions, and settings remain compatible.
