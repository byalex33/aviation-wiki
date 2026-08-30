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
same dataset fingerprint is a no-op.
