# Gym Crew Mobile — Final Delivery Plan

The rescue and rebuild are consolidated into six completed engineering phases
and one physical-device release gate.

## Completed engineering phases

1. **Safety baseline and audit** — reproducible checks, source freeze, Android setup.
2. **Database source of truth** — remote schema capture and migration recovery.
3. **Database integrity** — RPC repair, lint cleanup, and database tests.
4. **Bootstrap and connectivity** — resilient session restore and three-state network model.
5. **Offline reliability and product rebuild** — atomic workout persistence,
   idempotent sync, null-safe cache recovery, four-tab product experience, and
   redesigned Gym Mode.
6. **QA and release hardening** — synchronized `1.0.0 (8)` identity, permission
   cleanup, accessibility, release policy tests, CI evidence, EAS hygiene, and
   physical-device checklist.

## Remaining release gate

No new product phase remains before the release candidate. The only remaining
work is evidence from the real APK:

- Phase 6 workflow passes;
- preview APK `1.0.0 (8)` installs over the previous build;
- the physical-device checklist passes in Arabic and English;
- offline force-close/reopen and reconnect produce no missing or duplicate sets;
- release-blocking defects are fixed on the same Phase 6 branch;
- merge to `develop`, tag `v1.0.0`, then create the production App Bundle.

See `PHYSICAL_DEVICE_RELEASE_CHECKLIST.md` for the exact test matrix.
