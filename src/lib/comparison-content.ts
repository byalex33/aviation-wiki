import type { ContentType } from "@/lib/wiki-types";

export type ComparisonEntity = {
  slug: string;
  contentType: Extract<ContentType, "aircraft" | "alliance">;
  label: string;
  shortLabel: string;
};

export type ComparisonField = {
  label: string;
  keys: string[][];
};

export type ComparisonDefinition = {
  slug: string;
  category: "Aircraft comparison" | "Alliance comparison";
  title: string;
  shortTitle: string;
  description: string;
  quickAnswer: string;
  entities: ComparisonEntity[];
  fields: ComparisonField[];
  observations: { heading: string; body: string }[];
  questions: { question: string; answer: string }[];
  shareFacts: string[];
};

const airlinerFields: ComparisonField[] = [
  { label: "Type", keys: [["Type"], ["Type"]] },
  { label: "First flight", keys: [["First flight"], ["First flight"]] },
  {
    label: "Entry into service",
    keys: [["Entry into service"], ["Entry into service"]],
  },
  { label: "Production", keys: [["Production"], ["Production"]] },
  { label: "Status", keys: [["Status"], ["Status"]] },
  { label: "Variants", keys: [["Variants"], ["Variants"]] },
  {
    label: "Typical seating",
    keys: [
      ["Seating", "Typical seating", "747-8I typical seating"],
      ["Seating", "Typical seating", "747-8I typical seating"],
    ],
  },
  {
    label: "Published range",
    keys: [
      ["Range", "MAX range", "747-8I range"],
      ["Range", "MAX range", "747-8I range"],
    ],
  },
  {
    label: "Length",
    keys: [
      ["Length", "747-8 length"],
      ["Length", "747-8 length"],
    ],
  },
  {
    label: "Wingspan",
    keys: [
      ["Wingspan", "747-8 wingspan"],
      ["Wingspan", "747-8 wingspan"],
    ],
  },
  { label: "Engines", keys: [["Engines"], ["Engines"]] },
];

