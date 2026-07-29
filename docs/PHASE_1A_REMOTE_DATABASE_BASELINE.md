# Gym Crew — Phase 1A Remote Database Baseline

Snapshot date: 2026-07-22  
Scope: linked Supabase `public` schema and generated TypeScript API types.

## Verified snapshot contents

- Public tables: 12
- Public enums: 7
- Public functions/RPCs: 51
- RLS policies: 26
- RLS-enabled tables: 12
- Database triggers: 26
- Explicit indexes: 8
- Database lint exit code: 0

The active `src/lib/supabase/database.types.ts` is replaced with the types generated
directly from the linked remote project.

## Migration history divergence

Remote-only migration versions (9):

- `202607140001`
- `202607140002`
- `202607140003`
- `202607140004`
- `202607140005`
- `202607140006`
- `202607150007`
- `202607150008`
- `202607160009`

Local-only migration versions (5):

- `202607180001`
- `202607180002`
- `202607190001`
- `202607190002`
- `202607190003`

This phase intentionally does **not** run `db push`, `db reset --linked`, or migration
history repair. The schema snapshot is evidence and a recovery baseline; it is not
placed in `supabase/migrations` yet because the remote and local histories must be
reconciled safely first.

## Lint findings to repair in Phase 2

1. `apply_imported_split`: `text` is assigned to `weekday[]` without a valid cast.
2. `apply_split_template`: unused `fri` variable.
3. `assert_base_schedule_has_no_three_rest_days`: shadowed/unused loop variables.
4. `assert_week_schedule_has_no_three_rest_days`: shadowed/unused loop variable.
5. `reorder_personal_split_days`: shadowed/unused loop variable.

## Safety rule

Until Phase 1B is complete, do not run:

```bash
supabase db push
supabase db reset --linked
```

A dry run is allowed for inspection only:

```bash
supabase db push --linked --dry-run
```

## Phase 1B acceptance criteria

- Recover a reproducible migration baseline.
- Verify the app-owned Auth trigger and Storage bucket/policies.
- Prove the five local-only migrations already match remote effects.
- Repair migration history without executing duplicate SQL.
- Confirm `supabase migration list --linked` is aligned.
- Confirm generated types remain unchanged after reconciliation.
