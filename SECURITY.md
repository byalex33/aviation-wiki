# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public issue, pull
request, or discussion for anything that could be exploited.

- Preferred: use GitHub's [private vulnerability reporting](https://github.com/byalex33/aviation-wiki/security/advisories/new)
  ("Report a vulnerability" on the Security tab).
- Alternative: email **hello@byalex.gg** with the details.

Please include:

- a description of the issue and its impact,
- steps to reproduce, or a proof of concept,
- affected routes, files, or versions,
- any suggested remediation.

You will get an acknowledgement within a few days. Once a fix is available and
deployed, we are happy to credit you in the release notes unless you prefer to
stay anonymous.

## Scope

In scope:

- Authentication and authorization bypass (contributor, moderator, admin
  boundaries).
- Injection, XSS, or sandbox escapes in the article Markdown pipeline
  (`src/lib/article-markdown.ts`).
- SQL injection or data exposure through `src/lib/wiki-public-db.ts` and the
  Route Handlers under `src/app/api/`.
- Rate-limit bypass on mutation endpoints.
- API-key handling (`src/lib/api-keys.ts`) and the external drafts API
  (`src/app/api/v1/drafts`).
- Secret exposure or CSP/headers weaknesses.

Out of scope:

- Vulnerabilities in third-party services (Clerk, the database provider, Vercel)
  — report those to the respective vendor.
- Denial of service through traffic volume alone.
- Findings that require a compromised moderator or admin account.
- Automated scanner output without a demonstrated impact.

## Supported versions

This project deploys from `main`. Security fixes land on `main` and are deployed;
there are no separately maintained release branches.
