# Contributing to aviation.wiki

Thanks for your interest in improving aviation.wiki. This document covers how to
set up the project, what the review process expects, and how contributions are
licensed.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Code** — bug fixes, features, tests, documentation, accessibility and
  performance work.
- **Editorial content** — articles are contributed through the running
  application, not through pull requests. Sign in as a contributor, draft an
  article, and submit it for moderator review.
- **Bug reports and ideas** — open an issue. For anything security-related, read
  [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

Requirements: Node.js 20.9+ or 22+, npm, a PostgreSQL database, and a Clerk
application (a free development instance is fine).

```sh
npm ci
cp .env.example .env.local     # then fill in the values below
npm run dev                    # http://localhost:3000
```

Minimum `.env.local`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
DATABASE_POOL_SIZE=1
```

The first database-backed request in development creates the schema and seeds the
built-in article, so the database role needs schema-creation permission for
initial setup. See [README.md](README.md#environment-variables) for the full list
of environment variables and [DATABASE-OPERATIONS.md](DATABASE-OPERATIONS.md) for
production database procedures.

If `next dev` rejects requests from another device on your network, add that
origin to `allowedDevOrigins` in `next.config.ts` locally (do not commit it).

## Before you open a pull request

Run the same checks CI runs:

```sh
npm run lint
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
```

A production `next build` needs configured Clerk and PostgreSQL services, so run
it locally with `.env.local` or rely on the preview deployment.

Guidelines:

- Keep pull requests focused. One concern per PR; split unrelated changes.
- Match the surrounding code — naming, comment density, and idiom. `src/lib` is
  where data access lives; `wiki-public-db.ts` is the primary module and
  `wiki-db.ts` / `admin-db.ts` are legacy SQLite paths kept only for local
  checks.
- All submitted Markdown must pass `parseArticleMarkdown` with zero errors.
- Every mutation route uses `consumeRateLimit` / `enforceRateLimit`.
- Authorization lives in each page and Server Action, not only in middleware.
- Read the relevant guide in `node_modules/next/dist/docs/` before changing
  routing, rendering, or caching behavior — this project tracks a recent Next.js
  release whose conventions differ from older versions.

## Test coverage

Coverage is deliberately deep on the logic-heavy modules — the Markdown parser,
search ranking, citations, relationships, fleet derivation, the importer, and
notifications all have dedicated suites under `scripts/`. Route handlers, React
components, and Server Actions are currently covered only indirectly through the
production build and type checking. New behavior in those areas is easier to
review with a focused test alongside it, even a small one.

## Commit and PR conventions

- Write imperative, present-tense commit subjects ("Add", "Fix", "Cache"), not
  past tense.
- Reference the issue a PR closes in the description.
- Rebasing to keep history readable is welcome; force-pushing your own PR branch
  is fine.

## Licensing of contributions

- **Code** you contribute is licensed under
  [AGPL-3.0-only](LICENSE), the same as the rest of the software.
- **Original editorial content** you contribute is licensed under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Imported third-party data and media keep their own terms; see
  [CONTENT-LICENSE.md](CONTENT-LICENSE.md).

Opening a pull request or submitting content through the application constitutes
agreement to these terms. You confirm that you have the right to contribute the
material and to license it as above.
