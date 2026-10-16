import Link from "next/link";
import { FilePenLine, Plane } from "lucide-react";

import { ArticleMarkdown } from "@/components/article-markdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { parseArticleMarkdown } from "@/lib/article-markdown";
import { airframeStatusLabel, type AirframeRecord, type OperatorSpan, type RegistrationSpan } from "@/lib/airframe-record";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import type { SourceLink } from "@/lib/wiki-types";

function spanLabel(from: string | null, to: string | null) {
  return `${from ?? "Unknown"} — ${to ?? "present"}`;
}

function HistoryList({
  items,
}: {
  items: Array<{ key: string; title: string; href?: string; detail: string }>;
}) {
  if (!items.length) return <p className="mt-3 text-sm text-muted-foreground">Not recorded.</p>;
  return (
    <ol className="mt-4 space-y-3 border-l pl-5">
      {items.map((item) => (
        <li key={item.key} className="relative">
          <span className="absolute -left-[23px] top-1.5 size-2 rounded-full bg-primary" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {item.href ? <Link href={item.href} className="article-link font-semibold">{item.title}</Link> : <span className="font-semibold">{item.title}</span>}
            <span className="text-sm text-muted-foreground">{item.detail}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AirframeArticle({
  record,
  markdown,
  sources = [],
  editHref,
}: {
  record: AirframeRecord;
  markdown?: string;
  sources?: SourceLink[];
  editHref?: string;
}) {
  const parsed = markdown ? parseArticleMarkdown(markdown) : null;
  const typeHref = record.typeSlug ? `/aircraft/${record.typeSlug}` : null;
  const operatorHref = record.currentOperatorSlug ? `/commercial/${record.currentOperatorSlug}` : null;
  const description = `${record.registration}, ${record.aircraftType}${record.msn ? `, MSN ${record.msn}` : ""}: operator history, registration changes, and current status.`;
  const json = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${record.registration} — ${record.aircraftType}`,
    url: absoluteUrl(record.href),
    description,
    vehicleIdentificationNumber: record.msn ?? undefined,
    vehicleConfiguration: record.variant || record.aircraftType,
    dateVehicleFirstRegistered: record.deliveryDate ?? undefined,
    manufacturer: record.aircraftType ? { "@type": "Organization", name: record.aircraftType } : undefined,
  };
  const operators: Array<{ key: string; title: string; href?: string; detail: string }> = (record.operatorHistory.length
    ? record.operatorHistory
    : record.currentOperatorName
      ? [{ operator: record.currentOperatorName, slug: record.currentOperatorSlug ?? "", from: record.deliveryDate, to: null } satisfies OperatorSpan]
      : []
  ).map((span) => ({
    key: `${span.slug}-${span.from ?? "start"}`,
    title: span.operator,
    href: span.slug ? `/commercial/${span.slug}` : undefined,
    detail: spanLabel(span.from, span.to),
  }));
  const registrations = record.registrationHistory.map((span: RegistrationSpan) => ({
    key: `${span.slug}-${span.from ?? "start"}`,
    title: span.registration,
    href: span.slug === record.slug ? undefined : `/airframes/${span.slug}`,
    detail: spanLabel(span.from, span.to),
  }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-7 text-sm text-muted-foreground">
          <Link href="/" className="article-link">Main</Link> / <Link href="/airframes" className="article-link">Airframes</Link> / {record.registration}
        </nav>
        <header className="rounded-2xl border bg-card p-5 shadow-xs sm:p-8">
          <Badge variant="secondary"><Plane /> Individual airframe</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{record.registration}</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {typeHref ? <Link href={typeHref} className="article-link">{record.aircraftType}</Link> : record.aircraftType}
            {record.variant ? ` · ${record.variant}` : ""} · MSN {record.msn ?? "not recorded"}
          </p>
          <dl className="mt-7 grid grid-cols-2 gap-3 border-t pt-6 lg:grid-cols-4">
            {[
              ["Status", airframeStatusLabel(record.status)],
              ["Operator", record.currentOperatorName ?? "Not recorded"],
              ["Delivered", record.deliveryDate ?? "Not recorded"],
              ["Age", record.ageYears === null ? "Not recorded" : `${record.ageYears.toFixed(1)} years`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/45 p-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {label === "Operator" && operatorHref ? <Link href={operatorHref} className="article-link">{value}</Link> : value}
                </dd>
              </div>
            ))}
          </dl>
          {record.fate && <p className="mt-5 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Fate. </span>{record.fate}</p>}
          {editHref && (
            <Link href={editHref} className={`${buttonVariants({ size: "sm" })} mt-6 min-h-10 px-3.5`}>
              <FilePenLine /> Edit this airframe
            </Link>
          )}
        </header>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-5" aria-labelledby="operator-history">
            <h2 id="operator-history" className="text-2xl font-semibold">Operator history</h2>
            <HistoryList items={operators} />
          </section>
          <section className="rounded-2xl border bg-card p-5" aria-labelledby="registration-history">
            <h2 id="registration-history" className="text-2xl font-semibold">Registration history</h2>
            <HistoryList items={registrations} />
          </section>
        </div>
        {parsed && !parsed.errors.length && (
          <article className="mt-8 rounded-2xl border bg-card p-5 sm:p-8">
            <ArticleMarkdown root={parsed.root} citations={parsed.citations} citationSources={sources} hideSidebar />
          </article>
        )}
        {sources.length > 0 && (
          <section className="mt-8 rounded-2xl border bg-card p-5" aria-labelledby="airframe-sources">
            <h2 id="airframe-sources" className="text-2xl font-semibold">Sources</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} className="article-link" target="_blank" rel="noreferrer">{source.title || source.url}</a>
                  {source.publisher ? <span className="text-muted-foreground"> · {source.publisher}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
