import Link from "next/link";

import { airframeStatusLabel, type AirframeRecord, type FleetTypeGroup, type OperatorFleetSummary } from "@/lib/airframe-record";

function formatAge(age: number | null) {
  return age === null ? "not recorded" : `${age.toFixed(1)} years`;
}

function TailList({ tails }: { tails: AirframeRecord[] }) {
  const visible = tails.slice(0, 24);
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {visible.map((tail) => (
        <li key={tail.slug}>
          <Link href={tail.href} className="article-link inline-flex min-h-9 items-center rounded-lg border bg-background px-3 font-mono text-sm font-semibold">
            {tail.registration}
          </Link>
        </li>
      ))}
      {tails.length > visible.length && (
        <li className="inline-flex min-h-9 items-center text-sm text-muted-foreground">
          and {tails.length - visible.length} more
        </li>
      )}
    </ul>
  );
}

function TypeGroups({ groups }: { groups: FleetTypeGroup[] }) {
  if (!groups.length) return <p className="mt-3 text-sm text-muted-foreground">None recorded.</p>;
  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => (
        <article key={group.type} className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">
              {group.typeHref ? <Link href={group.typeHref} className="article-link">{group.type}</Link> : group.type}
            </h3>
            <p className="text-sm text-muted-foreground">
              {group.count} {group.count === 1 ? "tail" : "tails"}
              {group.averageAgeYears !== null ? ` · average ${formatAge(group.averageAgeYears)}` : ""}
            </p>
          </div>
          <TailList tails={group.tails} />
        </article>
      ))}
    </div>
  );
}

function FleetBucket({
  title,
  count,
  groups,
}: {
  title: string;
  count: number;
  groups: FleetTypeGroup[];
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">{count}</span>
      </div>
      <TypeGroups groups={groups} />
    </section>
  );
}

export function OperatorFleet({ summary }: { summary: OperatorFleetSummary }) {
  return (
    <section className="mt-8" aria-labelledby={`fleet-${summary.operatorSlug}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Airframe fleet</p>
          <h2 id={`fleet-${summary.operatorSlug}`} className="mt-1 text-2xl font-semibold">
            {summary.operatorHref ? <Link href={summary.operatorHref} className="article-link">{summary.operatorName}</Link> : summary.operatorName}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          In service {summary.inServiceCount} · Average fleet age {formatAge(summary.averageAgeYears)}
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        <FleetBucket title="In service" count={summary.inServiceCount} groups={summary.inService} />
        <FleetBucket title="Stored" count={summary.storedCount} groups={summary.stored} />
        <FleetBucket title="On order" count={summary.onOrderCount} groups={summary.onOrder} />
        <FleetBucket title="Historical" count={summary.historicalCount} groups={summary.historical} />
      </div>
    </section>
  );
}

export function OperatorFleetList({ summaries }: { summaries: OperatorFleetSummary[] }) {
  if (!summaries.length) return null;
  return (
    <div className="mt-10 space-y-12">
      {summaries.map((summary) => <OperatorFleet key={summary.operatorSlug} summary={summary} />)}
    </div>
  );
}

export function TypeAirframeList({
  title,
  records,
}: {
  title: string;
  records: AirframeRecord[];
}) {
  if (!records.length) return null;
  const active = records.filter((record) => record.status === "active");
  return (
    <section className="mb-8 rounded-2xl border bg-card p-5" aria-labelledby="type-airframes">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Individual aircraft</p>
          <h2 id="type-airframes" className="mt-1 text-2xl font-semibold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{records.length} airframes · {active.length} in service</p>
      </div>
      <ul className="mt-4 divide-y">
        {records.slice(0, 40).map((record) => (
          <li key={record.slug} className="flex flex-wrap items-baseline justify-between gap-3 py-3 text-sm">
            <Link href={record.href} className="article-link font-mono text-base font-semibold">{record.registration}</Link>
            <span className="text-muted-foreground">
              {record.msn ? `MSN ${record.msn}` : "MSN not recorded"} · {airframeStatusLabel(record.status)}
              {record.currentOperatorName ? ` · ${record.currentOperatorName}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {records.length > 40 && <p className="mt-2 text-sm text-muted-foreground">{records.length - 40} more airframes are in the index.</p>}
    </section>
  );
}
