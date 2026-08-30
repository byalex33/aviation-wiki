import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock3, Database, Plane } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { aviationDate, SourceList } from "@/components/aviation-data";
import { Badge } from "@/components/ui/badge";
import { getAirframeProjection } from "@/lib/aviation-data-public";
import type { GraphSource } from "@/lib/aviation-data-projections";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const airframe = await getAirframeProjection((await params).id);
  if (!airframe) return { title: "Airframe not found", robots: { index: false } };
  const registration = airframe.currentRegistration?.registration ?? airframe.publicId;
  const title = `${registration} — ${airframe.model?.designation ?? "airframe"}`;
  return {
    title,
    description: `${registration}, MSN ${airframe.msn ?? "unknown"}: registration, operator, configuration, event history, and cited evidence.`,
    alternates: { canonical: `/airframes/${airframe.publicId}` },
    openGraph: { title, url: `/airframes/${airframe.publicId}`, type: "website" },
  };
}

function claimDate(value: unknown) {
  if (!value || typeof value !== "object" || !("occurredOn" in value)) return "Claimed value";
  return aviationDate(String(value.occurredOn));
}

function configuration(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as { totalSeats?: number; engines?: string; classes?: Record<string, number> };
}

export default async function AirframePage({ params }: { params: Params }) {
  const airframe = await getAirframeProjection((await params).id);
  if (!airframe) notFound();
  const registration = airframe.currentRegistration?.registration ?? airframe.publicId;
  const config = configuration(airframe.currentConfiguration?.configuration);
  const sources: GraphSource[] = [
    ...airframe.registrationHistory.flatMap((item) => item.sources),
    ...airframe.events.flatMap((item) => item.sources),
    ...(airframe.currentConfiguration?.sources ?? []),
    ...airframe.media.flatMap((item) => item.sources),
    ...airframe.conflicts.flatMap((conflict) => conflict.claims.flatMap((claim) => claim.sources)),
  ];
  const json = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${registration} — ${airframe.model?.designation ?? "aircraft"}`,
    url: absoluteUrl(`/airframes/${airframe.publicId}`),
    vehicleIdentificationNumber: airframe.msn ?? undefined,
    vehicleConfiguration: airframe.model?.designation ?? undefined,
    manufacturer: airframe.manufacturer ? { "@type": "Organization", name: airframe.manufacturer.name } : undefined,
    image: airframe.media[0]?.imageUrl,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-7 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link> / <Link href="/airframes" className="article-link">Airframes</Link> / {registration}</nav>
        <header className="rounded-2xl border bg-card p-5 shadow-xs sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Badge variant="secondary"><Plane /> Individual airframe</Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{registration}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{airframe.manufacturer?.name} {airframe.model?.designation} · MSN {airframe.msn}</p>
            </div>
            <Badge variant={airframe.conflicts.length ? "destructive" : "secondary"} className="h-7 px-3">
              {airframe.conflicts.length ? <AlertTriangle /> : <CheckCircle2 />}
              {airframe.conflicts.length ? "Needs reconciliation" : "Canonical record"}
            </Badge>
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-3 border-t pt-6 lg:grid-cols-4">
            {[["Stable ID", airframe.publicId], ["Operator", airframe.currentOperator?.name ?? "Unknown"], ["Status", airframe.status.replaceAll("_", " ")], ["Country", airframe.currentRegistration?.countryCode ?? "Unknown"]].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl bg-muted/45 p-3"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>
            ))}
          </dl>
        </header>

        <section className="mt-6 overflow-hidden rounded-2xl border bg-card" aria-labelledby="airframe-photos">
          <div className="p-5"><h2 id="airframe-photos" className="text-xl font-semibold">Photographs</h2></div>
          {airframe.media.length ? airframe.media.map((item, index) => (
            <figure key={item.id}>
              <Image src={item.imageUrl} alt={item.caption ?? `${registration} aircraft`} width={1920} height={1280} loading={index === 0 ? "eager" : "lazy"} className="aspect-[3/2] w-full object-cover" sizes="(max-width: 1100px) 100vw, 1100px" />
              <figcaption className="flex flex-wrap justify-between gap-2 border-t p-4 text-xs text-muted-foreground"><span>{item.caption}</span><span>© {item.creator} · <a href={item.licenceUrl} target="_blank" rel="noreferrer" className="article-link">{item.licence}</a> · <a href={item.sourcePage} target="_blank" rel="noreferrer" className="article-link">source</a></span></figcaption>
            </figure>
          )) : <p className="border-t p-5 text-sm text-muted-foreground">No licensed photograph has been linked to this airframe yet.</p>}
        </section>

        {airframe.conflicts.map((conflict) => (
          <section key={conflict.id} className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5" aria-labelledby={`conflict-${conflict.id}`}>
            <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" /><div><p className="text-xs font-semibold uppercase tracking-wide text-destructive">Unresolved source conflict</p><h2 id={`conflict-${conflict.id}`} className="mt-1 text-xl font-semibold">Delivery date has competing claims</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Neither date is used as canonical until an aviation.wiki reviewer records a resolution.</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {conflict.claims.map((claim) => (
                <article key={claim.id} className="rounded-xl border bg-background p-4">
                  <p className="text-2xl font-semibold">{claimDate(claim.value)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Confidence {claim.confidence}% · {claim.reviewStatus}</p>
                  {claim.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="article-link mt-2 block text-sm font-medium">{source.publisher}: {source.title}</a>)}
                </article>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">Case {conflict.id}</p>
          </section>
        ))}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="registration-timeline">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Clock3 className="size-4" /> Temporal identity</p>
              <h2 id="registration-timeline" className="mt-2 text-2xl font-semibold">Registration history</h2>
              <ol className="mt-5 space-y-4 border-l pl-5">
                {airframe.registrationHistory.map((item) => (
                  <li key={item.id} className="relative"><span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary" /><div className="flex flex-wrap items-baseline justify-between gap-2"><Link href={`/registrations/${item.registration.toLowerCase()}`} className="article-link text-lg font-semibold">{item.registration}</Link><span className="text-sm text-muted-foreground">{aviationDate(item.validFrom)} — {item.validTo ? aviationDate(item.validTo) : "present"}</span></div><p className="mt-1 text-sm text-muted-foreground">{airframe.currentOperator?.name ?? "Operator not recorded"} · confidence {item.assertion.confidence}%</p></li>
                ))}
              </ol>
            </section>
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="fleet-events">
              <h2 id="fleet-events" className="text-2xl font-semibold">Fleet and lifecycle events</h2>
              {airframe.events.length ? <ol className="mt-5 space-y-3">{airframe.events.map((event) => <li key={event.id} className="grid gap-1 rounded-xl bg-muted/45 p-4 sm:grid-cols-[140px_1fr]"><time className="font-mono text-sm font-semibold">{aviationDate(event.occurredOn)}</time><div><p className="font-medium capitalize">{event.type.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-muted-foreground">{event.details}</p></div></li>)}</ol> : <p className="mt-4 text-muted-foreground">No canonical lifecycle events. Review the conflict above.</p>}
            </section>
          </div>
          <aside className="space-y-6">
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="configuration"><h2 id="configuration" className="text-xl font-semibold">Current configuration</h2>{config ? <dl className="mt-4 space-y-4 text-sm"><div><dt className="text-muted-foreground">Seats</dt><dd className="mt-1 text-2xl font-semibold">{config.totalSeats}</dd></div><div><dt className="text-muted-foreground">Cabin</dt><dd className="mt-1">{Object.entries(config.classes ?? {}).map(([name, seats]) => `${name.replace(/([A-Z])/g, " $1").toLowerCase()} ${seats}`).join(" · ")}</dd></div><div><dt className="text-muted-foreground">Engines</dt><dd className="mt-1 font-medium">{config.engines}</dd></div></dl> : <p className="mt-3 text-muted-foreground">Not recorded</p>}</section>
            <section className="rounded-2xl border bg-card p-5" aria-labelledby="record-health"><h2 id="record-health" className="text-xl font-semibold">Record health</h2><ul className="mt-4 space-y-2 text-sm">{Object.entries(airframe.completeness).map(([key, complete]) => <li key={key} className="flex items-center justify-between gap-3"><span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span><span className={complete ? "text-emerald-600" : "text-destructive"}>{complete ? "Known" : "Missing / conflicted"}</span></li>)}</ul></section>
          </aside>
        </div>
        <section className="mt-8 rounded-2xl border bg-card p-5" aria-labelledby="sources"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Database className="size-4" /> Provenance</p><h2 id="sources" className="mt-2 text-2xl font-semibold">Sources for this record</h2><p className="mt-2 mb-5 text-sm text-muted-foreground">Each fact retains its source, observation date, confidence, import provenance, and review state.</p><SourceList sources={sources} /></section>
      </main>
    </>
  );
}
