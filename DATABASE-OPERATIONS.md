# Database operations

> This file is a runbook. It must never contain connection strings, passwords,
> project identifiers, or other account-specific secrets — keep those in the
> password manager and in Vercel's encrypted environment variables.

## Production

- Provider: Aiven for PostgreSQL (managed), Free tier — 20 connections.
- Region: EU (DigitalOcean Amsterdam).
- Application connection limit: `DATABASE_POOL_SIZE=1` per server instance.
  Serverless instances each open their own pool, so keep this at one connection
  and rely on the cached public-search index to absorb read traffic.
- Vercel stores the production connection string in the encrypted `DATABASE_URL`
  environment variable. The operator keeps a local copy in their password
  manager, never on disk.

## Migrating providers

The production database was migrated from Neon to Aiven on 2026-08-28. The
restore was verified against all 19 source tables before the old provider was
downgraded. Keep a custom-format dump and its restore manifest outside the
repository (an encrypted backup volume), and record the dump checksum in the
password manager alongside the connection string.

## Restore

Restore into an empty PostgreSQL database with PostgreSQL 18 client tools:

```sh
pg_restore \
  --dbname="$DATABASE_URL" \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-acl \
  aviation-wiki.dump
```

Confirm table row counts, run `npm run build` against the restored database,
deploy, and validate the homepage, a known article, and `/api/search` before
changing or retiring the previous database.

## Rollback

If the current provider fails during a migration rollback window:

1. Update Vercel's production `DATABASE_URL` to the previous provider's
   connection string.
2. Redeploy the last known-good application revision.
3. Check the homepage, a known article, and `/api/search`.
4. Inspect production runtime logs for database errors.

Keep the previous provider available as a temporary rollback source. Do not
delete it until the new deployment has been stable for an agreed retention
period and the external dump has been independently backed up.
