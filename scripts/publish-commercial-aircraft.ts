import assert from "node:assert/strict";

import { isCommercialAircraft } from "../src/lib/article-categories";
import { parseArticleMarkdown } from "../src/lib/article-markdown";
import type {
  RevisionContent,
  SourceLink,
  StructuredField,
} from "../src/lib/wiki-types";

type Source = Required<
  Pick<SourceLink, "identifier" | "title" | "publisher" | "url">
>;

type AircraftSeed = {
  slug: string;
  title: string;
  image: string;
  credit: string;
  fields: StructuredField[];
  introduction: string;
  development: string;
  variants: string;
  operators: string;
  engines: string;
  orders: string;
  accidents: string;
  comparisons: Array<[string, string]>;
  sources: Source[];
};

const accessedAt = "2026-07-27";
const airbusOrders =
  "https://www.airbus.com/en/products-services/commercial-aircraft/orders-and-deliveries";
const boeingHistory =
  "https://www.boeing.com/content/dam/boeing/v2/company/history/pdf/Boeing_Products.pdf";
const boeingOrders = "https://www.boeing.com/commercial#orders-deliveries";

const primary = (
  identifier: string,
  title: string,
  publisher: string,
  url: string,
): Source => ({ identifier, title, publisher, url });

const seeds: AircraftSeed[] = [
  {
    slug: "airbus-a380",
    title: "Airbus A380",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Air_France_A380_F-HPJA.jpg/1920px-Air_France_A380_F-HPJA.jpg",
    credit:
      "Photo by Joe Ravi via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Air_France_A380_F-HPJA.jpg)",
    fields: [
      { key: "Type", value: "Four-engine double-deck wide-body airliner" },
      { key: "Manufacturer", value: "Airbus" },
      { key: "First flight", value: "27 April 2005" },
      { key: "Entry into service", value: "25 October 2007" },
      { key: "Production", value: "2003–2021" },
      { key: "Status", value: "In service; production ended" },
      { key: "Variants", value: "A380-800; A380F proposed" },
      { key: "Typical seating", value: "About 545 passengers" },
      { key: "Range", value: "8,000 nmi (14,800 km)" },
      { key: "Length", value: "72.7 m (238 ft 7 in)" },
      { key: "Wingspan", value: "79.8 m (261 ft 10 in)" },
      {
        key: "Engines",
        value: "4 × Rolls-Royce Trent 900 or Engine Alliance GP7200",
      },
    ],
    introduction:
      "The **Airbus A380** is the world's largest passenger airliner, with two full-length decks and four engines. Airbus designed it for dense long-haul routes between major hubs.[^airbus]",
    development:
      "Airbus developed the A3XX during the 1990s and launched it as the A380 in 2000. The prototype flew in 2005, certification followed in 2006, and Singapore Airlines opened commercial service in 2007. Final assembly ended after the last delivery to Emirates in 2021.[^airbus]",
    variants:
      "The only production model was the passenger A380-800. Airbus studied stretched versions and launched an A380F freighter, but the freighter was suspended before production.",
    operators:
      "**Current operators include** Emirates, Singapore Airlines, British Airways, Qantas, Lufthansa, Qatar Airways, Etihad Airways, Korean Air and ANA. **Former operators include** Air France, Malaysia Airlines, Thai Airways and China Southern. Lists are representative rather than exhaustive.",
    engines:
      "Operators selected either the Rolls-Royce Trent 900 or Engine Alliance GP7200, both four-engine installations developed for the A380.",
    orders:
      "Airbus delivered 251 production A380s. The programme is closed, so the manufacturer’s historical orders-and-deliveries workbook is the stable reference for the final total.[^orders]",
    accidents:
      "The type has had no fatal passenger accident. Its best-known serious incident was Qantas Flight 32 in 2010, when an uncontained Trent 900 failure damaged multiple aircraft systems; the Australian Transport Safety Bureau traced the initiating failure to an oil-feed pipe.[^safety]",
    comparisons: [
      ["boeing-747", "Boeing 747"],
      ["boeing-777", "Boeing 777"],
      ["airbus-a350", "Airbus A350"],
    ],
    sources: [
      primary(
        "airbus",
        "A380",
        "Airbus",
        "https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a380",
      ),
      primary("orders", "Airbus orders and deliveries", "Airbus", airbusOrders),
      primary(
        "safety",
        "Qantas Flight 32 final investigation report",
        "Australian Transport Safety Bureau",
        "https://www.atsb.gov.au/investigations/ao-2010-089",
      ),
    ],
  },
  {
    slug: "boeing-747",
    title: "Boeing 747",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Lufthansa_Boeing_747-8_D-ABYI_IAD_VA1.jpg/1920px-Lufthansa_Boeing_747-8_D-ABYI_IAD_VA1.jpg",
    credit:
      "Photo by Acroterion via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lufthansa_Boeing_747-8_D-ABYI_IAD_VA1.jpg)",
    fields: [
      { key: "Type", value: "Four-engine wide-body airliner and freighter" },
      { key: "Manufacturer", value: "Boeing" },
      { key: "First flight", value: "9 February 1969" },
      { key: "Entry into service", value: "22 January 1970" },
      { key: "Production", value: "1968–2023" },
      { key: "Status", value: "In service; production ended" },
      {
        key: "Variants",
        value: "747-100, SP, -200, -300, -400 and 747-8 families",
      },
      { key: "747-8I typical seating", value: "410 passengers" },
      { key: "747-8I range", value: "7,730 nmi (14,320 km)" },
      { key: "747-8 length", value: "76.3 m (250 ft 2 in)" },
      { key: "747-8 wingspan", value: "68.4 m (224 ft 7 in)" },
      {
        key: "Engines",
        value: "JT9D, CF6, RB211 or GEnx, depending on variant",
      },
    ],
    introduction:
      "The **Boeing 747** is a four-engine wide-body aircraft distinguished by its forward upper deck. It transformed long-distance travel by combining unprecedented passenger capacity with intercontinental range.[^boeing]",
    development:
      "Boeing developed the 747 after Pan American requested a much larger long-range aircraft. The first 747-100 flew in 1969 and entered service in 1970. Successive generations increased range, payload and automation; the final 747-8F left the production line in 2023.[^boeing]",
    variants:
      "Principal families were the 747-100, short-bodied 747SP, -200, -300, -400 and 747-8. Passenger, combi and dedicated freighter versions were produced.",
    operators:
      "**Current operators include** Lufthansa and Air China in passenger service, plus Cargolux, Atlas Air, UPS Airlines and Cathay Pacific Cargo. **Former operators include** Pan Am, British Airways, Qantas, Japan Airlines, United, Northwest and Singapore Airlines.",
    engines:
      "Early aircraft used Pratt & Whitney JT9Ds; later variants added General Electric CF6 and Rolls-Royce RB211 choices. The 747-8 uses General Electric GEnx-2B engines.",
    orders:
      "Boeing delivered 1,574 aircraft across all 747 variants, a final figure because production has ended.[^orders]",
    accidents:
      "The 747's long service includes major accidents with varied causes. The NTSB found that TWA Flight 800 broke up in 1996 after the centre-wing fuel tank exploded, probably following an electrical ignition source.[^safety]",
    comparisons: [
      ["airbus-a380", "Airbus A380"],
      ["boeing-777", "Boeing 777"],
      ["mcdonnell-douglas-dc-10", "McDonnell Douglas DC-10"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary("orders", "Boeing orders and deliveries", "Boeing", boeingOrders),
      primary(
        "safety",
        "TWA Flight 800 accident report",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/accidentreports/reports/aar0003.pdf",
      ),
    ],
  },
  {
    slug: "boeing-737-family",
    title: "Boeing 737 family",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Southwest_Boeing_737-700_N955WN_BWI_MD3.jpg/1920px-Southwest_Boeing_737-700_N955WN_BWI_MD3.jpg",
    credit:
      "Photo by Acroterion via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-700_N955WN_BWI_MD3.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine narrow-body airliner" },
      { key: "Manufacturer", value: "Boeing" },
      { key: "First flight", value: "9 April 1967" },
      { key: "Entry into service", value: "10 February 1968" },
      { key: "Production", value: "1966–present" },
      { key: "Status", value: "In production and service" },
      {
        key: "Variants",
        value: "Original, Classic, Next Generation and MAX families",
      },
      { key: "Seating", value: "About 85–230 passengers by variant" },
      { key: "MAX range", value: "Up to about 3,850 nmi (7,130 km)" },
      { key: "Length", value: "28.6–43.8 m (93 ft 8 in–143 ft 8 in)" },
      { key: "Wingspan", value: "28.3–35.9 m (93–117 ft 10 in)" },
      { key: "Engines", value: "JT8D, CFM56 or CFM LEAP-1B" },
    ],
    introduction:
      "The **Boeing 737 family** is a series of twin-engine narrow-body airliners spanning four main generations. It serves short- and medium-haul networks, low-cost carriers and specialised government roles.[^boeing]",
    development:
      "Boeing launched the original 737 as a smaller companion to the 727. The -100 first flew in 1967; the longer -200 established the programme commercially. The Classic, Next Generation and MAX families successively introduced larger cabins, new wings, digital flight decks and more efficient engines.[^boeing]",
    variants:
      "The Original family comprises the -100 and -200; Classics are the -300/-400/-500; Next Generation models are the -600/-700/-800/-900; and the MAX line comprises the 737-7, -8, -9 and -10.",
    operators:
      "**Current operators include** Southwest, Ryanair, United, American, Alaska Airlines, flydubai, Lion Air and many state and charter fleets. **Former operators include** British Airways, Britannia, US Airways and numerous carriers that retired early generations.",
    engines:
      "Original aircraft use low-bypass Pratt & Whitney JT8Ds, Classic and Next Generation aircraft use CFM56s, and the MAX uses CFM International LEAP-1B engines.",
    orders:
      "Because the family remains in production, totals change monthly. Boeing's official orders-and-deliveries tables are the direct source for current orders, backlog and deliveries.[^orders]",
    accidents:
      "The family has experienced accidents across six decades. After two fatal 737 MAX 8 accidents, the FAA grounded the MAX, reviewed its flight-control changes and required design, training and maintenance actions before return to service in 2020.[^safety]",
    comparisons: [
      ["airbus-a320-family", "Airbus A320 family"],
      ["boeing-757", "Boeing 757"],
      ["airbus-a220", "Airbus A220"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary("orders", "Boeing orders and deliveries", "Boeing", boeingOrders),
      primary(
        "safety",
        "Summary of the FAA's review of the Boeing 737 MAX",
        "Federal Aviation Administration",
        "https://www.faa.gov/sites/faa.gov/files/2022-08/737_RTS_Summary.pdf",
      ),
    ],
  },
  {
    slug: "airbus-a320-family",
    title: "Airbus A320 family",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Lufthansa_Airbus_A320-211_D-AIQT_01.jpg/1920px-Lufthansa_Airbus_A320-211_D-AIQT_01.jpg",
    credit:
      "Photo by Julian Herzog via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lufthansa_Airbus_A320-211_D-AIQT_01.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine narrow-body airliner family" },
      { key: "Manufacturer", value: "Airbus" },
      { key: "First flight", value: "22 February 1987" },
      { key: "Entry into service", value: "18 April 1988" },
      { key: "Production", value: "1986–present" },
      { key: "Status", value: "In production and service" },
      {
        key: "Variants",
        value: "A318, A319, A320 and A321; ceo and neo generations",
      },
      { key: "Seating", value: "About 100–244 passengers by variant" },
      { key: "Range", value: "Up to 4,700 nmi (8,700 km) for A321XLR" },
      { key: "Length", value: "31.4–44.5 m (103 ft 1 in–146 ft)" },
      { key: "Wingspan", value: "35.8 m (117 ft 5 in) with sharklets" },
      { key: "Engines", value: "CFM56, V2500, LEAP-1A or PW1100G" },
    ],
    introduction:
      "The **Airbus A320 family** is a range of twin-engine narrow-body airliners. The original A320 introduced digital fly-by-wire flight controls to mainstream commercial service and became the basis for a broad common-type family.[^airbus]",
    development:
      "Airbus launched the A320 in 1984 to compete in the single-aisle market. It first flew in 1987 and entered service with Air France in 1988. The shorter A319 and A318 and longer A321 followed; the neo generation added new engines and aerodynamic changes.[^airbus]",
    variants:
      "The family covers the A318, A319, A320 and A321. Each major model has current-engine-option (ceo) and, except the A318, new-engine-option (neo) derivatives; the A321LR and A321XLR extend range.",
    operators:
      "**Current operators include** easyJet, IndiGo, American, Delta, JetBlue, Lufthansa, British Airways, Wizz Air and AirAsia. **Former operators include** Northwest, US Airways, Ansett Australia and carriers absorbed through mergers.",
    engines:
      "A320ceo-family aircraft use CFM56 or International Aero Engines V2500 turbofans. Neo-family aircraft use CFM LEAP-1A or Pratt & Whitney PW1100G geared turbofans.",
    orders:
      "The family remains in production, so exact totals move monthly. Airbus's official workbook supplies current orders, cancellations, backlog and deliveries by model.[^orders]",
    accidents:
      "Selected events include US Airways Flight 1549, which ditched on the Hudson River in 2009 after bird strikes caused an almost complete loss of thrust in both engines. All 155 occupants survived.[^safety]",
    comparisons: [
      ["boeing-737-family", "Boeing 737 family"],
      ["airbus-a220", "Airbus A220"],
      ["boeing-757", "Boeing 757"],
    ],
    sources: [
      primary(
        "airbus",
        "A320 family",
        "Airbus",
        "https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a320-family",
      ),
      primary("orders", "Airbus orders and deliveries", "Airbus", airbusOrders),
      primary(
        "safety",
        "US Airways Flight 1549 accident report",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/accidentreports/reports/aar1003.pdf",
      ),
    ],
  },
  {
    slug: "boeing-777",
    title: "Boeing 777",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Boeing_777-300ER%2C_Geneva_Airport%2C_Le_Grand-Saconnex_%28BL7C0540%29.jpg/1920px-Boeing_777-300ER%2C_Geneva_Airport%2C_Le_Grand-Saconnex_%28BL7C0540%29.jpg",
    credit:
      "Photo by Matti Blume via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Boeing_777-300ER,_Geneva_Airport,_Le_Grand-Saconnex_(BL7C0540).jpg)",
    fields: [
      { key: "Type", value: "Twin-engine wide-body airliner and freighter" },
      { key: "Manufacturer", value: "Boeing" },
      { key: "First flight", value: "12 June 1994" },
      { key: "Entry into service", value: "7 June 1995" },
      { key: "Production", value: "1993–present" },
      { key: "Status", value: "In production and service" },
      {
        key: "Variants",
        value: "777-200, -200ER, -200LR, -300, -300ER, Freighter and 777X",
      },
      { key: "Typical seating", value: "About 301–426 passengers" },
      { key: "Range", value: "About 5,240–8,555 nmi by passenger variant" },
      { key: "Length", value: "63.7–76.7 m (209 ft 1 in–251 ft 9 in)" },
      { key: "Wingspan", value: "60.9 m; 71.8 m on 777X" },
      { key: "Engines", value: "PW4000, Trent 800, GE90 or GE9X" },
    ],
    introduction:
      "The **Boeing 777** is a family of long-range twin-engine wide-body aircraft. It was Boeing's first commercial aircraft designed entirely with computer-aided methods and established very-large twinjets on intercontinental routes.[^boeing]",
    development:
      "Boeing developed the 777 with an airline working group to fill the gap between the 767 and 747. The first 777-200 flew in 1994 and United introduced it in 1995. Longer-range, stretched and freighter versions followed; the composite-wing 777X is the next generation.[^boeing]",
    variants:
      "The original family includes the 777-200/-200ER, -200LR, -300/-300ER and 777 Freighter. The 777X family comprises the 777-8, 777-9 and 777-8 Freighter.",
    operators:
      "**Current operators include** Emirates, United, Qatar Airways, British Airways, Air France, Cathay Pacific, Singapore Airlines and FedEx Express. **Former operators of early variants include** Delta and carriers that replaced their -200 fleets with newer wide-bodies.",
    engines:
      "Early models offered Pratt & Whitney PW4000, Rolls-Royce Trent 800 and General Electric GE90 engines. Later 777s became GE-exclusive; the 777X uses the GE9X.",
    orders:
      "The 777 and 777X remain active programmes. Boeing's official tables are the reliable source for changing orders, unidentified customers, cancellations, backlog and deliveries.[^orders]",
    accidents:
      "Selected accidents include Asiana Airlines Flight 214, a 777-200ER that struck the seawall on approach to San Francisco in 2013. The NTSB identified mismanaged descent and airspeed among the causal factors.[^safety]",
    comparisons: [
      ["airbus-a350", "Airbus A350"],
      ["boeing-787-dreamliner", "Boeing 787 Dreamliner"],
      ["airbus-a380", "Airbus A380"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary("orders", "Boeing orders and deliveries", "Boeing", boeingOrders),
      primary(
        "safety",
        "Asiana Airlines Flight 214 accident report",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/accidentreports/reports/aar1401.pdf",
      ),
    ],
  },
  {
    slug: "boeing-787-dreamliner",
    title: "Boeing 787 Dreamliner",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Qatar_Airways_Boeing_787-8_Dreamliner_A7-BCA_MUC_2015_06.jpg/1920px-Qatar_Airways_Boeing_787-8_Dreamliner_A7-BCA_MUC_2015_06.jpg",
    credit:
      "Photo by Julian Herzog via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Qatar_Airways_Boeing_787-8_Dreamliner_A7-BCA_MUC_2015_06.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine wide-body airliner" },
      { key: "Manufacturer", value: "Boeing" },
      { key: "First flight", value: "15 December 2009" },
      { key: "Entry into service", value: "26 October 2011" },
      { key: "Production", value: "2007–present" },
      { key: "Status", value: "In production and service" },
      { key: "Variants", value: "787-8, 787-9 and 787-10" },
      { key: "Typical seating", value: "About 248–336 passengers" },
      { key: "Range", value: "About 6,330–7,565 nmi by variant" },
      { key: "Length", value: "56.7–68.3 m (186–224 ft 1 in)" },
      { key: "Wingspan", value: "60.1 m (197 ft 3 in)" },
      { key: "Engines", value: "General Electric GEnx-1B or Rolls-Royce Trent 1000" },
    ],
    introduction:
      "The **Boeing 787 Dreamliner** is a long-range twin-engine wide-body family built extensively from carbon-fibre composite structures. It was designed to connect long thin routes with lower fuel use than earlier aircraft of similar capacity.[^boeing]",
    development:
      "Boeing announced the 7E7 concept in 2003 and renamed it the 787. A globally distributed production system contributed to programme delays; first flight occurred in 2009 and ANA received the first delivery in 2011. The longer 787-9 and 787-10 followed.[^boeing]",
    variants:
      "The 787-8 is the shortest and longest-ranged baseline model, the 787-9 adds capacity while retaining long range, and the 787-10 prioritises capacity on somewhat shorter sectors.",
    operators:
      "**Current operators include** ANA, United, American, British Airways, Air Canada, Qatar Airways, Etihad, Qantas and Air New Zealand. **Former operators include** Norwegian and Jet Airways, whose aircraft moved to other carriers or lessors.",
    engines:
      "Customers may choose the General Electric GEnx-1B or Rolls-Royce Trent 1000. Both use a common aircraft interface intended to ease engine interchangeability.",
    orders:
      "The programme remains in production, and Boeing publishes monthly orders and deliveries by model. Those tables should be used instead of a frozen total.[^orders]",
    accidents:
      "Early service included lithium-ion battery events. The NTSB investigated a 2013 auxiliary-power-unit battery fire on a parked Japan Airlines 787 in Boston; regulators required battery-system modifications before operations resumed.[^safety]",
    comparisons: [
      ["airbus-a350", "Airbus A350"],
      ["airbus-a330", "Airbus A330"],
      ["boeing-777", "Boeing 777"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary("orders", "Boeing orders and deliveries", "Boeing", boeingOrders),
      primary(
        "safety",
        "Japan Airlines 787 battery fire incident report",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/accidentreports/reports/air1401.pdf",
      ),
    ],
  },
  {
    slug: "airbus-a350",
    title: "Airbus A350",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Airbus_A350-941_F-WWCF_MSN002_ILA_Berlin_2016_17.jpg/1920px-Airbus_A350-941_F-WWCF_MSN002_ILA_Berlin_2016_17.jpg",
    credit:
      "Photo by Julian Herzog via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Airbus_A350-941_F-WWCF_MSN002_ILA_Berlin_2016_17.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine wide-body airliner" },
      { key: "Manufacturer", value: "Airbus" },
      { key: "First flight", value: "14 June 2013" },
      { key: "Entry into service", value: "15 January 2015" },
      { key: "Production", value: "2010–present" },
      { key: "Status", value: "In production and service" },
      { key: "Variants", value: "A350-900, -900ULR, -1000 and A350F" },
      { key: "Typical seating", value: "About 300–410 passengers" },
      { key: "Range", value: "About 8,100–9,700 nmi by variant" },
      { key: "Length", value: "66.8–73.8 m (219 ft 2 in–242 ft 1 in)" },
      { key: "Wingspan", value: "64.8 m (212 ft 5 in)" },
      { key: "Engines", value: "2 × Rolls-Royce Trent XWB" },
    ],
    introduction:
      "The **Airbus A350** is a long-range twin-engine wide-body family with a carbon-fibre fuselage and wing. Airbus developed it for high-capacity intercontinental routes and as a competitor to the Boeing 787 and 777.[^airbus]",
    development:
      "Airbus substantially redesigned its initial A350 proposal after airline feedback, launching the wider A350 XWB in 2006. The A350-900 first flew in 2013 and Qatar Airways introduced it in 2015; the larger -1000 entered service in 2018.[^airbus]",
    variants:
      "Production passenger models are the A350-900 and stretched A350-1000. The -900ULR supports exceptionally long routes, while the A350F is a purpose-built freighter under development.",
    operators:
      "**Current operators include** Singapore Airlines, Qatar Airways, Cathay Pacific, Lufthansa, Delta, Air France, British Airways and Japan Airlines. **Former operation is limited**, mostly to short leases or fleet transfers; LATAM disposed of its original fleet.",
    engines:
      "All A350 variants use Rolls-Royce Trent XWB engines. The -900 generally uses the XWB-84 series and the larger -1000 uses the higher-thrust XWB-97.",
    orders:
      "The A350 remains in production. Airbus reports more than 1,500 family orders and more than 700 deliveries; the live workbook is authoritative as totals change.[^orders]",
    accidents:
      "The first hull loss occurred in the 2024 runway collision at Tokyo Haneda involving Japan Airlines Flight 516 and a Japan Coast Guard aircraft. Everyone aboard the A350 evacuated; the JTSB's investigation material should be consulted for established findings.[^safety]",
    comparisons: [
      ["boeing-787-dreamliner", "Boeing 787 Dreamliner"],
      ["boeing-777", "Boeing 777"],
      ["airbus-a330", "Airbus A330"],
    ],
    sources: [
      primary(
        "airbus",
        "A350 family",
        "Airbus",
        "https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a350-family",
      ),
      primary("orders", "Airbus orders and deliveries", "Airbus", airbusOrders),
      primary(
        "safety",
        "Haneda runway collision interim investigation report",
        "Japan Transport Safety Board",
        "https://jtsb.mlit.go.jp/eng-air_report/interim20241225-JA722A_JA13XJ.pdf",
      ),
    ],
  },
  {
    slug: "airbus-a330",
    title: "Airbus A330",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Virgin_Atlantic_Airbus_A330-900_G-VEII_IAD_VA1.jpg/1920px-Virgin_Atlantic_Airbus_A330-900_G-VEII_IAD_VA1.jpg",
    credit:
      "Photo by Acroterion via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Virgin_Atlantic_Airbus_A330-900_G-VEII_IAD_VA1.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine wide-body airliner and freighter" },
      { key: "Manufacturer", value: "Airbus" },
      { key: "First flight", value: "2 November 1992" },
      { key: "Entry into service", value: "17 January 1994" },
      { key: "Production", value: "1992–present" },
      { key: "Status", value: "A330neo in production; family in service" },
      {
        key: "Variants",
        value: "A330-200, -300, -200F, -800 and -900; MRTT and Beluga XL derivatives",
      },
      { key: "Typical seating", value: "About 220–300 passengers" },
      { key: "Range", value: "About 6,350–8,150 nmi by variant" },
      { key: "Length", value: "58.8–63.7 m (193–208 ft 11 in)" },
      { key: "Wingspan", value: "60.3 m ceo; 64.0 m neo" },
      { key: "Engines", value: "CF6, PW4000, Trent 700 or Trent 7000" },
    ],
    introduction:
      "The **Airbus A330** is a twin-engine wide-body family developed alongside the four-engine A340. It serves medium- and long-haul passenger routes, freight operations, air-to-air refuelling and transport roles.[^airbus]",
    development:
      "The A330 inherited the A300's wide-body cross-section and introduced a new wing and A320-style flight deck. The A330-300 first flew in 1992 and entered service in 1994; the shorter -200 followed. Airbus later re-engined the family as the A330neo.[^airbus]",
    variants:
      "A330ceo variants include the -200, -300 and -200F. The A330neo comprises the -800 and -900. Related airframes include the A330 MRTT tanker and Beluga XL oversized freighter.",
    operators:
      "**Current operators include** Delta, Turkish Airlines, Lufthansa, TAP Air Portugal, Virgin Atlantic, Cathay Pacific and China Eastern. **Former operators include** Northwest, US Airways, Air Berlin, Thomas Cook and Dragonair.",
    engines:
      "A330ceo customers selected General Electric CF6, Pratt & Whitney PW4000 or Rolls-Royce Trent 700 engines. A330neo aircraft use the Rolls-Royce Trent 7000.",
    orders:
      "Airbus continues to build the A330neo. Its official monthly workbook separates ceo and neo orders, cancellations, backlog and deliveries.[^orders]",
    accidents:
      "Selected accidents include Air France Flight 447, an A330-203 lost over the Atlantic in 2009. The BEA found that temporary airspeed inconsistencies were followed by inappropriate control inputs and a sustained stall.[^safety]",
    comparisons: [
      ["boeing-767", "Boeing 767"],
      ["boeing-787-dreamliner", "Boeing 787 Dreamliner"],
      ["airbus-a350", "Airbus A350"],
    ],
    sources: [
      primary(
        "airbus",
        "A330 family",
        "Airbus",
        "https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a330-family",
      ),
      primary("orders", "Airbus orders and deliveries", "Airbus", airbusOrders),
      primary(
        "safety",
        "Air France Flight 447 investigation",
        "Bureau d'Enquêtes et d'Analyses",
        "https://bea.aero/en/investigation-reports/notified-events/detail/accident-to-the-airbus-a330-203-registered-f-gzcp-and-operated-by-air-france-occured-on-06-01-2009-in-the-atlantic-ocean/",
      ),
    ],
  },
  {
    slug: "concorde",
    title: "Concorde",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/1/16/British_Airways_Concorde_G-BOAC_02.jpg",
    credit:
      "Photo by Eduard Marmet via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:British_Airways_Concorde_G-BOAC_02.jpg)",
    fields: [
      { key: "Type", value: "Supersonic passenger airliner" },
      {
        key: "Manufacturers",
        value: "Aérospatiale and British Aircraft Corporation",
      },
      { key: "First flight", value: "2 March 1969" },
      { key: "Entry into service", value: "21 January 1976" },
      { key: "Production", value: "1965–1979" },
      { key: "Retired", value: "26 November 2003" },
      { key: "Number built", value: "20, including prototypes" },
      { key: "Variants", value: "Prototype, pre-production and production aircraft" },
      { key: "Seating", value: "Typically 100 passengers" },
      { key: "Range", value: "About 3,900 nmi (7,200 km)" },
      { key: "Length", value: "61.66 m (202 ft 4 in)" },
      { key: "Wingspan", value: "25.6 m (84 ft)" },
      { key: "Engines", value: "4 × Rolls-Royce/Snecma Olympus 593" },
    ],
    introduction:
      "**Concorde** was a British-French supersonic passenger airliner operated by British Airways and Air France. It cruised at about Mach 2 and made scheduled transatlantic journeys in roughly half the time of conventional jetliners.[^airbus]",
    development:
      "Britain and France signed a treaty in 1962 to combine their supersonic transport projects. The French-built prototype flew in March 1969 and the British prototype followed in April. Cost escalation, environmental restrictions and the oil crisis reduced the expected market to two state airlines.[^airbus]",
    variants:
      "Twenty aircraft were built: two prototypes, two pre-production aircraft, two development aircraft and fourteen production airliners. No stretched or freight derivative entered production.",
    operators:
      "**Current operators:** none; all surviving aircraft are preserved. **Former operators:** British Airways and Air France were the principal owners and scheduled operators. Braniff conducted US domestic sectors under interchange arrangements.",
    engines:
      "Four Rolls-Royce/Snecma Olympus 593 turbojets provided reheated thrust for take-off and transonic acceleration. Variable intakes managed airflow at supersonic speed.",
    orders:
      "Twenty aircraft were completed and fourteen production examples entered airline service. This is a closed, stable production total.",
    accidents:
      "Air France Flight 4590 crashed after take-off from Paris Charles de Gaulle in 2000. The BEA found that tyre debris and fuel-tank damage led to a severe fire; modifications were made before a brief return to service.[^safety]",
    comparisons: [
      ["boeing-747", "Boeing 747"],
      ["airbus-a380", "Airbus A380"],
      ["boeing-787-dreamliner", "Boeing 787 Dreamliner"],
    ],
    sources: [
      primary(
        "airbus",
        "The day Concorde flew into the history books",
        "Airbus",
        "https://www.airbus.com/en/newsroom/stories/2019-03-the-day-concorde-flew-into-the-history-books",
      ),
      primary(
        "operator",
        "Celebrating Concorde",
        "British Airways",
        "https://www.britishairways.com/content/information/about-ba/history-and-heritage/celebrating-concorde",
      ),
      primary(
        "safety",
        "Air France Flight 4590 final report",
        "Bureau d'Enquêtes et d'Analyses",
        "https://bea.aero/uploads/tx_elydbrapports/f-sc000725a.pdf",
      ),
    ],
  },
  {
    slug: "boeing-767",
    title: "Boeing 767",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/United_Boeing_767-300_N642UA_IAD_VA1.jpg/1920px-United_Boeing_767-300_N642UA_IAD_VA1.jpg",
    credit:
      "Photo by Acroterion via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:United_Boeing_767-300_N642UA_IAD_VA1.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine wide-body airliner and freighter" },
      { key: "Manufacturer", value: "Boeing" },
      { key: "First flight", value: "26 September 1981" },
      { key: "Entry into service", value: "8 September 1982" },
      { key: "Production", value: "1979–present" },
      { key: "Status", value: "Freighter in production; family in service" },
      {
        key: "Variants",
        value: "767-200, -300, -400ER and freighter/conversion derivatives",
      },
      { key: "Typical seating", value: "About 181–269 passengers" },
      { key: "Range", value: "About 3,255–6,385 nmi by variant" },
      { key: "Length", value: "48.5–61.4 m (159 ft 2 in–201 ft 4 in)" },
      { key: "Wingspan", value: "47.6–51.9 m (156 ft 1 in–170 ft 4 in)" },
      { key: "Engines", value: "JT9D, CF6, PW4000 or RB211" },
    ],
    introduction:
      "The **Boeing 767** is a twin-engine wide-body family developed in parallel with the narrow-body 757. It opened many long-distance routes to efficient twin-engine operation and later became a major freighter platform.[^boeing]",
    development:
      "Boeing launched the 767 to replace earlier wide-bodies on medium-range routes. The 767-200 first flew in 1981 and entered service with United in 1982. Stretched, extended-range and freighter versions followed, along with the KC-46 tanker derivative.[^boeing]",
    variants:
      "Passenger models include the 767-200/-200ER, -300/-300ER and -400ER. Cargo versions include the factory 767-300F and converted freighters; the 767-2C underpins the KC-46.",
    operators:
      "**Current operators include** United, Delta, Japan Airlines, Austrian, FedEx Express, UPS Airlines, Atlas Air and DHL contractors. **Former operators include** British Airways, American, Qantas, Air Canada and Air New Zealand.",
    engines:
      "Depending on variant and customer, the 767 uses Pratt & Whitney JT9D or PW4000, General Electric CF6, or Rolls-Royce RB211 engines.",
    orders:
      "The passenger backlog is closed but freighter and tanker production continues. Boeing's monthly tables provide current commercial orders and deliveries.[^orders]",
    accidents:
      "Selected accidents include EgyptAir Flight 990, a 767-300ER lost south of Nantucket in 1999. The NTSB's official brief records its investigation, evidence and probable-cause determination.[^safety]",
    comparisons: [
      ["airbus-a330", "Airbus A330"],
      ["boeing-757", "Boeing 757"],
      ["boeing-787-dreamliner", "Boeing 787 Dreamliner"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary("orders", "Boeing orders and deliveries", "Boeing", boeingOrders),
      primary(
        "safety",
        "EgyptAir Flight 990 accident brief",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/AccidentReports/Reports/AAB0201.pdf",
      ),
    ],
  },
  {
    slug: "boeing-757",
    title: "Boeing 757",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Delta_Boeing_757-200_N699DL_BWI_MD1.jpg/1920px-Delta_Boeing_757-200_N699DL_BWI_MD1.jpg",
    credit:
      "Photo by Acroterion via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Delta_Boeing_757-200_N699DL_BWI_MD1.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine narrow-body airliner and freighter" },
      { key: "Manufacturer", value: "Boeing" },
      { key: "First flight", value: "19 February 1982" },
      { key: "Entry into service", value: "1 January 1983" },
      { key: "Production", value: "1981–2004" },
      { key: "Status", value: "In service; production ended" },
      { key: "Variants", value: "757-200, -200F, -300 and converted freighters" },
      { key: "Typical seating", value: "About 200–243 passengers" },
      { key: "Range", value: "About 2,780–3,910 nmi by variant/configuration" },
      { key: "Length", value: "47.3–54.5 m (155 ft 3 in–178 ft 7 in)" },
      { key: "Wingspan", value: "38.05 m (124 ft 10 in)" },
      { key: "Engines", value: "Rolls-Royce RB211 or Pratt & Whitney PW2000" },
    ],
    introduction:
      "The **Boeing 757** is a twin-engine narrow-body aircraft built for short- to medium-haul service with strong field performance and transcontinental range. It shares a common pilot type rating with the 767.[^boeing]",
    development:
      "Boeing developed the 757 as a more efficient successor to the 727. The prototype flew in 1982 and Eastern Air Lines introduced the type in 1983. Production ended in 2004 after passenger, freighter and stretched variants.[^boeing]",
    variants:
      "The 757-200 formed most production and was offered in passenger and factory-freighter form. The 757-300 is a longer passenger model; many -200s were later converted to freighters.",
    operators:
      "**Current operators include** Delta, United, Icelandair, FedEx Express, UPS Airlines and DHL operators. **Former operators include** American, British Airways, Northwest, Continental, US Airways and many charter airlines.",
    engines:
      "Customers selected either Rolls-Royce RB211-535 or Pratt & Whitney PW2000-series engines. Both supported the type's short-runway and hot-and-high performance.",
    orders:
      "Boeing completed 1,050 aircraft, a stable final production total.[^boeing]",
    accidents:
      "The 757 has been involved in fatal accidents and serious incidents, including American Airlines Flight 965 and Birgenair Flight 301. Boeing's annual statistical summary provides manufacturer-compiled accident counts and definitions across the commercial fleet.[^safety]",
    comparisons: [
      ["boeing-737-family", "Boeing 737 family"],
      ["airbus-a320-family", "Airbus A320 family"],
      ["boeing-767", "Boeing 767"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary(
        "safety",
        "Statistical summary of commercial jet airplane accidents",
        "Boeing",
        "https://www.boeing.com/content/dam/boeing/v2/safety/statsum.pdf",
      ),
    ],
  },
  {
    slug: "airbus-a220",
    title: "Airbus A220",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Airbus_A220-300.jpg/1920px-Airbus_A220-300.jpg",
    credit:
      "Photo by Romain Coupy via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Airbus_A220-300.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine narrow-body airliner" },
      { key: "Manufacturer", value: "Airbus Canada" },
      { key: "First flight", value: "16 September 2013" },
      { key: "Entry into service", value: "15 July 2016" },
      { key: "Production", value: "2012–present" },
      { key: "Status", value: "In production and service" },
      { key: "Variants", value: "A220-100 and A220-300" },
      { key: "Seating", value: "About 100–160 passengers" },
      { key: "Range", value: "About 3,450–3,600 nmi by variant" },
      { key: "Length", value: "35.0–38.7 m (114 ft 9 in–127 ft)" },
      { key: "Wingspan", value: "35.1 m (115 ft 1 in)" },
      { key: "Engines", value: "2 × Pratt & Whitney PW1500G" },
    ],
    introduction:
      "The **Airbus A220** is a twin-engine narrow-body family designed specifically for the 100–160-seat market. It began as the Bombardier CSeries before Airbus became the programme's majority partner and renamed it.[^airbus]",
    development:
      "Bombardier launched the CSeries in 2008. The smaller CS100 first flew in 2013 and entered service with Swiss in 2016; the larger CS300 followed with airBaltic. Airbus joined the programme in 2018, creating the A220-100 and A220-300 names.[^airbus]",
    variants:
      "The A220-100 is the shorter baseline aircraft and the A220-300 adds fuselage length and capacity. Proposed stretches have been discussed, but only these two variants are in production.",
    operators:
      "**Current operators include** airBaltic, Delta, Air Canada, Swiss, JetBlue, Breeze and QantasLink. **Former operators include** EgyptAir, whose aircraft were transferred to lessor-managed fleets.",
    engines:
      "Both variants use Pratt & Whitney PW1500G geared turbofans, paired with a lightweight aluminium-lithium and composite airframe.",
    orders:
      "Airbus reports more than 1,100 family orders and more than 500 deliveries; its live orders-and-deliveries workbook is authoritative as the programme grows.[^orders]",
    accidents:
      "The A220 has had no fatal accident. Service experience has included PW1500G faults and unscheduled engine removals that led regulators to require corrective action; current airworthiness directives remain the controlling source.[^safety]",
    comparisons: [
      ["embraer-e-jet-family", "Embraer E-Jet family"],
      ["airbus-a320-family", "Airbus A320 family"],
      ["boeing-737-family", "Boeing 737 family"],
    ],
    sources: [
      primary(
        "airbus",
        "A220 family",
        "Airbus",
        "https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a220-family",
      ),
      primary("orders", "Airbus orders and deliveries", "Airbus", airbusOrders),
      primary(
        "safety",
        "Airworthiness directive for Airbus Canada A220 aircraft",
        "Federal Aviation Administration",
        "https://www.federalregister.gov/documents/2023/04/04/2023-06989/airworthiness-directives-airbus-canada-limited-partnership-airplanes",
      ),
    ],
  },
  {
    slug: "embraer-e-jet-family",
    title: "Embraer E-Jet family",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Airlink_Embraer_E_190_refueling_at_Saint_Helena_Airport.jpg/1920px-Airlink_Embraer_E_190_refueling_at_Saint_Helena_Airport.jpg",
    credit:
      "Photo by Kevstan via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Airlink_Embraer_E_190_refueling_at_Saint_Helena_Airport.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine regional jet family" },
      { key: "Manufacturer", value: "Embraer" },
      { key: "First flight", value: "19 February 2002 (E170)" },
      { key: "Entry into service", value: "March 2004" },
      { key: "Production", value: "2001–present across E-Jet generations" },
      { key: "Status", value: "E175 and E-Jet E2 in production; family in service" },
      {
        key: "Variants",
        value: "E170, E175, E190, E195 and E190-E2/E195-E2",
      },
      { key: "Seating", value: "About 70–146 passengers by variant" },
      { key: "Range", value: "About 2,000–2,600 nmi by variant" },
      { key: "Length", value: "29.9–41.5 m (98 ft 1 in–136 ft 2 in)" },
      { key: "Wingspan", value: "26.0–35.1 m by generation" },
      { key: "Engines", value: "GE CF34 or Pratt & Whitney PW1900G" },
    ],
    introduction:
      "The **Embraer E-Jet family** comprises twin-engine regional and small narrow-body airliners. Its two-by-two cabin and range allow airlines to serve thinner routes without the middle seats of larger single-aisle aircraft.[^embraer]",
    development:
      "Embraer announced the ERJ 170/190 programme in 1999. The E170 first flew in 2002 and entered service in 2004; larger E190 and E195 models expanded the market. The E-Jet E2 generation introduced new wings, systems and geared turbofan engines.[^embraer]",
    variants:
      "The first generation comprises the E170, E175, E190 and E195. The second generation includes the E190-E2 and E195-E2; the smaller E175-E2 has not entered regular commercial service.",
    operators:
      "**Current operators include** Republic Airways, SkyWest, KLM Cityhopper, LOT, Azul, Air Canada and Kenya Airways. **Former operators include** JetBlue, Compass Airlines, ExpressJet and other carriers that retired or transferred first-generation fleets.",
    engines:
      "First-generation aircraft use General Electric CF34-8E or CF34-10E engines. E2 aircraft use Pratt & Whitney PW1900G geared turbofans.",
    orders:
      "Orders and deliveries continue across the E175 and E2 programmes. Embraer's investor and company reports are the appropriate source for changing quarterly totals rather than a fixed count.[^embraer]",
    accidents:
      "The family has experienced hull losses, including Aeroméxico Connect Flight 2431, an E190 that crashed after take-off from Durango in 2018 with no fatalities. National investigation authorities, not summary databases, are the controlling source for findings.[^safety]",
    comparisons: [
      ["airbus-a220", "Airbus A220"],
      ["atr-72", "ATR 72"],
      ["airbus-a320-family", "Airbus A320 family"],
    ],
    sources: [
      primary(
        "embraer",
        "Embraer company profile",
        "Embraer",
        "https://embraer.com/media/wnxncakx/iata-agm-company-profile-1.pdf",
      ),
      primary(
        "safety",
        "ERJ 170/190 operational evaluation report",
        "Brazilian National Civil Aviation Agency",
        "https://www.gov.br/anac/pt-br/assuntos/regulados/aeronaves/avaliacao-operacional/RelAvOp_ERJ170_190.pdf",
      ),
    ],
  },
  {
    slug: "atr-72",
    title: "ATR 72",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/ATR_72_G-FBXB_MG_8116.jpg/1920px-ATR_72_G-FBXB_MG_8116.jpg",
    credit:
      "Photo by Ronnie Robertson via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ATR_72_G-FBXB_MG_8116.jpg)",
    fields: [
      { key: "Type", value: "Twin-engine regional turboprop" },
      { key: "Manufacturer", value: "ATR" },
      { key: "First flight", value: "27 October 1988" },
      { key: "Entry into service", value: "27 October 1989" },
      { key: "Production", value: "1988–present" },
      { key: "Status", value: "In production and service" },
      {
        key: "Variants",
        value: "ATR 72-100/-200, -500, -600 and -600F",
      },
      { key: "Seating", value: "Typically 68–78 passengers" },
      { key: "ATR 72-600 range", value: "740 nmi (1,370 km) with maximum passengers" },
      { key: "Length", value: "27.17 m (89 ft 2 in)" },
      { key: "Wingspan", value: "27.05 m (88 ft 9 in)" },
      { key: "Engines", value: "2 × Pratt & Whitney Canada PW124/PW127 series" },
    ],
    introduction:
      "The **ATR 72** is a twin-engine regional turboprop developed from the shorter ATR 42. It is optimised for short sectors, modest runways and markets where fuel-efficient regional capacity matters more than jet speed.[^atr]",
    development:
      "ATR stretched the ATR 42, increased power and revised the wing to create the ATR 72. The prototype flew in 1988 and Finnair introduced the type in 1989. The -500 and current -600 generations added more powerful engines, updated propellers, avionics and cabin changes.[^atr]",
    variants:
      "Early aircraft are grouped as the -100/-200 series, followed by the -500 and current -600. The -600F is a factory-built freighter; many earlier passenger aircraft have also been converted.",
    operators:
      "**Current operators include** IndiGo, Wings Air, Azul, Air New Zealand, Air Serbia and numerous regional carriers. **Former operators include** American Eagle, Alitalia, Olympic Aviation and Flybe.",
    engines:
      "All variants use Pratt & Whitney Canada turboprops: PW124-series engines on early aircraft and PW127-series engines on later versions, including the PW127XT on current production.",
    orders:
      "ATR reported 60 gross company orders and 32 deliveries in 2025, with a backlog above 160 aircraft; those company figures include both ATR 42 and ATR 72 models and should not be misread as type-only totals.[^orders]",
    accidents:
      "Selected accidents include American Eagle Flight 4184 in 1994. The NTSB found that icing and the resulting aileron behaviour led to an uncommanded roll and loss of control.[^safety]",
    comparisons: [
      ["embraer-e-jet-family", "Embraer E-Jet family"],
      ["airbus-a220", "Airbus A220"],
      ["boeing-737-family", "Boeing 737 family"],
    ],
    sources: [
      primary(
        "atr",
        "ATR 72-600",
        "ATR",
        "https://www.atr-aircraft.com/regional-mobility/regional-aircraft/atr-72-600/",
      ),
      primary(
        "orders",
        "ATR reports 2025 demand and deliveries",
        "ATR",
        "https://www.atr-aircraft.com/presspost/atr-reports-strong-2025-demand-prepares-2026-ramp-up/",
      ),
      primary(
        "safety",
        "American Eagle Flight 4184 accident report",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/AccidentReports/Reports/AAR9601.pdf",
      ),
    ],
  },
  {
    slug: "mcdonnell-douglas-dc-10",
    title: "McDonnell Douglas DC-10",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/e/e2/McDonnell_Douglas_DC-10-30%2C_Thai_Airways_International_AN0604188.jpg",
    credit:
      "Photo by Michel Gilliand via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:McDonnell_Douglas_DC-10-30,_Thai_Airways_International_AN0604188.jpg)",
    fields: [
      { key: "Type", value: "Three-engine wide-body airliner and freighter" },
      { key: "Manufacturer", value: "McDonnell Douglas" },
      { key: "First flight", value: "29 August 1970" },
      { key: "Entry into service", value: "5 August 1971" },
      { key: "Production", value: "1968–1988" },
      { key: "Status", value: "Retired from scheduled airline service; specialist conversions remain" },
      {
        key: "Variants",
        value: "DC-10-10, -15, -30, -40, freighters and MD-10 conversions",
      },
      { key: "Typical seating", value: "About 250–380 passengers" },
      { key: "Range", value: "About 3,500–5,200 nmi by variant" },
      { key: "Length", value: "55.55 m (182 ft 3 in)" },
      { key: "Wingspan", value: "50.39 m (165 ft 4 in)" },
      { key: "Engines", value: "General Electric CF6 or Pratt & Whitney JT9D" },
    ],
    introduction:
      "The **McDonnell Douglas DC-10** is a three-engine wide-body aircraft developed for medium- and long-range passenger and cargo service. Its centre engine is mounted at the base of the vertical tail.[^boeing]",
    development:
      "McDonnell Douglas designed the DC-10 after American Airlines requested a wide-body smaller than the Boeing 747. The prototype flew in 1970 and American introduced it in 1971. Longer-range and higher-weight versions followed before production ended in 1988.[^boeing]",
    variants:
      "The domestic DC-10-10 was followed by the -15, long-range -30 and -40, plus passenger and freighter subvariants. Boeing later supported MD-10 conversions with a modern two-crew flight deck.",
    operators:
      "**Current specialist operators include** 10 Tanker Air Carrier and the Orbis Flying Eye Hospital using converted aircraft. **Former operators include** American, United, Northwest, KLM, Swissair, Japan Airlines, FedEx Express and many military KC-10 units.",
    engines:
      "Most DC-10s use General Electric CF6 engines. The DC-10-40 uses Pratt & Whitney JT9Ds, while the tail engine retains a straight-through installation.",
    orders:
      "McDonnell Douglas built 386 commercial DC-10s. The related KC-10 military tanker is counted separately.[^boeing]",
    accidents:
      "The type's record includes United Airlines Flight 232 in 1989. An uncontained tail-engine failure disabled all three hydraulic systems; the crew used differential thrust to reach Sioux City, where the aircraft crash-landed.[^safety]",
    comparisons: [
      ["boeing-747", "Boeing 747"],
      ["airbus-a330", "Airbus A330"],
      ["boeing-767", "Boeing 767"],
    ],
    sources: [
      primary("boeing", "Select products in Boeing history", "Boeing", boeingHistory),
      primary(
        "safety",
        "United Airlines Flight 232 accident report",
        "National Transportation Safety Board",
        "https://www.ntsb.gov/investigations/accidentreports/reports/aar-90-06.pdf",
      ),
    ],
  },
];

