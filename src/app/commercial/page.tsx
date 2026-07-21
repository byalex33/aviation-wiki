import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
const activeLetters = new Set(groups.map((group) => group.letter));

export default function CommercialAirlinesPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-6 sm:px-6">
      <nav className="mb-8 flex gap-2 text-[13px] text-muted-foreground" aria-label="Breadcrumb"><Link href="/" className="article-link">Main</Link><span>/</span><span className="text-foreground/75">Commercial airlines</span></nav>
      <section className="max-w-3xl"><Badge variant="secondary" className="mb-4 rounded-full text-primary">Commercial aviation</Badge><h1 className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Commercial airlines</h1><p className="mt-4 text-lg leading-8 text-muted-foreground">Browse active and historic airlines in alphabetical order, including operational codes, callsigns, status, and main hubs.</p></section>

      <nav className="my-9 flex flex-wrap gap-1.5 border-y py-4" aria-label="Airline alphabet index">
        {alphabet.map((letter) => activeLetters.has(letter) ? <a key={letter} href={`#letter-${letter}`} className="grid size-8 place-items-center rounded-md bg-foreground font-mono text-xs font-semibold text-background transition-colors hover:bg-primary">{letter}</a> : <span key={letter} className="grid size-8 place-items-center rounded-md font-mono text-xs text-muted-foreground/35">{letter}</span>)}
      </nav>

      <div className="space-y-12">
        {groups.map((group) => (
          <section id={`letter-${group.letter}`} key={group.letter} className="scroll-mt-24">
            <div className="mb-4 flex items-end gap-4 border-b pb-3"><h2 className="font-mono text-4xl font-semibold text-primary">{group.letter}</h2><span className="mb-1 text-sm text-muted-foreground">{group.airlines.length} {group.airlines.length === 1 ? "airline" : "airlines"}</span></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.airlines.map((airline) => (
                <Link href="#" key={airline.name} className="group block">
                  <Card className="h-full gap-0 overflow-hidden py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex h-28 items-center justify-center border-b bg-white p-5">
                      <Image src={`https://images.kiwi.com/airlines/64/${airline.iata}.png`} alt={`${airline.name} logo`} width={64} height={64} unoptimized className="max-h-16 w-auto object-contain transition-transform group-hover:scale-105" />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{airline.name}</h3>
                      <Badge variant="secondary" className="mt-3 rounded-full font-normal">
                        <Image src={`https://flagcdn.com/w40/${airline.countryCode}.png`} alt="" width={20} height={15} unoptimized className="h-3.5 w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]" />
                        {airline.country}
                      </Badge>
                      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-4 text-sm">
                        <div><dt className="field-label">IATA / ICAO</dt><dd className="mt-1 font-mono font-medium">{airline.iata} / {airline.icao}</dd></div>
                        <div><dt className="field-label">Status</dt><dd className="mt-1"><Badge variant="outline" className={airline.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-100 text-zinc-600"}>{airline.status}</Badge></dd></div>
                        <div><dt className="field-label">Callsign</dt><dd className="mt-1 font-mono text-xs font-medium">{airline.callsign}</dd></div>
                        <div><dt className="field-label">Main hub</dt><dd className="mt-1 font-medium leading-5">{airline.hub}</dd></div>
                      </dl>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