export const comparisonDefinitions: ComparisonDefinition[] = [
  {
    slug: "airbus-a320-vs-boeing-737",
    category: "Aircraft comparison",
    title: "Airbus A320 family vs Boeing 737 family",
    shortTitle: "A320 vs 737",
    description:
      "Compare the Airbus A320 and Boeing 737 families by first flight, seating, range, size, engines, variants, and production status.",
    quickAnswer:
      "The A320 and 737 are not single aircraft but long-running narrow-body families. In aviation.wiki’s approved figures, the A320 family reaches a higher published maximum range and seating ceiling, while the 737 family has the earlier first flight and a longer lineage. The useful choice depends on the exact variants and mission, not the family name alone.",
    entities: [
      {
        slug: "airbus-a320-family",
        contentType: "aircraft",
        label: "Airbus A320 family",
        shortLabel: "A320 family",
      },
      {
        slug: "boeing-737-family",
        contentType: "aircraft",
        label: "Boeing 737 family",
        shortLabel: "737 family",
      },
    ],
    fields: airlinerFields,
    observations: [
      {
        heading: "Two families spanning several generations",
        body: "The figures cover the A318 through A321 and the 737 Original through MAX. Comparing an A320neo with a 737 MAX 8 is much narrower than comparing every aircraft carrying either family name.",
      },
      {
        heading: "Range needs a variant label",
        body: "The A320 figure is the A321XLR maximum and the 737 figure is the published MAX-family maximum. Neither number describes every member of its family or an airline’s real-world payload and reserve plan.",
      },
      {
        heading: "Both remain current",
        body: "Both records are listed as in production and in service. That makes variant, cabin, engine, support network, and fleet commonality more useful decision factors than age of the original design alone.",
      },
    ],
    questions: [
      {
        question: "Which family is older?",
        answer:
          "The Boeing 737 first flew in 1967, twenty years before the Airbus A320 family’s first flight in 1987.",
      },
      {
        question: "Which has the longer published range?",
        answer:
          "The approved family records list up to 4,700 nmi for the A321XLR and about 3,850 nmi for the 737 MAX family. Those are variant-specific maximums, not like-for-like operating guarantees.",
      },
      {
        question: "Is this a direct A320neo versus 737 MAX comparison?",
        answer:
          "No. This page compares the full families. Use the linked aircraft articles and cited sources when evaluating individual variants.",
      },
    ],
    shareFacts: [
      "1987 vs 1967 first flight",
      "100–244 vs 85–230 seats",
      "4,700 vs 3,850 nmi maximum",
    ],
  },
  {
    slug: "boeing-787-vs-airbus-a350",
    category: "Aircraft comparison",
    title: "Boeing 787 Dreamliner vs Airbus A350",
    shortTitle: "787 vs A350",
    description:
      "Compare the Boeing 787 and Airbus A350 families by seating, range, dimensions, engines, variants, and service dates.",
    quickAnswer:
      "Both are current twin-engine wide-body families. The approved A350 figures extend to a higher seating and range ceiling, while the 787 family begins with a smaller aircraft and offers three passenger sizes. Those family ranges overlap, so a useful evaluation compares a particular 787 and A350 variant on the same route and cabin assumptions.",
    entities: [
      {
        slug: "boeing-787-dreamliner",
        contentType: "aircraft",
        label: "Boeing 787 Dreamliner",
        shortLabel: "Boeing 787",
      },
      {
        slug: "airbus-a350",
        contentType: "aircraft",
        label: "Airbus A350",
        shortLabel: "Airbus A350",
      },
    ],
    fields: airlinerFields,
    observations: [
      {
        heading: "The families start at different sizes",
        body: "The 787’s approved typical-seating band begins below the A350’s. That makes the smallest 787 relevant to missions where an airline does not need the capacity of an A350-sized cabin.",
      },
      {
        heading: "Published range is not route performance",
        body: "The A350 family has the higher recorded ceiling, including the -900ULR. Payload, winds, cabin layout, reserves, and the exact engine-airframe combination shape what an airline can fly in practice.",
      },
      {
        heading: "Compare variants, not badges",
        body: "A 787-8, 787-10, A350-900, and A350-1000 occupy different places inside these broad ranges. Family-level data is a map for further research, not a fleet-selection verdict.",
      },
    ],
    questions: [
      {
        question: "Which family entered service first?",
        answer:
          "The 787 entered service in October 2011. The A350 followed in January 2015.",
      },
      {
        question: "Which has the higher published range ceiling?",
        answer:
          "The approved records list about 9,700 nmi at the top of the A350 family range and about 7,565 nmi at the top of the 787 family range.",
      },
      {
        question: "Does the higher number make one aircraft better?",
        answer:
          "No. Capacity, trip cost, cargo, availability, network fit, financing, and commonality all matter. Maximum range alone is not an operating-cost comparison.",
      },
    ],
    shareFacts: [
      "2011 vs 2015 entry into service",
      "248–336 vs 300–410 seats",
      "7,565 vs 9,700 nmi ceiling",
    ],
  },
  {
    slug: "airbus-a380-vs-boeing-747",
    category: "Aircraft comparison",
    title: "Airbus A380 vs Boeing 747",
    shortTitle: "A380 vs 747",
    description:
      "Compare the Airbus A380 and Boeing 747 by seating, range, dimensions, engines, variants, service dates, and production history.",
    quickAnswer:
      "The A380 is the wider-spanning double-deck passenger aircraft with the higher approved typical seating and range figures. The 747 lineage began decades earlier, includes dedicated freighter roles, and the 747-8 is longer than the A380. Both are four-engine wide-bodies whose production has ended, but both remain in service.",
    entities: [
      {
        slug: "airbus-a380",
        contentType: "aircraft",
        label: "Airbus A380",
        shortLabel: "Airbus A380",
      },
      {
        slug: "boeing-747",
        contentType: "aircraft",
        label: "Boeing 747",
        shortLabel: "Boeing 747",
      },
    ],
    fields: airlinerFields,
    observations: [
      {
        heading: "A passenger giant and a broader lineage",
        body: "The A380 record centres on the A380-800 passenger aircraft. The 747 record spans passenger and freighter generations, so its 747-8I seating figure and 747-8 dimensions should not be treated as specifications for every 747.",
      },
      {
        heading: "Size depends on the dimension",
        body: "The 747-8 is longer, while the A380 has the greater wingspan and the higher typical seating figure in these records. A single label such as “largest” hides those different measures.",
      },
      {
        heading: "Production has ended; service has not",
        body: "The A380 production period ended in 2021 and the 747’s in 2023. Their approved status remains in service, separating the end of manufacturing from the end of airline operations.",
      },
    ],
    questions: [
      {
        question: "Which entered airline service first?",
        answer:
          "The 747 entered service in January 1970. The A380 entered service in October 2007.",
      },
      {
        question: "Which is longer?",
        answer:
          "The approved 747-8 length is 76.3 m, compared with 72.7 m for the A380.",
      },
      {
        question: "Which has the larger wingspan?",
        answer:
          "The A380’s approved wingspan is 79.8 m, compared with 68.4 m for the 747-8.",
      },
    ],
    shareFacts: [
      "2007 vs 1970 entry into service",
      "72.7 m vs 76.3 m long",
      "79.8 m vs 68.4 m wingspan",
    ],
  },
  {
    slug: "f-16-vs-mig-29",
    category: "Aircraft comparison",
    title: "F-16 Fighting Falcon vs MiG-29",
    shortTitle: "F-16 vs MiG-29",
    description:
      "Compare the F-16 Fighting Falcon and MiG-29 by origin, first flight, crew, engines, speed, range, production, variants, and users.",
    quickAnswer:
      "The F-16 and MiG-29 are multirole fighter families developed for different requirements. The approved records list a slightly higher maximum-speed figure for the MiG-29 and a higher ferry-range figure for the F-16, but those numbers use different range wording and do not predict combat effectiveness. Mission, variant, weapons, sensors, support, and pilot training are decisive context.",
    entities: [
      {
        slug: "general-dynamics-f-16-fighting-falcon",
        contentType: "aircraft",
        label: "General Dynamics F-16 Fighting Falcon",
        shortLabel: "F-16",
      },
      {
        slug: "mikoyan-mig-29",
        contentType: "aircraft",
        label: "Mikoyan MiG-29",
        shortLabel: "MiG-29",
      },
    ],
    fields: [
      { label: "Type", keys: [["Type"], ["Type"]] },
      {
        label: "National origin",
        keys: [["National origin"], ["National origin"]],
      },
      { label: "First flight", keys: [["First flight"], ["First flight"]] },
      { label: "Introduced", keys: [["Introduced"], ["Introduced"]] },
      { label: "Production", keys: [["Production"], ["Production"]] },
      { label: "Number built", keys: [["Number built"], ["Number built"]] },
      { label: "Status", keys: [["Status"], ["Status"]] },
      { label: "Crew", keys: [["Crew"], ["Crew"]] },
      { label: "Engines", keys: [["Engines"], ["Engines"]] },
      {
        label: "Maximum speed",
        keys: [["Maximum speed"], ["Maximum speed"]],
      },
      { label: "Published range", keys: [["Range"], ["Range"]] },
      { label: "Variants", keys: [["Variants"], ["Variants"]] },
      {
        label: "Primary users",
        keys: [["Primary users"], ["Primary users"]],
      },
    ],
    observations: [
      {
        heading: "One engine versus two",
        body: "The F-16 record lists one afterburning turbofan, while the MiG-29 lists two. Engine count is a design distinction, not a stand-alone measure of reliability, survivability, or cost.",
      },
      {
        heading: "Range figures are not directly equivalent",
        body: "The F-16 value is identified as ferry range. The MiG-29 value is an approximate internal-fuel ferry range that increases with external tanks. Comparing the raw numbers without fuel and load conditions would overstate their precision.",
      },
      {
        heading: "Variant and operating system matter",
        body: "Both names cover decades of variants. Radar, electronic warfare, missiles, upgrades, maintenance, training, and command-and-control can matter more than the headline dimensions in a family comparison.",
      },
    ],
    questions: [
      {
        question: "Which aircraft first flew earlier?",
        answer:
          "The F-16 first flew in January 1974. The MiG-29 first flew in October 1977.",
      },
      {
        question: "Which is faster on the approved figures?",
        answer:
          "The records list Mach 2 for the F-16 and Mach 2.25 for the MiG-29. Maximum speed is only one performance measure and varies with configuration and conditions.",
      },
      {
        question: "Does this page rank combat capability?",
        answer:
          "No. It compares approved public reference fields. It does not model variant-specific sensors, weapons, tactics, training, readiness, or operational context.",
      },
    ],
    shareFacts: [
      "1974 vs 1977 first flight",
      "1 engine vs 2 engines",
      "Mach 2 vs Mach 2.25",
    ],
  },
  {
    slug: "star-alliance-vs-oneworld-vs-skyteam",
    category: "Alliance comparison",
    title: "Star Alliance vs Oneworld vs SkyTeam",
    shortTitle: "The three global alliances",
    description:
      "Compare Star Alliance, Oneworld, and SkyTeam by founding date, headquarters, member count, founding airlines, and partner status.",
    quickAnswer:
      "Star Alliance is the oldest and has the largest approved member count at 26. SkyTeam has 18 and Oneworld has 16 in the current records. Size is only one part of choosing an alliance: the airlines serving your home airport, your routes, fare rules, and the benefits attached to your status usually matter more.",
    entities: [
      {
        slug: "star-alliance",
        contentType: "alliance",
        label: "Star Alliance",
        shortLabel: "Star Alliance",
      },
      {
        slug: "one-world",
        contentType: "alliance",
        label: "Oneworld",
        shortLabel: "Oneworld",
      },
      {
        slug: "sky-team",
        contentType: "alliance",
        label: "SkyTeam",
        shortLabel: "SkyTeam",
      },
    ],
    fields: [
      { label: "Founded", keys: [["Founded"], ["Founded"], ["Founded"]] },
      {
        label: "Headquarters",
        keys: [["Headquarters"], ["Headquarters"], ["Headquarters"]],
      },
      {
        label: "Member airlines",
        keys: [["Member airlines"], ["Member airlines"], ["Member airlines"]],
      },
      {
        label: "Founding members",
        keys: [["Founding members"], ["Founding members"], ["Founding members"]],
      },
      {
        label: "Additional partner status",
        keys: [
          ["Connecting partner", "Intermodal partners"],
          ["Future member", "Suspended member"],
          ["Suspended member"],
        ],
      },
      { label: "Status", keys: [["Status"], ["Status"], ["Status"]] },
    ],
    observations: [
      {
        heading: "Membership count is not route usefulness",
        body: "A larger alliance can offer broader theoretical reach, but the strongest choice for a traveller depends on the airlines, schedules, and hubs serving the journeys they actually make.",
      },
      {
        heading: "Benefits come through airline programmes",
        body: "Alliance recognition is normally attached to status in a member airline’s frequent-flyer programme. Lounge, baggage, priority, and earning rules can vary by airline, fare, airport, and itinerary.",
      },
      {
        heading: "Membership changes over time",
        body: "The table is generated from the latest approved aviation.wiki records. Future, connecting, intermodal, and suspended relationships are separated from full member counts when those fields are available.",
      },
    ],
    questions: [
      {
        question: "Which airline alliance is the oldest?",
        answer:
          "Star Alliance was founded in May 1997, before Oneworld in February 1999 and SkyTeam in June 2000.",
      },
      {
        question: "Which has the most member airlines?",
        answer:
          "The current approved records list Star Alliance with 26, SkyTeam with 18, and Oneworld with 16 member airlines.",
      },
      {
        question: "Which alliance should I choose?",
        answer:
          "Start with the airlines and nonstop routes available at your home airport, then compare the frequent-flyer benefits you can realistically earn and use.",
      },
    ],
    shareFacts: [
      "Founded: 1997 · 1999 · 2000",
      "Members: 26 · 16 · 18",
      "Three global airline networks",
    ],
  },
];

export function comparisonDefinition(slug: string) {
  return comparisonDefinitions.find((comparison) => comparison.slug === slug);
}

export function comparisonsForEntity(
  entitySlug: string,
  contentType: ContentType,
) {
  return comparisonDefinitions.filter((comparison) =>
    comparison.entities.some(
      (entity) =>
        entity.slug === entitySlug && entity.contentType === contentType,
    ),
  );
}