function content(seed: AircraftSeed): RevisionContent {
  const sourceDefinitions = seed.sources
    .map((source) => `[^${source.identifier}]: ${source.url}`)
    .join("\n");
  const directSources = seed.sources
    .map((source) => `- [${source.title}](${source.url}) — ${source.publisher}`)
    .join("\n");
  const comparisons = seed.comparisons
    .map(([slug, title]) => `- [${title}](/aircraft/${slug})`)
    .join("\n");
  const sidebar = seed.fields
    .map((field) => `${field.key}: ${field.value}`)
    .join("\n");

  const markdown = `# ${seed.title}

${seed.introduction}

<Sidebar>
![${seed.image} | ${seed.credit}]
${sidebar}
</Sidebar>

## Specifications

The principal family-level specifications are shown in the information panel. Values vary by variant, cabin, engine and operating rules; the linked manufacturer material is the controlling reference.

## Development history

${seed.development}

## Variants

${seed.variants}

## Current and former operators

${seed.operators}

## Engines

${seed.engines}

## Orders and deliveries

${seed.orders}

## Accidents and incidents

${seed.accidents}

## Compare with

${comparisons}

## Direct primary sources

${directSources}

${sourceDefinitions}`;

  return {
    title: seed.title,
    contentType: "aircraft",
    markdown,
    fields: seed.fields,
    sections: [],
    sources: seed.sources.map((source) => ({ ...source, accessedAt })),
    relationships: [],
  };
}

