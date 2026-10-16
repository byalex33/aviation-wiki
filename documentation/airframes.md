# Airframe pages and fleet ages

Individual aircraft are wiki articles of content type `airframe`. They use the
same draft, review, and approval flow as every other article. The public URL is
`/airframes/<registration>`, for example `/airframes/g-boac`. A manufacturer
serial number is also accepted at `/airframes/msn/<msn>` and redirects to the
current registration.

Older encyclopedia pages for a single aircraft stay at `/aircraft/<registration>`
until the article migration runs. After that, those URLs permanently redirect
to the airframe page. The article row, its prose, and its revision history are
kept. Known pages are `g-boac` and `n747na`. Any other aircraft article whose
slug is a US or UK registration and which already has a serial-number field is
moved the same way. Registration-shaped slugs without a serial are printed as
`REVIEW` and are not moved.

Airline pages and aircraft-type pages list the related tails. `/fleet` adds
operator sections for in-service, stored, on-order, and historical aircraft,
with counts and the average age of the in-service aircraft. Age uses the
delivery date when it is present, otherwise 1 January of the year of
manufacture. On-order aircraft have no age and are excluded from the average.

## Production steps

Do this from a trusted machine with a backed-up `DATABASE_URL`. None of these
commands run during `next build` or on Vercel.

```sh
npm run db:migrate:airframes
npm run db:migrate:airframes -- --apply
npm run db:migrate:airframes -- --apply --migrate-articles
```

The first command only prints the article plan. `--apply` widens the content
type and relationship checks and creates `airframe_index`. It does not rewrite
article rows. `--migrate-articles` moves the `MOVE` rows and leaves redirects
from `/aircraft/<slug>`.

To render the sample fleet locally, point `DATABASE_URL` at a local database
and run:

```sh
npm run data:seed:airframes -- --apply
```

On a brand-new local database this also creates the development schema,
including `airframe_index`. The seed refuses hosts that look like Aiven,
Vercel, or aviation.wiki. Running it again leaves the same eight records
unchanged. Production schema changes still go through the migration above,
because production does not create tables from a web request or from this seed.

`AIRFRAME_FIXTURES=true` renders the same sample records when the database is
empty. Leave it unset in production.

## FAA Releasable Aircraft Database

Source page: <https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download>

Download: <https://registry.faa.gov/database/ReleasableAircraft.zip>

The file is a work of the United States government and is not protected by
copyright under 17 U.S.C. § 105. There is no licence fee and no attribution
requirement. The FAA does say the download is a daily snapshot, not a live
register, and that permissible fields may be blank. Record the snapshot date
on the imported articles.

The importer reads `MASTER.txt`, `ACFTREF.txt`, and `DEREG.txt`. It stores the
N-number, manufacturer serial number, manufacturer and model, year of
manufacture, and a status mapped from the FAA status code:

- Valid and pending-paperwork codes become **Active**.
- Expired, canceled, revoked, and deregistered codes become **Stored**, with a
  fate note that the file does not say whether the aircraft was stored or
  scrapped.
- Reserved and unassigned N-numbers are skipped.
- **Scrapped** and **On order** are not invented from the FAA file. Editors set
  those through the normal revision flow.

Registrant names, streets, cities, states, and postal codes are personal data.
The parser never copies those columns, even for organisations. Operator history
is left for contributors.

```sh
npm run data:import:faa-airframes -- --file /path/to/ReleasableAircraft.zip
npm run data:import:faa-airframes -- --file /path/to/ReleasableAircraft.zip --limit 100 --apply
npm run data:import:faa-airframes -- --download --n-numbers N747NA --apply
```

Re-running the same snapshot is a no-op. If a person has approved an edit since
the import, that article is left unchanged.

## Local fixture check

```sh
AIRFRAME_FIXTURES=true npm run dev
```

Open `/airframes`, `/airframes/g-boac`, `/airframes/n747na`, `/airframes/msn/21441`, and `/fleet`.
