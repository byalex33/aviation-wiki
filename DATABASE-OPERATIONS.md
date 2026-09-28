# Database operations

> This file is a runbook. It must never contain connection strings, passwords,
> project identifiers, or other account-specific secrets — keep those in the
> password manager and in Vercel's encrypted environment variables.

## Production

Before deploying the Pro tools, run `npm run db:migrate:pro` to inspect the additive migration, then `npm run db:migrate:pro -- --apply` with the intended database environment. It creates private saved collections, their article memberships, and per-article watch preferences. Existing watches and notification preferences are preserved. Development schema initialization includes these tables; production requests do not create them.

Pro entitlement comes from Clerk `publicMetadata.pro === true`; moderators and admins also receive the tools. Only trusted server/admin operations may set it. Checkout remains disabled. Email delivery requires `RESEND_API_KEY` and `NOTIFICATION_EMAIL_FROM`; daily digests also require the existing authenticated cron schedule.

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

## Notification digest recovery

Before deploying the digest recovery code, apply its additive schema to both production and any separate preview database. Use the configured database environment without writing credentials into repository files:

```sh
npm run db:migrate:notification-digests
npm run db:migrate:notification-digests -- --apply
```

The first command describes the migration without connecting. The second creates `notification_digest_batches`, `notification_digest_items`, `notification_immediate_deliveries`, and their indexes in one transaction. It is safe to repeat and does not update existing notifications. Development initialization includes the same schema automatically. Application requests do not create these tables in production.

The daily route persists each batch's notification IDs and exact recipient, sender, subject, and body before requesting delivery. Recovery runs hourly, reclaims leases after five minutes, and sends the saved payload with its original idempotency key. Completion updates the batch and every member delivery in one transaction. Immediate delivery cannot claim a digest-owned notification.

Resend retains idempotency keys for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys). Automatic retries stop after 23 hours from the first attempt, leaving a safety margin. Batches with changed preferences, changed verified recipients, or mismatched provider payloads are also held. A provider outage can therefore leave a batch requiring investigation instead of risking a duplicate. The recovery endpoint only retries existing batches; it does not create extra daily messages.

New immediate attempts carry a permanent provenance marker, so switching preferences to daily cannot classify them as legacy digests. Pre-upgrade pending/failed deliveries have no saved batch body or original-delivery marker. After 15 minutes, unknown attempts for daily-email users are held for investigation. Their original provider request or delivery mode cannot be reconstructed safely. Failures and held deliveries appear in admin notification diagnostics without exposing email addresses or contents. Check the provider record before deciding whether any manual follow-up is appropriate; do not reset a held batch or generate a new idempotency key blindly.

The saved payload contains email addresses and message text. Keep it within the database's existing access controls and backups. Rollback can leave the additive tables in place, but pause both digest schedules before rolling back to code that does not understand batch ownership. Old code must not resume digest or immediate retries against these reservations. No destructive down migration is provided.
