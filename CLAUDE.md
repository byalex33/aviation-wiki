# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```sh
npm ci                  # install locked dependencies
npm run dev             # start dev server at localhost:3000
npm run build           # production build (requires Clerk + DB env vars)
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm test                # all offline checks (parser, search, fleet, citations, relationships, importer, notifications, source-health, commercial-aircraft)
npm run test:db         # validate local SQLite database
```

Individual test scripts live in `scripts/` and are invoked via the aliases in `package.json` (e.g. `npm run test:citations`, `npm run test:fleet`).

## Architecture

**Runtime stack:** Next.js App Router · Clerk authentication · PostgreSQL (Neon in production) · Vercel deployment.

### Data layer

`src/lib/postgres.ts` holds the singleton `sql` connection (tagged-template postgres.js) and `ensureSchema()`, which runs DDL in development and is a no-op in production. All tables are created there — it is the source of truth for the schema.

`src/lib/wiki-public-db.ts` is the primary data module: every public read, contribution write, moderation action, fleet query, notification, and search-index build goes through it. Functions in this file call `ensureSchema()` on first use.

`src/lib/wiki-db.ts` and `src/lib/admin-db.ts` are **legacy SQLite** modules used by local test scripts and a small number of remaining fallback code paths. New features should use `wiki-public-db.ts`.

### Auth

Clerk is the identity provider. `src/lib/wiki-auth.ts` exposes `requireContributor()`, `requireModerator()`, `requireAdmin()`, and `getStaffUser()`. Roles are stored in Clerk public metadata (`{ "role": "moderator" }`). Valid roles: `contributor`, `trusted_contributor`, `moderator`, `admin`. Moderators and admins are "staff".

### Content types & revision lifecycle

Valid `ContentType` values: `airline`, `alliance`, `aircraft`, `airport`, `manufacturer`, `engine`, `event` — defined in `src/lib/wiki-types.ts`.

Revision lifecycle: `draft → verifying → pending_review → (approved | rejected | changes_requested)`. Only moderators/admins can approve. Staff submitters auto-publish. `saveDraft()` and `transitionRevision()` in `wiki-public-db.ts` drive all state changes.

### Markdown validation

`src/lib/article-markdown.ts` owns the parser (`parseArticleMarkdown`). All submitted Markdown must pass through it before being persisted — parse errors must be zero. Allowed JSX block components: `Infobox`, `Notice`, `Sidebar`, `Chart`, `Sources`, `FleetTable`, `Specifications`, `Timeline`, `Gallery`, `RelatedPages`. Source URLs are validated with `isSafeCitationUrl`.

### Server Actions vs Route Handlers

Form submissions use Next.js Server Actions in `src/app/contribute/actions.ts` and `src/app/admin/actions.ts`. Public JSON APIs use Route Handlers under `src/app/api/`. The `src/app/api/search/route.ts` and `src/app/api/fleet.json/route.ts` are the canonical Route Handler examples.

### Rate limiting

`src/lib/rate-limit.ts` provides `consumeRateLimit()` and `enforceRateLimit()` backed by the `request_rate_limits` PostgreSQL table. Every mutation route uses it. Use `anonymousRateLimitSubject(request)` for unauthenticated callers (hashes the IP via `x-vercel-forwarded-for`).

### SEO / metadata

`src/lib/seo.ts` — `publicArticleMetadata()`, `articleDescription()`, `articleImageDetails()`, `jsonLd()`, `siteUrl`.
`src/lib/article-seo.ts` — alternative `generateArticleMetadata()` with richer description extraction; `articleDescription()` here takes a `RevisionRecord`, not a string.
`src/lib/site.ts` — `SITE_NAME`, `SITE_URL`, `SITE_DESCRIPTION`, `absoluteUrl()`.

Slug pages (`src/app/aircraft/[slug]/page.tsx` etc.) use `publicArticleMetadata` from `seo.ts`. Layout-level metadata is set in `src/app/layout.tsx`.

### Environment variables

Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`.
Optional: `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`), `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, `CRON_SECRET`, `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `INDEXNOW_KEY`, `AVIATION_WIKI_DB_PATH`.

The `CRON_SECRET` bearer token protects `/api/cron/*` endpoints. `vercel.json` schedules the daily source-health cron.
