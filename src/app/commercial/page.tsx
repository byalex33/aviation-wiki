import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AirlineCountryFilter } from "@/components/airline-country-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getOpenFlightsAirlines } from "@/lib/openflights";
import { normalizeSlug } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Commercial airlines",
  description: "Browse commercial airlines alphabetically on aviation.wiki.",
};

const groups = [
  { letter: "A", airlines: [
    { name: "Aegean Airlines", iata: "A3", icao: "AEE", callsign: "AEGEAN", status: "Active", hub: "Athens", countryCode: "gr", country: "Greece" },
    { name: "Aer Lingus", iata: "EI", icao: "EIN", callsign: "SHAMROCK", status: "Active", hub: "Dublin", countryCode: "ie", country: "Ireland" },
    { name: "Air Canada", iata: "AC", icao: "ACA", callsign: "AIR CANADA", status: "Active", hub: "Toronto Pearson", countryCode: "ca", country: "Canada" },
    { name: "Air France", iata: "AF", icao: "AFR", callsign: "AIRFRANS", status: "Active", hub: "Paris Charles de Gaulle", countryCode: "fr", country: "France" },
    { name: "Air India", iata: "AI", icao: "AIC", callsign: "AIR INDIA", status: "Active", hub: "Delhi", countryCode: "in", country: "India" },
    { name: "Alitalia", iata: "AZ", icao: "AZA", callsign: "ALITALIA", status: "Ceased", hub: "Rome Fiumicino", countryCode: "it", country: "Italy" },
    { name: "American Airlines", iata: "AA", icao: "AAL", callsign: "AMERICAN", status: "Active", hub: "Dallas / Fort Worth", countryCode: "us", country: "United States" },
  ]},
  { letter: "B", airlines: [
    { name: "British Airways", iata: "BA", icao: "BAW", callsign: "SPEEDBIRD", status: "Active", hub: "London Heathrow", countryCode: "gb", country: "United Kingdom" },
  ]},
  { letter: "C", airlines: [
    { name: "Cathay Pacific", iata: "CX", icao: "CPA", callsign: "CATHAY", status: "Active", hub: "Hong Kong", countryCode: "hk", country: "Hong Kong" },
  ]},
  { letter: "D", airlines: [
    { name: "Delta Air Lines", iata: "DL", icao: "DAL", callsign: "DELTA", status: "Active", hub: "Atlanta", countryCode: "us", country: "United States" },
  ]},
  { letter: "E", airlines: [
    { name: "easyJet", iata: "U2", icao: "EZY", callsign: "EASY", status: "Active", hub: "London Gatwick", countryCode: "gb", country: "United Kingdom" },
    { name: "Emirates", iata: "EK", icao: "UAE", callsign: "EMIRATES", status: "Active", hub: "Dubai", countryCode: "ae", country: "United Arab Emirates" },
    { name: "Ethiopian Airlines", iata: "ET", icao: "ETH", callsign: "ETHIOPIAN", status: "Active", hub: "Addis Ababa", countryCode: "et", country: "Ethiopia" },
    { name: "Etihad Airways", iata: "EY", icao: "ETD", callsign: "ETIHAD", status: "Active", hub: "Abu Dhabi", countryCode: "ae", country: "United Arab Emirates" },
  ]},
  { letter: "F", airlines: [
    { name: "Finnair", iata: "AY", icao: "FIN", callsign: "FINNAIR", status: "Active", hub: "Helsinki", countryCode: "fi", country: "Finland" },
    { name: "Flybe", iata: "BE", icao: "BEE", callsign: "JERSEY", status: "Ceased", hub: "Birmingham", countryCode: "gb", country: "United Kingdom" },
  ]},
  { letter: "I", airlines: [
    { name: "Iberia", iata: "IB", icao: "IBE", callsign: "IBERIA", status: "Active", hub: "Madrid", countryCode: "es", country: "Spain" },
  ]},
  { letter: "J", airlines: [
    { name: "Japan Airlines", iata: "JL", icao: "JAL", callsign: "JAPANAIR", status: "Active", hub: "Tokyo Haneda", countryCode: "jp", country: "Japan" },
  ]},
  { letter: "K", airlines: [
    { name: "KLM", iata: "KL", icao: "KLM", callsign: "KLM", status: "Active", hub: "Amsterdam Schiphol", countryCode: "nl", country: "Netherlands" },
    { name: "Korean Air", iata: "KE", icao: "KAL", callsign: "KOREANAIR", status: "Active", hub: "Seoul Incheon", countryCode: "kr", country: "South Korea" },
  ]},
  { letter: "L", airlines: [
    { name: "Lufthansa", iata: "LH", icao: "DLH", callsign: "LUFTHANSA", status: "Active", hub: "Frankfurt", countryCode: "de", country: "Germany" },
  ]},
  { letter: "P", airlines: [
    { name: "Pan Am", iata: "PA", icao: "PAA", callsign: "CLIPPER", status: "Ceased", hub: "New York JFK", countryCode: "us", country: "United States" },
  ]},
  { letter: "Q", airlines: [
    { name: "Qantas", iata: "QF", icao: "QFA", callsign: "QANTAS", status: "Active", hub: "Sydney", countryCode: "au", country: "Australia" },
    { name: "Qatar Airways", iata: "QR", icao: "QTR", callsign: "QATARI", status: "Active", hub: "Doha", countryCode: "qa", country: "Qatar" },
  ]},
  { letter: "R", airlines: [
    { name: "Ryanair", iata: "FR", icao: "RYR", callsign: "RYANAIR", status: "Active", hub: "Dublin", countryCode: "ie", country: "Ireland" },
  ]},
  { letter: "S", airlines: [
    { name: "Singapore Airlines", iata: "SQ", icao: "SIA", callsign: "SINGAPORE", status: "Active", hub: "Singapore Changi", countryCode: "sg", country: "Singapore" },
    { name: "Southwest Airlines", iata: "WN", icao: "SWA", callsign: "SOUTHWEST", status: "Active", hub: "Dallas Love Field", countryCode: "us", country: "United States" },
    { name: "SWISS", iata: "LX", icao: "SWR", callsign: "SWISS", status: "Active", hub: "Zürich", countryCode: "ch", country: "Switzerland" },
  ]},
  { letter: "T", airlines: [
    { name: "Trans World Airlines", iata: "TW", icao: "TWA", callsign: "TWA", status: "Ceased", hub: "St. Louis", countryCode: "us", country: "United States" },
    { name: "Turkish Airlines", iata: "TK", icao: "THY", callsign: "TURKISH", status: "Active", hub: "Istanbul", countryCode: "tr", country: "Türkiye" },
  ]},
  { letter: "U", airlines: [
    { name: "United Airlines", iata: "UA", icao: "UAL", callsign: "UNITED", status: "Active", hub: "Chicago O’Hare", countryCode: "us", country: "United States" },
  ]},
  { letter: "V", airlines: [
    { name: "Virgin Atlantic", iata: "VS", icao: "VIR", callsign: "VIRGIN", status: "Active", hub: "London Heathrow", countryCode: "gb", country: "United Kingdom" },
  ]},
  { letter: "W", airlines: [
    { name: "Wizz Air", iata: "W6", icao: "WZZ", callsign: "WIZZ AIR", status: "Active", hub: "Budapest", countryCode: "hu", country: "Hungary" },
  ]},
];

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const iataCodes = groups.flatMap((group) => group.airlines.map((airline) => airline.iata));

