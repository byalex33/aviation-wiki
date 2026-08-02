import type { Metadata } from "next";
import { ArrowRight, GitCompareArrows, Network } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  comparisonDefinitions,
} from "@/lib/comparison-content";
import { comparisonPath } from "@/lib/comparison-data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Aircraft and airline alliance comparisons",
  description:
    "Compare aircraft families, airliners, fighters, and global airline alliances using approved, cited aviation.wiki records.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Aircraft and airline alliance comparisons",
    description:
      "Clear side-by-side aviation comparisons built from approved, cited records.",
    url: "/compare",
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function CompareIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "aviation.wiki comparisons",
    numberOfItems: comparisonDefinitions.length,
    itemListElement: comparisonDefinitions.map((comparison, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: comparison.title,
      url: absoluteUrl(comparisonPath(comparison)),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="article-link">
            Main
          </Link>
          <span> / Comparisons</span>
        </nav>

        <section className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full text-primary">
            Side-by-side reference guides
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Compare aircraft and alliances
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Quick answers, careful caveats, and complete comparison tables
            generated from aviation.wiki&apos;s latest approved records. Follow
            every subject back to its full article and citations.
          </p>
        </section>

        <section
          className="mt-10 grid gap-5 md:grid-cols-2"
          aria-label="Aviation comparisons"
        >
          {comparisonDefinitions.map((comparison) => {
            const alliance = comparison.category === "Alliance comparison";
            const Icon = alliance ? Network : GitCompareArrows;
            return (
              <Link
                key={comparison.slug}
                href={comparisonPath(comparison)}
                className="group block"
              >
                <Card className="h-full gap-0 overflow-hidden py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="p-6 pb-4">
                    <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-xl font-semibold tracking-tight">
                      {comparison.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-[15px] leading-6">
                      {comparison.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto px-6 pb-5">
                    <div className="flex flex-wrap gap-2">
                      {comparison.entities.map((entity) => (
                        <Badge key={entity.slug} variant="outline">
                          {entity.shortLabel}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between px-6 py-4 font-medium">
                    Open comparison
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </section>

        <section className="mt-12 rounded-2xl border bg-muted/35 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">How to read these pages</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            A family-level maximum is not a promise for every variant. Range,
            seating, speed, and dimensions may describe different models or
            measurement conditions. Each guide labels those limits and links
            back to approved articles so you can inspect the underlying context
            and sources.
          </p>
        </section>
      </main>
    </>
  );
}
