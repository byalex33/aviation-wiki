# Aviation data graph

Articles remain aviation.wiki's editorial knowledge layer. The aviation data
graph stores sourced, time-aware facts used by airframe, registration,
production, and fleet projections. Pages are read models over this graph; they
must not become a second store for aviation facts.

## Model

- `airframes` supplies a stable internal and public identity only.
- `aircraft_models` and `aviation_organizations` are typed reference entities.
- `airframe_identifiers`, `airframe_dates`, `registration_assignments`,
  `airframe_events`, `airframe_configurations`, and `airframe_media` hold typed
  aviation records.
- Every typed record points to one `aviation_assertions` row. The assertion
  retains its primary source, observed and effective dates, confidence, import
  run or manual provenance, and review state. `aviation_assertion_evidence`
  attaches additional supporting or contradicting sources without duplicating
  the typed fact.
- `reconciliation_cases` retains competing claims. An unresolved case has no
  canonical assertion and projections must expose the conflict instead of
  picking a value.

Effective dates describe when a claim applies in aviation history. Observed
dates describe when a source or importer reported it. Keeping both avoids
rewriting history when information arrives late.

## Import rules

1. Register the source and import run.
2. Upsert stable entities and append assertions. Never update a conflicting
   value in place.
3. Use the assertion idempotency key to make identical re-imports no-ops.
4. Detect overlapping, differing claims and open a reconciliation case.
5. Only accepted, conflict-free assertions enter canonical projections.

## Migration

Production never runs DDL from a web request. Preview the additive migration:

```sh
npm run db:migrate:aviation-data
```

Apply it from a trusted environment with a backed-up `DATABASE_URL`:

```sh
npm run db:migrate:aviation-data -- --apply
```

The migration creates new tables and indexes without changing article tables.
Rollback therefore consists of deploying the previous application version;
the additive tables can remain in place during the rollback window. Never drop
them until a verified backup exists and the retention window has passed.

## British Airways A350-1000 reference slice

Preview the versioned, deterministic import plan:

```sh
npm run data:import:ba-a350
```

After applying the schema migration, import it with:

```sh
npm run data:import:ba-a350 -- --apply
```

The curated slice includes all 18 aircraft reported by British Airways on 30
August 2026, with MSN, registration assignment, delivery event, operator, and
configuration evidence. It intentionally retains the competing 26 and 29 July
2019 first-delivery dates as an unresolved reconciliation case. Re-running the
same dataset fingerprint is a no-op. The G-XWBA record also exercises licensed
media provenance with a Wikimedia Commons photograph, creator, licence, source
page, and capture date.

Resolve a reviewed conflict with the dry-run-by-default CLI:

```sh
npm run data:reconcile -- --case <case-id> --canonical <assertion-id> \
  --reviewer <reviewer-id> --note <decision>
```

Add `--apply` only after checking the selected assertion. Resolution retains
all competing claims, records their before/after review states, and appends an
`aviation_reconciliation_events` audit record.

## Canonical read models

`src/lib/aviation-data-projections.ts` is the single projection policy for
airframe, production-list, and fleet views. A typed record is canonical only
when its assertion is accepted and its subject/predicate has no open
reconciliation case. Conflicting claims remain available to the airframe view,
but are excluded from canonical dates and counts until review resolves them.

Production lists filter the resulting airframes by model. Current fleet views
filter the same airframes by the operator on the active temporal registration.
Neither view owns a duplicate production or fleet dataset.

The public projections are available at `/airframes`, `/registrations`,
`/production-lists/a350-1000`, and `/fleet/british-airways`. The approved Airbus
A350 and British Airways encyclopedia articles link to these factual modules;
the graph does not replace their human-written knowledge layer.

## Production rollout

The schema is additive but is never created from a web request in production,
and the pages must not be publicly reachable before the tables and the first
import exist. The `AVIATION_DATA_ENABLED` env var gates every route, navigation
entry, and sitemap URL for the feature. It defaults on in development and test
(where `ensureSchema()` creates the tables) and off in production until set to
`"true"`. If the flag is on but the migration has not run, `loadAviationGraphSnapshot()`
still degrades to an empty snapshot rather than a 500.

Roll out in this order:

1. Merge and deploy. `AVIATION_DATA_ENABLED` is unset, so the routes render the
   404 page and nothing links to them — the change is dark and reversible by a
   redeploy.
2. From a trusted environment with a backed-up `DATABASE_URL`:
   ```sh
   npm run db:migrate:aviation-data -- --apply
   npm run data:import:ba-a350 -- --apply
   ```
3. Optionally resolve the seeded delivery-date conflict:
   ```sh
   npm run data:reconcile -- --case <case-id> --canonical <assertion-id> \
     --reviewer <reviewer-id> --note <decision>
   ```
4. Set `AVIATION_DATA_ENABLED=true` in the deployment environment and redeploy.
   The routes, `/fleet` and article cross-links, and the sitemap entries appear
   only from this point.

To take the feature back down, unset the variable and redeploy; the additive
tables can stay in place.
