import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { seoLandingDefinitions } from "@/lib/seo-landing-data";

export const metadata: Metadata = { title: "Airlines by country", description: "Browse country guides to approved active and historic airline profiles.", alternates: { canonical: "/airlines" } };
export default function AirlinesByCountryPage() { const countries = seoLandingDefinitions.filter((item) => item.contentType === "airline"); return <main className="mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-6"><nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / Airlines by country</span></nav><Badge variant="secondary" className="rounded-full text-primary"><Globe2 />Country guides</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Airlines by country</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">Find approved airline profiles by country, including active passenger and cargo carriers and historic operators.</p><section className="mt-10 grid gap-4">{countries.map((country) => <Link key={country.id} href={country.href} className="group"><Card className="gap-0 py-0 transition group-hover:border-primary/35"><CardContent className="flex items-center justify-between gap-4 p-6"><div><h2 className="text-xl font-semibold">{country.subject}</h2><p className="mt-1 text-sm text-muted-foreground">{country.description}</p></div><ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" /></CardContent></Card></Link>)}</section><Link href="/commercial" className="article-link mt-8 inline-block">Browse the full commercial airline directory</Link></main>; }
