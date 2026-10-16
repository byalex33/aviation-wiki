import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CommercialDirectoryControls } from "@/components/commercial-directory-controls";
import { ContributePrompt } from "@/components/contribute-prompt";
import { PublicDataPending } from "@/components/public-data-pending";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildAirlineDirectory } from "@/lib/airline-directory";
import { getOpenFlightsAirlines } from "@/lib/openflights";
import { publicDatabaseConfigured } from "@/lib/public-page-cache";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Commercial airlines",
  alternates: { canonical: "/commercial" },
  description: "Browse commercial airlines alphabetically on aviation.wiki.",
};

export const revalidate = 3600;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const filterLinkClass = (active: boolean) =>
  `flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

export default async function CommercialAirlinesPage() {
  if (!publicDatabaseConfigured()) return <PublicDataPending title="Commercial airlines" />;
  const groups = buildAirlineDirectory(await listPublicSearchDocuments());
  const airlines = groups.flatMap((group) => group.airlines);
  const openFlightsAirlines = await getOpenFlightsAirlines(airlines.filter((airline) => /^[A-Z0-9]{2}$/.test(airline.iata)));
  const countryOptions = [...new Set(airlines.map((airline) => airline.country))].toSorted((a, b) => a.localeCompare(b));
  const activeLetters = new Set(groups.map((group) => group.letter));

  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-6 sm:px-6">
      <nav className="mb-8 flex gap-2 text-[13px] text-muted-foreground" aria-label="Breadcrumb"><Link href="/" className="article-link">Main</Link><span>/</span><span className="text-foreground/75">Commercial airlines</span></nav>
      <section className="grid items-end gap-7 lg:grid-cols-[minmax(0,48rem)_auto] lg:justify-between">
        <div>
          <Badge variant="secondary" className="mb-4 rounded-full text-primary">Commercial aviation</Badge>
          <h1 className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Commercial airlines</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">Browse active and historic airlines in alphabetical order, including operational codes, callsigns, status, and main hubs.</p>
        </div>
        <aside className="border-l-2 border-primary/25 pl-4 text-sm lg:mb-1 lg:max-w-52" aria-label="Contribute to aviation.wiki">
          <p className="font-semibold">Something missing?</p>
          <ContributePrompt signedInLabel="Contribute now!" signedOutLabel="Sign up to contribute." className="article-link mt-1 inline-block" />
        </aside>
      </section>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Suspense fallback={
          <aside className="rounded-lg border bg-card p-4 shadow-xs lg:sticky lg:top-6" aria-label="Sort and filter commercial airlines">
            <div className="flex items-baseline justify-between border-b pb-3">
              <h2 className="font-semibold">Commercial airlines</h2>
              <span className="font-mono text-xs text-muted-foreground">{airlines.length}</span>
            </div>
            <div className="mt-4">
              <h3 className="field-label">Show</h3>
              <nav className="mt-2 grid gap-1" aria-label="Filter airlines by status">
                <Link href="/commercial" aria-current="page" className={filterLinkClass(true)}>All airlines</Link>
                <Link href="/commercial?status=active" className={filterLinkClass(false)}>Active</Link>
                <Link href="/commercial?status=historic" className={filterLinkClass(false)}>Ceased</Link>
              </nav>
            </div>
          </aside>
        }>
          <CommercialDirectoryControls countries={countryOptions} total={airlines.length} />
        </Suspense>

        <div id="airline-directory">
          <nav className="mb-9 flex flex-wrap gap-1.5 border-y py-4" aria-label="Airline alphabet index">
            {alphabet.map((letter) => activeLetters.has(letter) ? <a key={letter} data-letter-index={letter} href={`#letter-${letter}`} className="grid size-10 place-items-center rounded-md bg-foreground font-mono text-xs font-semibold text-background transition-colors hover:bg-primary">{letter}</a> : <span key={letter} className="grid size-10 place-items-center rounded-md font-mono text-xs text-muted-foreground/35">{letter}</span>)}
          </nav>
          <div className="space-y-12" data-airline-sections>
        {groups.map((group) => (
          <section id={`letter-${group.letter}`} key={group.letter} data-letter={group.letter} className="scroll-mt-24">
            <div className="mb-4 flex items-end gap-4 border-b pb-3"><h2 className="font-mono text-4xl font-semibold text-primary">{group.letter}</h2><span data-letter-count className="mb-1 text-sm text-muted-foreground">{group.airlines.length} {group.airlines.length === 1 ? "airline" : "airlines"}</span></div>
            <div data-airline-grid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.airlines.map((airline) => {
                const candidate = openFlightsAirlines.get(airline.iata);
                const openFlights = candidate && (airline.icao
                  ? candidate.icao === airline.icao
                  : candidate.name.toLowerCase() === airline.name.toLowerCase()) ? candidate : undefined;
                const name = airline.name;
                const status = airline.status;
                const operatingStatus = airline.isActive ? "active" : airline.isHistoric ? "historic" : "unknown";

                return (
                <Link
                  key={airline.href}
                  href={airline.href}
                  data-airline=""
                  data-name={name}
                  data-status={operatingStatus}
                  data-country={airline.country}
                  className="group block"
                  aria-label={`View ${name}`}
                >
                  <Card className="h-full gap-0 overflow-hidden py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex h-28 items-center justify-center border-b bg-white p-5">
                      {/^[A-Z0-9]{2}$/.test(airline.iata) ? <Image src={`https://images.kiwi.com/airlines/64/${airline.iata}.png`} alt={`${name} logo`} width={64} height={64} unoptimized className="max-h-16 w-auto object-contain transition-transform group-hover:scale-105" /> : <span className="text-sm text-muted-foreground">{name}</span>}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{name}</h3>
                      <Badge variant="secondary" className="mt-3 rounded-full font-normal">
                        {airline.countryCode && <Image src={`https://flagcdn.com/w40/${airline.countryCode}.png`} alt="" width={20} height={15} unoptimized className="h-3.5 w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]" />}
                        {airline.country}
                      </Badge>
                      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-4 text-sm">
                        <div><dt className="field-label">IATA / ICAO</dt><dd className="mt-1 font-mono font-medium">{airline.iata || "Unknown"} / {airline.icao || openFlights?.icao || "Unknown"}</dd></div>
                        <div><dt className="field-label">Status</dt><dd className="mt-1"><Badge variant="outline" className={airline.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-100 text-zinc-600"}>{status}</Badge></dd></div>
                        <div><dt className="field-label">Callsign</dt><dd className="mt-1 font-mono text-xs font-medium">{airline.callsign !== "Unknown" ? airline.callsign : openFlights?.callsign || "Unknown"}</dd></div>
                        <div><dt className="field-label">{openFlights?.alias ? "Alias" : "Main hub"}</dt><dd className="mt-1 font-medium leading-5">{openFlights?.alias || airline.hub}</dd></div>
                      </dl>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
            </div>
          </section>
        ))}
          </div>
        </div>
      </div>
      <p className="mt-12 border-t pt-5 text-xs leading-5 text-muted-foreground">
        Airline data from <a href="https://openflights.org/data.php" target="_blank" rel="noreferrer" className="article-link">OpenFlights</a>, available under the Open Database License. OpenFlights notes that airline operating status may not always be current.
      </p>
    </main>
  );
}
