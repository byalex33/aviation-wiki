# Site audit remediation

This change addresses the September 2026 audit of the public site and its editorial, notification, and API paths. It starts from `8bb0474` and keeps the separate on-this-day API work out of this branch.

| Finding | Change | Regression coverage |
| --- | --- | --- |
| F01 | Upgrade the sharp override to 0.35.4. | Production npm audit. |
| F02 | Carry the displayed revision ID into the first save; reject stale submission. | PostgreSQL editorial test and editor rendering test. |
| F03 | Use PostgreSQL for notifications, watches, preferences, read state and delivery tracking when configured. | Actual service, bell API and digest tests against PostgreSQL, with mocked mail. |
| F04 | Match curated airlines using stable IATA and ICAO identity. | Directory regression fixtures. |
| F05 | Navigate country filters through the Next router. | Browser filter and history checks. |
| F06 | Add the local Clerk sign-in route used by protected pages. | Route and signed-out browser checks. |
| F07 | Bind search results and direct-hit navigation to the exact active query. | Search regression coverage and browser query switching. |
| F08 | Normalize flag markup and country aliases before indexing and filtering. | Country/search fixtures. |
| F09 | Correct legacy namespaces and known aliases; remove links to absent articles at rendering; validate new publication links. | Link rendering and PostgreSQL publication tests. |
| F10 | Respect service-date field priority; do not substitute first flight. | Fleet tests with reversed field order. |
| F11 | Separate current, former and planned fleet mentions. | Fleet prose and mixed-status fixtures. |
| F12 | Default graph projections to the current UTC date. | Expired registration regression. |
| F13 | Ignore future events when deriving current status. | Explicit before/after date tests. |
| F14 | Derive operator history membership from accepted, undisputed projected facts. | Rejected and conflicted association tests. |
| F15 | Lock and load the entire revision before validating and publishing it. | Synchronized PostgreSQL row-lock race test. |
| F16 | Record moderation audits in the same PostgreSQL transaction as publication/status changes. | Audit visibility and rollback tests. |
| F17 | Preserve content type in editor return URLs. | Same-slug type and UI tests. |
| F18 | Show the original base and latest publication beside the draft; require explicit reconciliation before resubmission. | Stale draft/live races and editor controls. |
| F19 | Honor archive, protection, lock and redirect controls during directory initialization. | Each restriction tested against PostgreSQL. |
| F20 | Normalize non-public addresses and pin validated DNS addresses for each source-check connection and redirect. | Address, DNS pinning and redirect tests. |
| F21 | Share draft allowance across an account's keys; cap active keys and throttle key mutations. | Concurrent key creation and actual multi-key draft requests against PostgreSQL. |
| F22 | Export spreadsheet-sensitive CSV values as literal text. | Formula prefixes, controls, quoting and ordinary text. |
| F23 | Share one image-host policy between validation, CSP and image configuration. | Image policy and citation tests. |
| F24 | Render Markdown table headers as scoped header cells. | Server-rendered table assertions. |

The smaller accessibility and operations observations are also addressed: missing articles use `notFound`, matching duplicate article titles are suppressed, the layout includes a skip link, search exposes combobox state and tolerates unavailable storage, and the authenticated notification digest runs at 06:00 UTC daily.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:postgres`, and `npm audit --omit=dev --audit-level=high`. CI runs these checks with a disposable PostgreSQL 18 service. PostgreSQL tests require a loopback test database and development mode. They do not use deployment credentials or send email.

Local checks use synthetic and repository-owned fixtures. They do not change live editorial records or migrate the production database. Production latency must be measured after deployment; local development timings are not evidence of production improvement.

The interrupted-digest defect in [issue #28](https://github.com/byalex33/aviation-wiki/issues/28) is covered by durable batch identity, leases, hourly recovery, and process-termination regression tests. See DATABASE-OPERATIONS.md for deployment and held-delivery handling.
