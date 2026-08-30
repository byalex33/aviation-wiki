import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { aviationRoutes, routeDistance } from "@/lib/route-data";

export const metadata: Metadata = { title: "Flight route guides", description: "Explore sourced aviation route pages with airlines, aircraft, distance, flight time, and route history.", alternates: { canonical: "/routes" } };

export default function RoutesPage() {
  return <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
    <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / Routes</span></nav>
    <section className="max-w-3xl"><Badge variant="secondary" className="rounded-full text-primary"><Route />Route reference</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Flight route guides</h1><p className="mt-4 text-lg leading-8 text-muted-foreground">Sourced guides to notable airport pairs, including current operators, representative aircraft, great-circle distance, timing context, and service history.</p></section>
    <section className="mt-10 grid gap-4" aria-label="Published route guides">{aviationRoutes.map((route) => { const distance = routeDistance(route); return <Link key={route.slug} href={`/routes/${route.slug}`} className="group"><Card className="gap-0 py-0 transition group-hover:border-primary/35 group-hover:shadow-md"><CardContent className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-mono text-sm font-semibold text-primary">{route.origin.iata} → {route.destination.iata}</p><h2 className="mt-2 text-xl font-bold">{route.origin.city} to {route.destination.city}</h2><p className="mt-2 text-sm text-muted-foreground">{route.currentAirlines.length} current operators · {distance.nauticalMiles.toLocaleString()} nmi · verified {route.checkedAt}</p></div><ArrowRight className="size-5 transition-transform group-hover:translate-x-1" /></CardContent></Card></Link>; })}</section>
  </main>;
}
