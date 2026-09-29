# Project scripts

Run commands from the repository root. The aliases in [package.json](../package.json)
set the Node options each script needs.

## Tests

`npm test` runs these offline groups in order:

| Command | Checks |
| --- | --- |
| `npm run test:content` | Articles, search, citations, relationships, history, feeds and imports |
| `npm run test:data` | Aviation records, fleet projections, reconciliation and CSV |
| `npm run test:ui` | Charts, routes, authentication and editorial UI |
| `npm run test:services` | Notifications, source health, analytics and Pro donations |

Existing individual aliases such as `npm run test:auth-ui` still work.
`npm run test:postgres` separately exercises a disposable PostgreSQL database.
See [development](../documentation/development.md) for its required environment.

## Database and content operations

- `migrate-*.ts` contains additive database migrations. Review the relevant
  [database procedure](../documentation/database-operations.md) before applying them.
- `import-*.ts`, `reconcile-*.ts`, and `backfill-*.ts` import or reconcile data.
  The aviation history backfill defaults to a dry run; `--snapshot` uses the
  checked excerpts in `data/aviation-history.json`.
- `publish-*.ts` validates prepared articles by default and publishes only with
  `--publish`. `add-alliance-images.ts` also requires `--publish` to write changes.
- `fetch-aviation-anniversaries.ts` downloads source material for editorial review.
- `submit-indexnow.mjs` submits URLs to IndexNow.

Check each command's flags before running it against production. Operational
scripts are kept separate from the application under `src/`; test aliases never
enable their publishing flags.