type CommercialPageProps = {
  searchParams: Promise<{ country?: string | string[]; status?: string | string[]; sort?: string | string[] }>;
};

export default async function CommercialAirlinesPage({ searchParams }: CommercialPageProps) {
  const query = await searchParams;
  const openFlightsAirlines = await getOpenFlightsAirlines(iataCodes);
  const statusFilter = query.status === "active" || query.status === "historic" ? query.status : "all";
  const sortOrder = query.sort === "desc" ? "desc" : "asc";
  const countryOptions = [...new Set(groups.flatMap((group) => group.airlines.map((airline) => openFlightsAirlines.get(airline.iata)?.country || airline.country)))].toSorted((a, b) => a.localeCompare(b));
  const countryFilter = typeof query.country === "string" && countryOptions.includes(query.country) ? query.country : "all";
  const displayGroups = groups
    .map((group) => ({
      ...group,
      airlines: group.airlines
        .filter((airline) => {
          const openFlights = openFlightsAirlines.get(airline.iata);
          const isActive = openFlights ? openFlights.active : airline.status === "Active";
          const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? isActive : !isActive);
          const country = openFlights?.country || airline.country;
          return matchesStatus && (countryFilter === "all" || country === countryFilter);
        })
        .toSorted((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortOrder === "asc" ? comparison : -comparison;
        }),
    }))
    .filter((group) => group.airlines.length > 0)
    .toSorted((a, b) => sortOrder === "asc" ? a.letter.localeCompare(b.letter) : b.letter.localeCompare(a.letter));
  const activeLetters = new Set(displayGroups.map((group) => group.letter));
  const resultCount = displayGroups.reduce((total, group) => total + group.airlines.length, 0);
  const sidebarHref = (updates: Record<string, string>) => {
    const params = new URLSearchParams({ status: statusFilter, sort: sortOrder });
    if (countryFilter !== "all") params.set("country", countryFilter);
    Object.entries(updates).forEach(([key, value]) => params.set(key, value));
    return `/commercial?${params.toString()}`;
  };

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
          <Link href="/contribute" className="article-link mt-1 inline-block">Sign up to contribute.</Link>
        </aside>
      </section>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-card p-4 shadow-xs lg:sticky lg:top-6" aria-label="Sort and filter commercial airlines">
          <div className="flex items-baseline justify-between border-b pb-3">
            <h2 className="font-semibold">Commercial airlines</h2>
            <span className="font-mono text-xs text-muted-foreground">{resultCount}</span>
          </div>
          <div className="mt-4">
            <h3 className="field-label">Show</h3>
            <nav className="mt-2 grid gap-1" aria-label="Filter airlines by status">
              {[["all", "All airlines"], ["active", "Active"], ["historic", "Historic"]].map(([value, label]) => (
                <Link key={value} href={sidebarHref({ status: value })} aria-current={statusFilter === value ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition-colors ${statusFilter === value ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</Link>
              ))}
            </nav>
          </div>
          <div className="mt-5 border-t pt-4">
            <h3 className="field-label">Country</h3>
            <AirlineCountryFilter countries={countryOptions} value={countryFilter} />
          </div>
          <div className="mt-5 border-t pt-4">
            <h3 className="field-label">Sort by name</h3>
            <nav className="mt-2 grid gap-1" aria-label="Sort airlines alphabetically">
              {[["asc", "A to Z"], ["desc", "Z to A"]].map(([value, label]) => (
                <Link key={value} href={sidebarHref({ sort: value })} aria-current={sortOrder === value ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm transition-colors ${sortOrder === value ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</Link>
              ))}
            </nav>
          </div>
        </aside>

        <div>
          <nav className="mb-9 flex flex-wrap gap-1.5 border-y py-4" aria-label="Airline alphabet index">
            {alphabet.map((letter) => activeLetters.has(letter) ? <a key={letter} href={`#letter-${letter}`} className="grid size-8 place-items-center rounded-md bg-foreground font-mono text-xs font-semibold text-background transition-colors hover:bg-primary">{letter}</a> : <span key={letter} className="grid size-8 place-items-center rounded-md font-mono text-xs text-muted-foreground/35">{letter}</span>)}
          </nav>
          <div className="space-y-12">
        {displayGroups.map((group) => (
          <section id={`letter-${group.letter}`} key={group.letter} className="scroll-mt-24">
            <div className="mb-4 flex items-end gap-4 border-b pb-3"><h2 className="font-mono text-4xl font-semibold text-primary">{group.letter}</h2><span className="mb-1 text-sm text-muted-foreground">{group.airlines.length} {group.airlines.length === 1 ? "airline" : "airlines"}</span></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.airlines.map((airline) => {
                const openFlights = openFlightsAirlines.get(airline.iata);
                const name = openFlights?.name || airline.name;
                const status = openFlights ? (openFlights.active ? "Active" : "Ceased") : airline.status;

                return (
                <Link
                  key={airline.name}
                  href={`/commercial/${normalizeSlug(name)}?iata=${encodeURIComponent(airline.iata)}`}
                  className="group block"
                  aria-label={`View ${name}`}
                >
                  <Card className="h-full gap-0 overflow-hidden py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex h-28 items-center justify-center border-b bg-white p-5">
                      <Image src={`https://images.kiwi.com/airlines/64/${airline.iata}.png`} alt={`${name} logo`} width={64} height={64} unoptimized className="max-h-16 w-auto object-contain transition-transform group-hover:scale-105" />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{name}</h3>
                      <Badge variant="secondary" className="mt-3 rounded-full font-normal">
                        <Image src={`https://flagcdn.com/w40/${airline.countryCode}.png`} alt="" width={20} height={15} unoptimized className="h-3.5 w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]" />
                        {openFlights?.country || airline.country}
                      </Badge>
                      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-4 text-sm">
                        <div><dt className="field-label">IATA / ICAO</dt><dd className="mt-1 font-mono font-medium">{airline.iata} / {openFlights?.icao || airline.icao}</dd></div>
                        <div><dt className="field-label">Status</dt><dd className="mt-1"><Badge variant="outline" className={status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-100 text-zinc-600"}>{status}</Badge></dd></div>
                        <div><dt className="field-label">Callsign</dt><dd className="mt-1 font-mono text-xs font-medium">{openFlights?.callsign || airline.callsign}</dd></div>
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
