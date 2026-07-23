# Gym Crew — Phase 1C Reproducible Database

## Purpose

Build a fresh disposable Supabase database from committed evidence without touching
the linked production project.

## Recovery inputs

- Exact `public` schema exported from production in Phase 1A.
- Verified `auth.users` profile trigger.
- Verified public `avatars` bucket and four object policies.
- Canonical catalog of 40 public exercises.
- The five existing local incremental migrations.

## CI validation

The GitHub workflow creates an isolated Supabase project on an Ubuntu runner, starts
a fresh local database, applies the recovery baseline followed by all five current
local migrations, loads the exercise seed, runs pgTAP assertions, regenerates
TypeScript types, and compares them with the production-generated types.

No production secret is required for this workflow and it never links to the remote
project.

## Important status

These files live under `supabase/recovery` deliberately. They are not promoted to the
active migration chain until the cold-rebuild workflow passes.

Do not run against production:

```bash
supabase db reset --linked
supabase db push
supabase migration repair
```

## Expected catalog

- 40 public exercises
- Unique fixed UUID per exercise
- `is_custom = false`
- `created_by = null`
