import type { SourceLink } from "@/lib/wiki-types";
import { renderSpottingGuideMarkdown } from "@/lib/spotting-guide";

export type SpottingGuideSeed = {
  id: string;
  airportTitle: string;
  preferredSlugs: string[];
  titlePattern: RegExp;
  latitude: string;
  longitude: string;
  source: Required<Pick<SourceLink, "identifier" | "title" | "publisher" | "url">>;
};

// Coordinates are the airport positions published on the cited Wikipedia pages.
// They are map anchors for the placeholder pin, not spotting locations.
export const spottingGuideSeeds: SpottingGuideSeed[] = [
  {
    id: "heathrow",
    airportTitle: "London Heathrow Airport",
    preferredSlugs: ["london-heathrow-airport", "heathrow-airport", "heathrow", "london-heathrow"],
    titlePattern: /\bheathrow\b/i,
    latitude: "51.47750",
    longitude: "-0.46139",
    source: {
      identifier: "coordinate",
      title: "Heathrow Airport",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Heathrow_Airport",
    },
  },
  {
    id: "manchester",
    airportTitle: "Manchester Airport",
    preferredSlugs: ["manchester-airport", "manchester"],
    titlePattern: /\bmanchester airport\b/i,
    latitude: "53.35389",
    longitude: "-2.27500",
    source: {
      identifier: "coordinate",
      title: "Manchester Airport",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Manchester_Airport",
    },
  },
];

const placeholderSection = (subject: string) =>
  `PLACEHOLDER. ${subject} is not recorded. Replace this section with notes a contributor has checked, and cite them. Do not copy another guide or fill this in from memory.`;

export function spottingGuideSeedContent(seed: SpottingGuideSeed, airport: { title: string; slug: string }) {
  const title = `${airport.title} plane spotting`;
  const markdown = renderSpottingGuideMarkdown({
    introduction: `PLACEHOLDER. This community spotting guide for ${airport.title} has not been verified in the field. It does not describe real viewing locations, runway preference, parking, or access.`,
    noticeTitle: "Placeholder guide",
    notice: `PLACEHOLDER. The map pin is the airport coordinate published on the cited page. It is not a spotting location, car park, or viewing area. Replace this guide before using it to visit ${airport.title}.`,
    sidebar: [
      "Guide status: Placeholder — not field-verified",
      `Airport: ${airport.title}`,
    ],
    placeholder: true,
    locations: [
      {
        name: "Placeholder — published airport coordinate",
        latitude: seed.latitude,
        longitude: seed.longitude,
        runways: "Not recorded",
        placeholder: true,
        note: "PLACEHOLDER. This pin is the airport coordinate published on the cited Wikipedia page. It is not a spotting location, car park, or viewing area.",
      },
    ],
    sections: {
      "Runway use": placeholderSection("Typical runway use by wind direction"),
      "Parking and access": placeholderSection("Parking, public transport, walking routes, and step-free access"),
      "Legal and security": `${placeholderSection("Bylaws, photography rules, and security boundaries")} Do not enter airside areas, cross fences, or block emergency access.`,
      "Best times and light": placeholderSection("Season, time of day, and sun direction"),
      "Typical traffic": placeholderSection("Airlines, aircraft types, and busy periods"),
    },
    closing: `The map pin is only the airport coordinate published by [${seed.source.title}](${seed.source.url}).[^${seed.source.identifier}] The airport article is [${airport.title}](/airports/${airport.slug}).`,
    footnotes: [`[^${seed.source.identifier}]: ${seed.source.url}`],
  });
  return {
    title,
    contentType: "spotting_guide" as const,
    markdown,
    fields: [
      { key: "Guide status", value: "Placeholder — not field-verified" },
      { key: "Airport", value: airport.title },
    ],
    sections: [],
    sources: [{ ...seed.source, accessedAt: "2026-10-16" }],
    relationships: [],
  };
}
