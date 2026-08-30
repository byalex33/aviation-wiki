import type { Metadata } from "next";
import { Flag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AirframeCards, CompletenessPanel } from "@/components/aviation-data";
import { Badge } from "@/components/ui/badge";
import {
  aviationDataEnabled,
  ensureAviationDataEnabled,
} from "@/lib/aviation-data-flags";
import {
  findAirframesByRegistration,
  listAirframesByRegistrationPrefix,
  loadAviationGraphCompleteness,
} from "@/lib/aviation-data-public";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
type Params = Promise<{ value: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!aviationDataEnabled) return { title: "Not found", robots: { index: false } };
  const value = decodeURIComponent((await params).value).toUpperCase();
  const prefix = value.length === 1;
  return {
    title: prefix ? `${value}-prefix aircraft registrations` : `${value} aircraft registration history`,
    description: prefix ? `Browse aircraft registrations beginning with ${value}.` : `View the airframe and temporal assignment history for registration ${value}.`,
    alternates: { canonical: `/registrations/${value.toLowerCase()}` },
  };
}

export default async function RegistrationPage({ params }: { params: Params }) {
  ensureAviationDataEnabled();
  const value = decodeURIComponent((await params).value).toUpperCase();
  const isPrefix = /^[A-Z]$/.test(value);
  const [airframes, completeness] = await Promise.all([
    isPrefix ? listAirframesByRegistrationPrefix(value) : findAirframesByRegistration(value),
    loadAviationGraphCompleteness(),
  ]);
  if (!airframes.length) notFound();
  const title = isPrefix ? `${value} — United Kingdom registrations` : value;
  const json = {
    "@context": "https://schema.org",
    "@type": isPrefix ? "Dataset" : "ItemList",
    name: title,
    url: absoluteUrl(`/registrations/${value.toLowerCase()}`),
    numberOfItems: airframes.length,
    itemListElement: airframes.map((airframe, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(`/airframes/${airframe.publicId}`), name: airframe.currentRegistration?.registration })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-7 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link> / <Link href="/registrations" className="article-link">Registrations</Link> / {value}</nav>
        <header className="max-w-3xl"><Badge variant="secondary" className="text-primary"><Flag /> {isPrefix ? "Registration prefix" : "Registration assignment"}</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{title}</h1><p className="mt-4 text-lg leading-8 text-muted-foreground">{isPrefix ? `${airframes.length} documented current or historic assignments in this data slice.` : "This mark is linked to a stable airframe record, so its identity survives future registration and operator changes."}</p></header>
        {isPrefix && <div className="mt-8"><CompletenessPanel data={completeness} /></div>}
        <section className="mt-9" aria-labelledby="registration-records"><h2 id="registration-records" className="mb-4 text-2xl font-semibold">{isPrefix ? "Matching airframes" : "Assigned airframe"}</h2><AirframeCards airframes={airframes} /></section>
      </main>
    </>
  );
}
