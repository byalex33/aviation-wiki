import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, ExternalLink, History, MapPinned, Plane, Route } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { aviationRoute, routeDistance, routeHistoryRange, routeIataPair } from "@/lib/route-data";
import { loadAviationRoute } from "@/lib/public-routes";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const route = aviationRoute((await params).slug);
  if (!route) return { title: "Route not found", robots: { index: false, follow: false } };
  const title = `${route.origin.iata} to ${route.destination.iata}: airlines, aircraft and route history`;
  const description = `Explore the ${route.origin.city}–${route.destination.city} air route, including current airlines, representative aircraft, distance, flight time, and historic service changes.`;
  return { title, description, alternates: { canonical: `/routes/${route.slug}` }, openGraph: { title, description, url: `/routes/${route.slug}`, type: "article" } };
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const route = await loadAviationRoute((await params).slug);
  if (!route) notFound();
  const distance = routeDistance(route);
  const historyRange = routeHistoryRange(route);
  const iataPair = routeIataPair(route);
  const pageUrl = absoluteUrl(`/routes/${route.slug}`);
  const tripJsonLd = { "@context": "https://schema.org", "@type": "Trip", name: `${route.origin.iata} to ${route.destination.iata}`, url: pageUrl, itinerary: { "@type": "ItemList", itemListElement: [{ "@type": "ListItem", position: 1, name: route.origin.name }, { "@type": "ListItem", position: 2, name: route.destination.name }] } };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tripJsonLd).replace(/</g, "\\u003c") }} /><main className="mx-auto w-full max-w-[1180px] px-5 pb-20 pt-8 sm:px-6">
    <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / </span><Link href="/routes" className="article-link">Routes</Link><span> / {route.origin.iata}–{route.destination.iata}</span></nav>
    <section><Badge variant="secondary" className="rounded-full text-primary"><Route />Verified {route.checkedAt}</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-6xl"><span className="font-mono text-primary">{route.origin.iata}</span> <span aria-label="to">→</span> <span className="font-mono text-primary">{route.destination.iata}</span></h1><p className="mt-3 text-xl text-muted-foreground">{route.origin.city} to {route.destination.city}</p></section>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Route facts"><Fact icon={MapPinned} label="Great-circle distance" value={`${distance.kilometres.toLocaleString()} km`} detail={`${distance.miles.toLocaleString()} mi · ${distance.nauticalMiles.toLocaleString()} nmi`} /><Fact icon={Clock3} label="Typical flight time" value={route.flightTime.summary} detail={route.flightTime.detail} /><Fact icon={Plane} label="Current operators" value={String(route.currentAirlines.length)} detail="Nonstop airlines at last review" />{historyRange && <Fact icon={History} label="History covered" value={historyRange.from === historyRange.to ? historyRange.from : `${historyRange.from}–${historyRange.to}`} detail="Selected sourced milestones" />}</section>
    <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6">Distance is a great-circle calculation between airport reference coordinates, not a flown track. {route.typicalFlightTime} Schedules and aircraft substitutions can change; check an airline for a specific travel date.</p>
    <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-12">
        <section><h2 className="text-2xl font-bold">Airlines serving the route</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{route.currentAirlines.map((airline) => <Card key={airline.name} className="gap-0 py-0"><CardContent className="p-5"><h3 className="font-semibold">{airline.href ? <Link href={airline.href} className="article-link">{airline.name}</Link> : airline.name}</h3>{airline.note && <p className="mt-2 text-sm leading-6 text-muted-foreground">{airline.note}</p>}</CardContent></Card>)}</div></section>
        <section><h2 className="text-2xl font-bold">Aircraft documented on {iataPair}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Representative and historic types, not a promise for a particular flight.</p><div className="mt-5 divide-y rounded-xl border bg-card">{route.aircraft.map((aircraft) => <div key={aircraft.name} className="p-5"><h3 className="font-semibold">{aircraft.href ? <Link href={aircraft.href} className="article-link">{aircraft.name}</Link> : aircraft.name}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{aircraft.note}</p></div>)}</div></section>
        <section><h2 className="text-2xl font-bold">Route history and notable changes</h2><ol className="mt-5 space-y-0 border-l-2 border-primary/25">{route.history.map((item) => <li key={`${item.year}-${item.title}`} className="relative pb-7 pl-6 last:pb-0 before:absolute before:-left-[5px] before:top-2 before:size-2 before:rounded-full before:bg-primary"><time className="font-mono text-sm font-semibold text-primary">{item.year}</time><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p></li>)}</ol></section>
        <section><h2 className="text-2xl font-bold">Historic operators and services</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{route.historicOperators.map((operator) => <Card key={operator.name} className="gap-0 py-0"><CardContent className="p-5"><h3 className="font-semibold">{operator.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{operator.note}</p></CardContent></Card>)}</div></section>
      </div>
      <aside className="lg:sticky lg:top-20 lg:self-start"><Card className="gap-0 py-0"><CardContent className="p-5"><h2 className="font-semibold">Airport pair</h2><div className="mt-4 space-y-4"><Airport label="Origin" airport={route.origin} href={route.originHref} /><Airport label="Destination" airport={route.destination} href={route.destinationHref} /></div></CardContent></Card><section className="mt-5"><h2 className="font-semibold">Sources</h2><ol className="mt-3 space-y-3 text-sm">{route.sources.map((source, index) => <li key={source.url} className="flex gap-2"><span className="text-muted-foreground">{index + 1}.</span><span><a href={source.url} target="_blank" rel="noreferrer" className="article-link">{source.title}<ExternalLink className="ml-1 inline size-3" /></a><span className="block text-xs text-muted-foreground">{source.publisher}{source.publishedAt ? ` · ${source.publishedAt}` : ""}</span></span></li>)}</ol></section></aside>
    </div>
  </main></>;
}

function Fact({ icon: Icon, label, value, detail }: { icon: typeof Plane; label: string; value: string; detail: string }) { return <Card className="gap-0 py-0"><CardContent className="p-5"><Icon className="size-5 text-primary" /><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function Airport({ label, airport, href }: { label: string; airport: { iata: string; name: string; city: string }; href?: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xl font-bold text-primary">{airport.iata}</p><p className="text-sm font-medium">{href ? <Link href={href} className="article-link">{airport.name}</Link> : airport.name}</p><p className="text-xs text-muted-foreground">{airport.city}</p></div>; }
