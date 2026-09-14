<p align="center">
  <img src="public/aviation-wiki-logo.svg" width="72" height="72" alt="aviation.wiki logo">
</p>

<h1 align="center">aviation.wiki</h1>

<p align="center">An open aviation encyclopedia with sourced articles and public revision history.</p>

<p align="center">
  <a href="https://aviation.wiki">Explore the encyclopedia</a> ·
  <a href="https://aviation.wiki/contribute">Write an article</a> ·
  <a href="https://aviation.wiki/api-docs">API documentation</a>
</p>

<p align="center">
  <a href="https://github.com/byalex33/aviation-wiki/actions/workflows/ci.yml"><img src="https://github.com/byalex33/aviation-wiki/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-AGPL--3.0-blue" alt="Code license: AGPL-3.0-only"></a>
</p>

## Explore aviation

Browse aircraft, airlines, airports, manufacturers, engines, and alliances. Compare aircraft, explore fleet and registration records, or look up events from aviation history.

- Read and search published articles without an account.
- Follow citations and public revision histories to see where information came from.
- Sign in to draft articles and submit changes for verification and moderator review.
- Use public fleet exports and the aviation anniversary API in your own projects.

Built with Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, and Clerk.

## Run locally

You need Node.js matching `^20.9.0 || >=22.0.0`, npm, PostgreSQL, and a Clerk application.

```sh
git clone https://github.com/byalex33/aviation-wiki.git
cd aviation-wiki
npm ci
cp .env.example .env.local
```

Set the Clerk keys and `DATABASE_URL` in `.env.local`, then run `npm run dev` and open [localhost:3000](http://localhost:3000). The first database-backed development request creates the schema, so use a database role with schema-creation permission.

See the [development guide](documentation/development.md) for environment variables, roles, architecture, checks, and deployment.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Contributing](CONTRIBUTING.md) | Code changes, editorial contributions, and pull requests |
| [Development and operations](documentation/development.md) | Local setup, tests, deployment, and aviation history publishing |
| [Database operations](DATABASE-OPERATIONS.md) | Production configuration, backups, migrations, and recovery |
| [Aviation data model](AVIATION-DATA-MODEL.md) | Airframes, registrations, fleet projections, and imports |
| [Security](SECURITY.md) | Private vulnerability reporting |

Found a bug or have an idea? [Open an issue](https://github.com/byalex33/aviation-wiki/issues/new/choose). Submit articles through the [encyclopedia](https://aviation.wiki/contribute). Participation follows our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Code is licensed under [AGPL-3.0-only](LICENSE). Original editorial contributions use CC BY-SA 4.0; imported data and media retain their own terms. See the [content license](CONTENT-LICENSE.md), [third-party notices](THIRD_PARTY_NOTICES.md), and [copyright notice](NOTICE).
