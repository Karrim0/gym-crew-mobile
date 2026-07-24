# Gym Crew — Phase 1D Migration History Reconciliation

## Confirmed divergence

Remote history contains nine versions from `202607140001` through
`202607160009`. The repository contains five later versions from
`202607180001` through `202607190003`.

The five local versions have already been verified as present in the production
schema. The remaining issue is migration-history alignment.

## Recovered active chain

- `202607140001_initial_schema.sql` contains the exact production `public`
  schema captured in Phase 1A plus the verified `auth.users` profile trigger.
- Eight comment-only files preserve the other remote migration timestamps and
  names. Their final effects are already folded into the recovered initial
  baseline.
- The existing five local migrations remain unchanged and execute afterward.
- `supabase/seed.sql` contains the canonical 40-exercise catalog.

This is a recovery representation of the current database, not a claim that the
original nine migrations used the same SQL.

## Safety gate

The Phase 1D GitHub workflow rebuilds a disposable database using only the
active `supabase/migrations` directory and `supabase/seed.sql`, runs pgTAP
checks, regenerates TypeScript types, and compares the public contract against
production.

Do not repair production history until that workflow is green.

## Production repair after a green workflow

The only intended production mutation is inserting the five missing history
records as `applied`. `migration repair` changes the tracking table only; it
does not execute migration SQL.

After repair, verify with:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

The expected dry-run result is that the linked project is up to date.
