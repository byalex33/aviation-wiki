import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  CommercialDirectory,
  CommercialDirectoryControls,
  CommercialDirectoryFallback,
} from "@/components/commercial-directory";
import { ContributePrompt } from "@/components/contribute-prompt";
import { PublicDataPending } from "@/components/public-data-pending";
import { Badge } from "@/components/ui/badge";
import { buildAirlineDirectory } from "@/lib/airline-directory";
import {
  type CommercialAirlineCard,
  type CommercialOperatingStatus,
} from "@/lib/commercial-filters";
import { getOpenFlightsAirlines, type OpenFlightsAirline } from "@/lib/openflights";
import { publicDatabaseConfigured } from "@/lib/public-page-cache";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Commercial airlines",
  alternates: { canonical: "/commercial" },
  description: "Browse commercial airlines alphabetically on aviation.wiki.",
};

export const revalidate = 3600;

type DirectoryAirline = ReturnType<typeof buildAirlineDirectory>[number]["airlines"][number];

function airlineCard(airline: DirectoryAirline, openFlights: OpenFlightsAirline | undefined): CommercialAirlineCard {
  const operatingStatus: CommercialOperatingStatus = airline.isActive ? "active" : airline.isHistoric ? "historic" : "unknown";
  return {
    name: airline.name,
    href: airline.href,
    iata: airline.iata,
    icao: airline.icao || openFlights?.icao || "Unknown",
    callsign: airline.callsign !== "Unknown" ? airline.callsign : openFlights?.callsign || "Unknown",
    status: airline.status,
    operatingStatus,
    country: airline.country,
    countryCode: airline.countryCode,
    detailLabel: openFlights?.alias ? "Alias" : "Main hub",
    detailValue: openFlights?.alias || airline.hub,
    showLogo: /^[A-Z0-9]{2}$/.test(airline.iata),
  };
}

export default async function CommercialAirlinesPage() {
  if (!publicDatabaseConfigured()) return <PublicDataPending title="Commercial airlines" />;
  const airlines = buildAirlineDirectory(await listPublicSearchDocuments()).flatMap((group) => group.airlines);
  const openFlightsAirlines = await getOpenFlightsAirlines(airlines.filter((airline) => /^[A-Z0-9]{2}$/.test(airline.iata)));
  const cards = airlines.map((airline) => {
    const candidate = openFlightsAirlines.get(airline.iata);
    const openFlights = candidate && (airline.icao
      ? candidate.icao === airline.icao
      : candidate.name.toLowerCase() === airline.name.toLowerCase()) ? candidate : undefined;
    return airlineCard(airline, openFlights);
  });
  const countryOptions = [...new Set(cards.map((airline) => airline.country))].toSorted((left, right) => left.localeCompare(right));

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

      <CommercialDirectory airlines={cards} countries={countryOptions}>
        <Suspense fallback={<CommercialDirectoryFallback total={cards.length} />}>
          <CommercialDirectoryControls />
        </Suspense>
      </CommercialDirectory>
      <p className="mt-12 border-t pt-5 text-xs leading-5 text-muted-foreground">
        Airline data from <a href="https://openflights.org/data.php" target="_blank" rel="noreferrer" className="article-link">OpenFlights</a>, available under the Open Database License. OpenFlights notes that airline operating status may not always be current.
      </p>
    </main>
  );
}
