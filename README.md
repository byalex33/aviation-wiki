# aviation.wiki

An open aviation encyclopedia built around sourced articles, public revision history, and moderator-reviewed contributions.

## How it works

- Visitors can browse and search approved articles without an account.
- Clerk-authenticated contributors create drafts and submit revisions.
- Submitted revisions pass through verification and moderator review before becoming public.
- Administrators can manage articles, contributors, imports, sources, notifications, and the audit log.
- Wikidata and compatible Wikimedia Commons media can seed private import drafts; imports never publish automatically.

## Requirements

- Node.js 20.9.x or 22 and newer
- npm
- A PostgreSQL database (Aiven is used in production)
- A Clerk application

Resend, Vercel Cron, IndexNow, and search-engine verification are optional.

## Local development

1. Install the locked dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   DATABASE_URL=
   DATABASE_POOL_SIZE=1
   ```

3. Start the application:

   ```sh
   npm run dev
   ```

4. Open <http://localhost:3000>. The first database-backed request in development creates the PostgreSQL schema and seeds the built-in F-15 article. The database role therefore needs schema-creation permission for initial setup.

Do not commit `.env.local` or other populated `.env*` files.

## Accounts and roles

New Clerk users are contributors by default. Assign staff access through Clerk user public metadata:

```json
{ "role": "moderator" }
```

Supported roles are `contributor`, `trusted_contributor`, `moderator`, and `admin`. Only moderators and administrators can publish revisions; administrator-only tools include user roles and data imports.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk application key |
| `CLERK_SECRET_KEY` | Server-side Clerk key |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | Connections per server instance; defaults to `1` |
| `AVIATION_WIKI_DB_PATH` | Optional path for the legacy SQLite moderation/test store |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL; defaults to `http://localhost:3000` |
| `RESEND_API_KEY` | Optional notification email delivery |
| `NOTIFICATION_EMAIL_FROM` | Verified sender used by Resend |
| `CRON_SECRET` | Bearer token protecting scheduled endpoints |
| `GOOGLE_SITE_VERIFICATION` | Optional Google ownership token |
| `BING_SITE_VERIFICATION` | Optional Bing ownership token |
| `INDEXNOW_KEY` | Optional IndexNow submission key |

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and fixed at build time. All other variables are server-only.

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/app` | Next.js App Router pages, Route Handlers, metadata, and Server Actions |
| `src/components` | Article, revision, search, notification, and interface components |
| `src/lib/wiki-public-db.ts` | PostgreSQL-backed public, contribution, moderation, and administration operations |
| `src/lib/postgres.ts` | PostgreSQL connection and development schema bootstrap |
| `src/lib/wiki-db.ts`, `admin-db.ts`, `notification-db.ts` | Legacy SQLite implementation used by local checks and remaining fallback paths |
| `src/lib/import-providers` | Wikidata and Wikimedia Commons import previews |
| `scripts` | Runnable integrity checks, parser tests, and controlled publishing scripts |

PostgreSQL is the durable production store. SQLite defaults to `.data/aviation-wiki.db` locally and `/tmp/aviation-wiki.db` on Vercel; the Vercel fallback is ephemeral and must not hold durable production data.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

`npm test` runs the service-independent parser, rendering, import, notification, relationship, search, fleet, source-health, and seed-content checks. `npm run test:db` separately validates an existing local SQLite database.

Pull requests run the service-independent checks in GitHub Actions. A production build needs configured Clerk and PostgreSQL services, so run it in the deployment environment or locally with `.env.local`.

## Deployment

The application is configured for Vercel. Before the first production deployment:

1. Initialise the PostgreSQL schema from a trusted development environment using the production database URL.
2. Configure the required Clerk and database environment variables.
3. Add optional email and search-discovery variables as needed.
4. Set a random `CRON_SECRET`; `vercel.json` schedules the daily source-health endpoint.

Production mode intentionally does not run schema DDL during requests.

See [DATABASE-OPERATIONS.md](DATABASE-OPERATIONS.md) for the production database configuration, backup, migration, and rollback procedure.

## Licensing

The software is licensed under [GNU AGPL v3](LICENSE). Original project-authored editorial content and imported third-party data/media have separate terms described in [CONTENT-LICENSE.md](CONTENT-LICENSE.md).

By contributing code, you agree to license it under AGPL-3.0-only. By contributing original editorial content, you agree to license it under CC BY-SA 4.0.
