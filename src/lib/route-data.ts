export type RouteSource = {
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
};

export type RouteAirport = {
  iata: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
};

export type AviationRouteDefinition = {
  slug: string;
  origin: RouteAirport;
  destination: RouteAirport;
  checkedAt: string;
  /** Long advisory sentence shown in the great-circle disclaimer banner. */
  typicalFlightTime: string;
  /** Short value + caption for the "typical flight time" fact tile. */
  flightTime: { summary: string; detail: string };
  currentAirlines: Array<{ name: string; note?: string }>;
  aircraft: Array<{ name: string; note: string }>;
  historicOperators: Array<{ name: string; note: string }>;
  history: Array<{ year: string; title: string; detail: string }>;
  sources: RouteSource[];
};

const degreesToRadians = (value: number) => value * Math.PI / 180;

export function greatCircleDistanceKm(origin: RouteAirport, destination: RouteAirport) {
  const latitudeDelta = degreesToRadians(destination.latitude - origin.latitude);
  const longitudeDelta = degreesToRadians(destination.longitude - origin.longitude);
  const originLatitude = degreesToRadians(origin.latitude);
  const destinationLatitude = degreesToRadians(destination.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function routeDistance(definition: AviationRouteDefinition) {
  const kilometres = greatCircleDistanceKm(definition.origin, definition.destination);
  return {
    kilometres: Math.round(kilometres),
    miles: Math.round(kilometres * 0.621371),
    nauticalMiles: Math.round(kilometres * 0.539957),
  };
}

export function routeIataPair(definition: AviationRouteDefinition) {
  return `${definition.origin.iata}–${definition.destination.iata}`;
}

/** Span of years covered by the sourced history entries, or null if none. */
export function routeHistoryRange(definition: AviationRouteDefinition) {
  const years = definition.history.flatMap((item) =>
    (item.year.match(/\d{4}/g) ?? []).map(Number),
  );
  if (!years.length) return null;
  return { from: String(Math.min(...years)), to: String(Math.max(...years)) };
}

export const aviationRoutes: AviationRouteDefinition[] = [
  {
    slug: "lhr-jfk",
    origin: { iata: "LHR", name: "Heathrow Airport", city: "London", latitude: 51.47, longitude: -0.4543 },
    destination: { iata: "JFK", name: "John F. Kennedy International Airport", city: "New York", latitude: 40.6413, longitude: -73.7781 },
    checkedAt: "2026-08-30",
    typicalFlightTime: "About 7–8 hours westbound; eastbound services are often shorter with favourable winds.",
    flightTime: { summary: "About 7–8 hours", detail: "Direction, winds and routing vary" },
    currentAirlines: [
      { name: "American Airlines" },
      { name: "British Airways", note: "Nine Heathrow–JFK flights announced for the 2026 summer schedule." },
      { name: "Delta Air Lines" },
      { name: "JetBlue", note: "Two daily year-round flights in JetBlue's published 2026 transatlantic schedule." },
      { name: "Virgin Atlantic" },
    ],
    aircraft: [
      { name: "Boeing 777", note: "The most frequent aircraft family in Virgin Atlantic and Imperial College London's 2019–2021 route sample; BA also assigned a 777-200 to its added 2026 frequency." },
      { name: "Airbus A350", note: "Virgin Atlantic introduced its A350-1000 on Heathrow–JFK and later paired it with the A330-900neo on added New York capacity." },
      { name: "Airbus A330", note: "A recurring family in the published route sample; Virgin Atlantic specifically scheduled the A330-900neo." },
      { name: "Boeing 787 Dreamliner", note: "Documented in the route sample; American has announced a 787-9 for a fourth daily JFK–LHR flight beginning in 2027." },
      { name: "Airbus A321LR", note: "JetBlue launched its Heathrow service with the long-range A321 in 2021." },
      { name: "Boeing 747", note: "A major historic type: Pan Am's first 747 arrival at Heathrow came from New York in 1970." },
      { name: "Concorde", note: "British Airways' historic supersonic service linked JFK and Heathrow until 2003." },
    ],
    historicOperators: [
      { name: "Pan American World Airways", note: "Pan Am operated the route in the 1960s and brought the first Boeing 747 arrival from New York to Heathrow in 1970." },
      { name: "British Airways Concorde", note: "The operator remains current, but its Concorde service is historic; the last scheduled commercial Concorde flight was JFK–LHR in 2003." },
    ],
    history: [
      { year: "1964", title: "Pan Am Flight 101 and Beatlemania", detail: "The Beatles departed Heathrow for JFK on Pan Am Flight 101, one of the route's best-known cultural moments." },
      { year: "1970", title: "The jumbo era arrives", detail: "Heathrow's first Boeing 747 arrived from New York on a Pan Am flight with 324 passengers." },
      { year: "1988–1991", title: "Virgin Atlantic joins and moves to Heathrow", detail: "Virgin Atlantic launched London–JFK in 1988 and began Heathrow operations in July 1991." },
      { year: "1996", title: "Record Concorde crossing", detail: "British Airways Concorde G-BOAD completed New York to London in 2 hours 52 minutes 59 seconds." },
      { year: "2003", title: "Scheduled Concorde service ends", detail: "BA002 from JFK to Heathrow became British Airways' final scheduled commercial Concorde flight." },
      { year: "2021", title: "JetBlue enters the market", detail: "JetBlue launched JFK–Heathrow with an Airbus A321LR, adding a single-aisle transatlantic product to the route." },
      { year: "2026", title: "Frequency and aircraft changes", detail: "British Airways published nine Heathrow–JFK flights for summer, while JetBlue listed two daily year-round services." },
    ],
    sources: [
      { title: "Hop the pond from Heathrow to New York", publisher: "Heathrow Airport", url: "https://www.heathrow.com/heathrow-blog/hop-the-pond-from-heathrow-to-new-york", publishedAt: "2025-09-08" },
      { title: "Heathrow's your gateway to the World Cup", publisher: "Heathrow Airport", url: "https://www.heathrow.com/heathrow-blog/heathrows-your-gateway-to-the-world-cup" },
      { title: "British Airways 2026 summer schedule", publisher: "British Airways", url: "https://mediacentre.britishairways.com/news/21082025/british-airways-2026-summer-schedule-takes-off-boosting-flights-to-destinations-including-bangkok-miami-and-jamaica", publishedAt: "2025-08-21" },
      { title: "JetBlue 2026 transatlantic service", publisher: "JetBlue", url: "https://www.news.jetblue.com/latest-news/press-release-details/2026/JetBlue-Expands-Transatlantic-Service-from-Boston-with-New-Flights-to-Barcelona-Starting-Today/default.aspx", publishedAt: "2026-04-16" },
      { title: "JetBlue launches New York–Heathrow", publisher: "JetBlue", url: "https://news.jetblue.com/latest-news/press-release-details/2021/JetBlue-Shakes-Up-Transatlantic-Market-with-Attractive-Fares-and-Award-Winning-Service-Between-New-York-and-London-as-U.K.-Opens-to-U.S.-Based-Travelers-08-12-2021/default.aspx", publishedAt: "2021-08-12" },
      { title: "Virgin Atlantic increases New York capacity", publisher: "Virgin Atlantic", url: "https://corporate.virginatlantic.com/gb/en/media/press-releases/virgin-atlantic-increases-capacity-to-usa-for-summer-2024.html" },
      { title: "Flight100 Imperial report", publisher: "Virgin Atlantic and Imperial College London", url: "https://corporate.virginatlantic.com/content/dam/corporate/flight100/Flight100_Imperial_report_20240429.pdf", publishedAt: "2024-04-29" },
      { title: "Celebrating Concorde", publisher: "British Airways", url: "https://www.britishairways.com/content/fr/fr/information/about-ba/history-and-heritage/celebrating-concorde" },
      { title: "Heathrow turns 80", publisher: "Heathrow Airport", url: "https://prod.gk.heathrow.com/at-the-airport/80" },
      { title: "Virgin Atlantic history", publisher: "Virgin Atlantic", url: "https://corporate.virginatlantic.com/content/dam/corporate/media-centre/Press%20Kit-2024.pdf", publishedAt: "2024" },
    ],
  },
];

export function aviationRoute(slug: string) {
  return aviationRoutes.find((route) => route.slug === slug);
}
