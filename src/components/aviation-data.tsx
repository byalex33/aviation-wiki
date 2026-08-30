import { AlertTriangle, CheckCircle2, Database, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type {
  AirframeProjection,
  GraphSource,
} from "@/lib/aviation-data-projections";

export type AviationCompleteness = {
  totalAirframes: number;
  msnsKnown: number;
  registrationHistoriesComplete: number;
  deliveryDatesCanonical: number;
  configurationsKnown: number;
  photosKnown: number;
  unresolvedConflicts: number;
  lastReconciledAt: string | null;
};

export function aviationDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function CompletenessPanel({ data }: { data: AviationCompleteness }) {
  const metrics = [
    ["MSNs known", `${data.msnsKnown}/${data.totalAirframes}`],
    [
      "Registration histories",
      `${data.registrationHistoriesComplete}/${data.totalAirframes}`,
    ],
    [
      "Canonical deliveries",
      `${data.deliveryDatesCanonical}/${data.totalAirframes}`,
    ],
    [
      "Configurations",
      `${data.configurationsKnown}/${data.totalAirframes}`,
    ],
    ["Licensed photos", `${data.photosKnown}/${data.totalAirframes}`],
  ];
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs" aria-labelledby="data-completeness">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Database className="size-4" /> Data health
          </p>
          <h2 id="data-completeness" className="mt-2 text-xl font-semibold">
            Completeness and reconciliation
          </h2>
        </div>
        <Badge variant={data.unresolvedConflicts ? "destructive" : "secondary"}>
          {data.unresolvedConflicts} unresolved {data.unresolvedConflicts === 1 ? "conflict" : "conflicts"}
        </Badge>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Last reconciled {aviationDate(data.lastReconciledAt)}. Conflicting claims remain visible until a reviewer resolves them.
      </p>
    </section>
  );
}

function AirframeCard({ airframe }: { airframe: AirframeProjection }) {
  const delivery = airframe.events.find((event) => event.type === "delivered");
  return (
    <article className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/airframes/${airframe.publicId}`} className="article-link text-lg font-semibold">
            {airframe.currentRegistration?.registration ?? airframe.publicId}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            MSN {airframe.msn ?? "unknown"} · {airframe.model?.designation ?? "Model unknown"}
          </p>
        </div>
        <Badge variant={airframe.conflicts.length ? "destructive" : "secondary"}>
          {airframe.conflicts.length ? <AlertTriangle /> : <CheckCircle2 />}
          {airframe.conflicts.length ? "Review" : airframe.status.replaceAll("_", " ")}
        </Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted-foreground">Operator</dt><dd className="mt-1 font-medium">{airframe.currentOperator?.name ?? "Unknown"}</dd></div>
        <div><dt className="text-muted-foreground">Delivered</dt><dd className="mt-1 font-medium">{aviationDate(delivery?.occurredOn)}</dd></div>
      </dl>
    </article>
  );
}

export function AirframeCards({ airframes }: { airframes: AirframeProjection[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {airframes.map((airframe) => <AirframeCard key={airframe.id} airframe={airframe} />)}
    </div>
  );
}

export function SourceList({ sources }: { sources: GraphSource[] }) {
  const unique = [...new Map(sources.map((source) => [source.id, source])).values()];
  return (
    <ol className="space-y-3">
      {unique.map((source, index) => (
        <li key={source.id} className="flex gap-3 text-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs">{index + 1}</span>
          <div className="min-w-0">
            <a href={source.url} target="_blank" rel="noreferrer" className="article-link inline-flex items-center gap-1 font-medium">
              {source.title}<ExternalLink className="size-3" />
            </a>
            <p className="mt-0.5 text-muted-foreground">{source.publisher} · retrieved {aviationDate(source.retrievedAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
