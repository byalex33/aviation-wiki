import type { Metadata } from "next";
import Link from "next/link";
import { Factory, Gauge, MapPin, PlaneTakeoff } from "lucide-react";

import { ArticleCollection } from "@/components/article-collection";
import { buttonVariants } from "@/components/ui/button";
import { documentsForSeoLanding, seoLandingDefinition, seoLandingDefinitions, type SeoLandingId } from "@/lib/seo-landing-data";
import { absoluteUrl } from "@/lib/site";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

const icons = { aircraft: Factory, airline: PlaneTakeoff, airport: MapPin, engine: Gauge } as const;

export function metadataForSeoLanding(id: SeoLandingId): Metadata {
  const definition = seoLandingDefinition(id);
  return {
    title: definition.title,
    description: definition.description,
    alternates: { canonical: definition.href },
    openGraph: { title: definition.title, description: definition.description, url: definition.href, type: "website" },
  };
}

export async function SeoLandingPage({ id }: { id: SeoLandingId }) {
  const definition = seoLandingDefinition(id);
  const documents = await listPublicSearchDocuments();
  const articles = documentsForSeoLanding(definition, documents);
  const parentHref = definition.contentType === "airline" ? "/airlines" : `/${definition.contentType === "aircraft" ? "aircraft" : definition.contentType === "airport" ? "airports" : "engines"}`;
  const related = seoLandingDefinitions.filter((item) => item.id !== id && item.contentType === definition.contentType);
  const subjectArticle = documents.find((document) => document.contentType === "manufacturer" && document.title.toLocaleLowerCase("en") === definition.subject.toLocaleLowerCase("en"));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: definition.title, description: definition.description, url: absoluteUrl(definition.href), mainEntity: { "@id": `${absoluteUrl(definition.href)}#items` } },
      { "@type": "ItemList", "@id": `${absoluteUrl(definition.href)}#items`, numberOfItems: articles.length, itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, name: article.title, url: absoluteUrl(article.href) })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "aviation.wiki", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: definition.contentType === "airline" ? "Airlines" : definition.contentType, item: absoluteUrl(parentHref) }, { "@type": "ListItem", position: 3, name: definition.subject, item: absoluteUrl(definition.href) }] },
    ],
  };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
    <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / </span><Link href={parentHref} className="article-link">{definition.contentType === "airline" ? "Airlines" : definition.contentType === "aircraft" ? "Aircraft" : definition.contentType === "airport" ? "Airports" : "Engines"}</Link><span> / {definition.subject}</span></nav>
    <ArticleCollection articles={articles} badge={definition.badge} title={definition.title} description={definition.description} icon={icons[definition.contentType]} contributeHref={definition.contributeHref} contributeLabel={`Add ${definition.contentType === "aircraft" ? "an aircraft" : definition.contentType === "airline" ? "an airline" : definition.contentType === "airport" ? "an airport" : "an engine"}`} emptyTitle={`Help build ${definition.title}`} emptyDescription="No approved articles match this landing page yet." />
    {(subjectArticle || related.length > 0) && <section className="mt-10 flex flex-wrap gap-3 rounded-xl border bg-muted/30 p-5">{subjectArticle && <Link href={subjectArticle.href} className={buttonVariants({ variant: "outline" })}>Read the {definition.subject} article</Link>}{related.map((item) => <Link key={item.id} href={item.href} className={buttonVariants({ variant: "outline" })}>{item.title}</Link>)}</section>}
  </main></>;
}
