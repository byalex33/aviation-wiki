import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitCompareArrows,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  comparisonDefinition,
  comparisonDefinitions,
} from "@/lib/comparison-content";
import { comparisonPath, loadComparison } from "@/lib/comparison-data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return comparisonDefinitions.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comparison = comparisonDefinition(slug);
  if (!comparison) {
    return {
      title: "Comparison not found",
      robots: { index: false, follow: false },
    };
  }

  const path = comparisonPath(comparison);
  return {
    title: `${comparison.shortTitle}: specs and key differences`,
    description: comparison.description,
    alternates: { canonical: path },
    openGraph: {
      title: comparison.title,
      description: comparison.description,
      url: path,
      siteName: SITE_NAME,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: comparison.title,
      description: comparison.description,
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = await loadComparison(slug);
  if (!comparison) notFound();

  const { definition, entities, rows, updatedAt } = comparison;
  const path = comparisonPath(definition);
  const dateModified = new Date(updatedAt).toISOString();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: definition.title,
    description: definition.description,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    dateModified,
    author: {
      "@type": "Organization",
      "@id": `${absoluteUrl("/")}#organization`,
      name: SITE_NAME,
    },
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    about: entities.map((entity) => ({
      "@type":
        entity.contentType === "aircraft"
          ? "Product"
          : "Organization",
      name: entity.label,
      url: absoluteUrl(entity.href),
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Main",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Comparisons",
        item: absoluteUrl("/compare"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: definition.shortTitle,
        item: absoluteUrl(path),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto w-full min-w-0 max-w-[1120px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="article-link">
            Main
          </Link>
          <span> / </span>
          <Link href="/compare" className="article-link">
            Comparisons
          </Link>
          <span> / {definition.shortTitle}</span>
        </nav>

        <header className="max-w-4xl">
          <Badge variant="secondary" className="rounded-full text-primary">
            {definition.category}
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {definition.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {definition.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {entities.map((entity) => (
              <Link
                key={entity.slug}
                href={entity.href}
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              >
                <BookOpen className="size-4" />
                {entity.shortLabel} article
              </Link>
            ))}
          </div>
        </header>

        <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/[0.045] p-6 sm:p-8">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <CheckCircle2 className="size-5" />
            Quick answer
          </div>
          <p className="mt-3 max-w-4xl text-[17px] leading-8">
            {definition.quickAnswer}
          </p>
        </section>

        <section className="mt-12" aria-labelledby="comparison-table-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Approved record data
              </p>
              <h2
                id="comparison-table-heading"
                className="mt-2 text-3xl font-semibold tracking-tight"
              >
                Side-by-side comparison
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Updated{" "}
              <time dateTime={dateModified}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(updatedAt))}
              </time>
            </p>
          </div>

          <div className="mt-6 w-full min-w-0 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th className="w-[180px] border-b px-4 py-4 font-semibold">
                    Measure
                  </th>
                  {entities.map((entity) => (
                    <th
                      key={entity.slug}
                      className="min-w-[240px] border-b px-4 py-4 font-semibold"
                    >
                      <Link href={entity.href} className="article-link">
                        {entity.shortLabel}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={rowIndex % 2 ? "bg-muted/25" : "bg-card"}
                  >
                    <th className="border-b px-4 py-4 align-top font-medium">
                      {row.label}
                    </th>
                    {row.values.map((value, entityIndex) => (
                      <td
                        key={`${row.label}-${entities[entityIndex].slug}`}
                        className="border-b px-4 py-4 align-top leading-6 text-muted-foreground"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Values are taken from each subject&apos;s latest approved
            aviation.wiki revision. “Not listed” means the comparable field is
            not present; it does not imply a value of zero.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="meaning-heading">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Context before conclusions
          </p>
          <h2
            id="meaning-heading"
            className="mt-2 text-3xl font-semibold tracking-tight"
          >
            What the numbers mean
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {definition.observations.map((observation, index) => (
              <article
                key={observation.heading}
                className="rounded-xl border bg-card p-6"
              >
                <span className="font-mono text-xs font-semibold text-primary">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold">
                  {observation.heading}
                </h3>
                <p className="mt-2 leading-7 text-muted-foreground">
                  {observation.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 max-w-4xl" aria-labelledby="questions-heading">
          <h2
            id="questions-heading"
            className="text-3xl font-semibold tracking-tight"
          >
            Common questions
          </h2>
          <div className="mt-5 divide-y rounded-xl border bg-card">
            {definition.questions.map(({ question, answer }) => (
              <article key={question} className="p-5 sm:p-6">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl bg-foreground p-7 text-background sm:p-9">
          <GitCompareArrows className="size-7 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold">
            Explore every comparison
          </h2>
          <p className="mt-2 max-w-2xl leading-7 text-background/65">
            Continue with more aircraft and alliance guides, or use the open
            fleet tool to build your own aircraft shortlist.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/compare"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "gap-2",
              )}
            >
              All comparisons
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/fleet/compare"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background",
              )}
            >
              Build a custom comparison
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