function check() {
  assert.equal(seeds.length, 15);
  assert.equal(new Set(seeds.map((seed) => seed.slug)).size, seeds.length);
  const slugs = new Set(seeds.map((seed) => seed.slug));

  for (const seed of seeds) {
    const revision = content(seed);
    const parsed = parseArticleMarkdown(revision.markdown);
    assert.deepEqual(parsed.errors, [], `${seed.slug}: invalid Markdown`);
    assert.equal(parsed.sidebarImages.length, 1, `${seed.slug}: sidebar image`);
    assert.ok(parsed.sidebarImages[0].credit, `${seed.slug}: image credit`);
    assert.ok(seed.fields.length >= 10, `${seed.slug}: specifications`);
    assert.ok(
      isCommercialAircraft({
        contentType: "aircraft",
        title: seed.title,
        description: seed.introduction.slice(0, 180),
      }),
      `${seed.slug}: commercial-aircraft category`,
    );
    assert.ok(seed.comparisons.length >= 3, `${seed.slug}: comparison links`);
    assert.ok(
      seed.comparisons.every(([slug]) => slugs.has(slug)),
      `${seed.slug}: comparison target`,
    );
    assert.ok(seed.sources.length >= 2, `${seed.slug}: primary sources`);
    assert.ok(
      seed.sources.some((source) =>
        /(airbus|boeing|embraer|atr-aircraft|ntsb|atsb|bea\.aero|jtsb|faa|easa|gov\.br|britishairways)/i.test(
          source.url,
        ),
      ),
      `${seed.slug}: first-party source`,
    );
    for (const heading of [
      "Specifications",
      "Development history",
      "Variants",
      "Current and former operators",
      "Engines",
      "Orders and deliveries",
      "Accidents and incidents",
      "Compare with",
      "Direct primary sources",
    ])
      assert.ok(
        revision.markdown.includes(`## ${heading}`),
        `${seed.slug}: missing ${heading}`,
      );
  }
}

