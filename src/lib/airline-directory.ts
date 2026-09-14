import { canonicalCountry } from "./countries";
import type { SearchDocument } from "./search-types";

export const airlineDirectoryGroups = [
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


export const airlineDirectory = airlineDirectoryGroups.flatMap((group) => group.airlines);

/** Keep established article URLs when the directory uses a shorter display name. */
export function directoryArticleName(name: string) {
  const names: Record<string, string> = {
    KLM: "KLM Royal Dutch Airlines",
    "Virgin Atlantic": "Virgin Atlantic Airways",
    SWISS: "Swiss International Air Lines",
  };
  return names[name] || name;
}


/** The approved catalogue controls membership and URLs; curated data fills missing details. */
export function buildAirlineDirectory(documents: SearchDocument[]) {
  const airlines = documents.filter((document) => document.contentType === "airline").map((document) => {
    const fallback = airlineDirectory.find((airline) =>
      directoryArticleName(airline.name).toLowerCase() === document.title.toLowerCase() ||
      directoryArticleName(airline.name).toLowerCase().replace(/[^a-z0-9]+/g, "-") === document.slug);
    const field = (pattern: RegExp) => document.fields?.find((item) => pattern.test(item.key))?.value ||
      document.terms.find((term) => term.label && pattern.test(term.label))?.value;
    const rawCountry = field(/^country$/i) || document.countries[0] || fallback?.country || "";
    const country = canonicalCountry(rawCountry);
    const status = field(/^(operating )?status$/i) || fallback?.status || "Unknown";
    return {
      name: document.title,
      href: document.href,
      iata: field(/^iata( code)?$/i)?.trim() || fallback?.iata || "",
      icao: field(/^icao( code)?$/i)?.trim() || fallback?.icao || "",
      callsign: field(/^call ?sign$/i) || fallback?.callsign || "Unknown",
      status,
      isActive: /^(active|operating|in operation)$/i.test(status),
      isHistoric: /^(ceased|defunct|inactive|historic|closed)(\b|$)/i.test(status),
      hub: field(/^(main )?hubs?$/i) || fallback?.hub || "Unknown",
      country: country || "Unknown",
      countryCode: rawCountry.match(/f!\[([a-z]{2})\]/i)?.[1]?.toLowerCase() ||
        (country === fallback?.country ? fallback.countryCode : ""),
    };
  });
  const letters = [...new Set(airlines.map((airline) => airline.name[0].toUpperCase()))].sort();
  return letters.map((letter) => ({ letter, airlines: airlines.filter((airline) => airline.name[0].toUpperCase() === letter) }));
}
