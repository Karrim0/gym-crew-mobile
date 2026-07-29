# Gym Crew — Phase 2 Database Integrity & RPC Repair

## Scope

This migration replaces five PL/pgSQL function bodies without changing tables,
data, RLS policies, signatures, grants, or generated TypeScript contracts.

## Repaired functions

- `apply_imported_split(jsonb)`
  - Initializes `imported_weekdays` with `array[]::public.weekday[]`.
- `apply_split_template(text)`
  - Executes Friday setup with `PERFORM` instead of storing an unused UUID.
- `assert_base_schedule_has_no_three_rest_days(...)`
  - Uses auto-scoped integer loop variables without shadow declarations.
- `assert_week_schedule_has_no_three_rest_days(...)`
  - Uses explicit date assignment plus auto-scoped integer offsets.
- `reorder_personal_split_days(uuid[])`
  - Removes the declaration shadowed by the integer loop variable.

## Safety gates

The Phase 2 workflow:

1. Rebuilds a disposable database from all 15 active migrations.
2. Loads the canonical 40-exercise seed.
3. Runs every pgTAP test, including 12 Phase 2 assertions.
4. Runs `db lint` with `--fail-on warning`.
5. Regenerates database types and confirms the public contract is unchanged.
6. Uploads the rebuilt schema, lint output, migration list, tests, and checksums.

Migration SHA-256:

```text
10a171034bf15ace0bcae74f686a25f98b623a9309931744ac5a40e34be2e378
```

## Production rule

Do not apply the migration to the linked project until the Phase 2 workflow is
green. After it passes, use a linked dry run first, then apply only the single
pending migration.