async function publish() {
  const {
    createOrGetArticle,
    getArticleBySlug,
    publishRevision,
    saveDraft,
    transitionRevision,
  } = await import("../src/lib/wiki-public-db");
  const changed: string[] = [];
  const skipped: string[] = [];

  for (const seed of seeds) {
    const revisionContent = content(seed);
    const existing = await getArticleBySlug(seed.slug, "aircraft");
    if (existing?.liveRevision?.markdown === revisionContent.markdown) {
      skipped.push(seed.slug);
      continue;
    }

    const article =
      existing ??
      (await createOrGetArticle(seed.slug, seed.title, "aircraft"));
    const draft = await saveDraft({
      articleId: article.id,
      proposedSlug: seed.slug,
      contributorId: "system-commercial-aircraft",
      contributorName: "aviation.wiki",
      editSummary: existing
        ? "Expanded specifications, history, operators, safety and primary sources"
        : "Created the commercial aircraft reference article",
      content: revisionContent,
      parentRevisionId: article.liveRevisionId,
    });
    await transitionRevision(draft.id, "system-commercial-aircraft", "pending_review", {
      note: "Validated commercial aircraft seed content.",
    });
    await publishRevision(
      draft.id,
      "system-commercial-aircraft",
      "Approved sourced commercial aircraft reference content.",
    );
    changed.push(seed.slug);
  }

  console.log(
    JSON.stringify({ checked: seeds.length, published: changed, skipped }, null, 2),
  );
}

check();
if (process.argv.includes("--publish"))
  publish().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
else console.log(`Commercial aircraft check passed (${seeds.length} articles).`);
