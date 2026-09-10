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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the review process, and how
contributions are licensed. All participation is covered by the
[Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately per
[SECURITY.md](SECURITY.md).

## Licensing

The software is licensed under [GNU AGPL v3](LICENSE); see [NOTICE](NOTICE) for the copyright notice. Original project-authored editorial content and imported third-party data/media have separate terms described in [CONTENT-LICENSE.md](CONTENT-LICENSE.md).

By contributing code, you agree to license it under AGPL-3.0-only. By contributing original editorial content, you agree to license it under CC BY-SA 4.0.

### Audit regression tests

`npm test` includes fleet date/status, CSV, article link, image policy, search, and source URL regressions. `npm run test:postgres` exercises editorial races, notification storage/delivery, and account API limits against a disposable local PostgreSQL database. Set `NODE_ENV=development` and `DATABASE_URL` to a loopback database named `audit_*` or `test_*`. These tests create their own fixtures. CI provisions PostgreSQL for them.

The notification digest runs daily at 06:00 UTC via the authenticated `/api/notifications/digest` cron route. Configure `CRON_SECRET` and email delivery settings for the deployment.
## On this day in aviation

`GET /api/v1/on-this-day` returns today's aviation anniversaries in UTC.
Use `?date=12-17` for another calendar day. No key is required and browser
requests from other origins are supported. The page at `/on-this-day` uses
the same approved event articles. See `/api-docs#on-this-day` and
`/openapi.json` for the response format. Dates without entries return an
empty list; this is not a complete historical calendar.

### Get source material

Wikipedia's [aviation anniversary calendar](https://en.wikipedia.org/wiki/Portal:Aviation/Anniversaries)
provides date-specific event lists. Fetch a day through the MediaWiki API:

```sh
node --import tsx scripts/fetch-aviation-anniversaries.ts 09-10 /tmp/aviation-september-10.json
```

The command saves the original wikitext with its revision URL, attribution
and CC BY-SA 4.0 license. It refuses to overwrite an existing file. This is
a source download, not an automatic publisher or a scheduled feed.

Check each candidate against its linked article and primary sources, remove
duplicate events, and distinguish exact dates from date ranges. For example,
the September 10 source lists the 1976 Zagreb collision twice. Write a full
event article with a concise title and introduction, citations, and an
`Event date` field in `YYYY-MM-DD` format. Submit it through the existing
contributor review workflow. Approved articles automatically appear in both
the calendar and API. Retain the applicable attribution and share-alike
license when adapting Wikipedia text; source images have their own licenses.

NASA History, the Smithsonian National Air and Space Museum, and manufacturer
archives are useful primary references for checking and expanding candidates.
The public API reads our published articles, so upstream outages do not remove
previously published events.

Three original, primary-source starter articles can be validated with:

```sh
node --conditions=react-server --import tsx scripts/publish-aviation-history.ts
```

An operator can publish these to the configured database by adding
`--env-file-if-exists=.env.local` to the Node options and `--publish` after
the script path. Existing articles and drafts with those slugs are skipped.
