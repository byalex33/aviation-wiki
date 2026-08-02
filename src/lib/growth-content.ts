import {
  aviationCategoryFor,
  type AviationCategoryId,
} from "@/lib/article-categories";
import type { SearchDocument } from "@/lib/search-types";
import type { ContentType } from "@/lib/wiki-types";

export type ContributionMission = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
};

const featuredArticleSlugs = [
  "star-alliance",
  "mikoyan-mig-29",
  "airbus-a320-family",
  "sky-team",
  "one-world",
  "boeing-787-dreamliner",
] as const;

const missingCategoryMissions: Array<{
  category: AviationCategoryId;
  title: string;
  slug: string;
  contentType: ContentType;
  label: string;
  description: string;
}> = [
  {
    category: "news",
    title: "US Airways Flight 1549 ditching",
    slug: "us-airways-flight-1549-ditching",
    contentType: "event",
    label: "Aviation news",
    description:
      "Create the first retrospective event report with a dated timeline, verified outcome, and strong sources.",
  },
  {
    category: "general",
    title: "Cessna 172",
    slug: "cessna-172",
    contentType: "aircraft",
    label: "General aviation",
    description:
      "Launch the civil-aircraft collection with a sourced light-aircraft article.",
  },
  {
    category: "airports",
    title: "London Heathrow Airport",
    slug: "london-heathrow-airport",
    contentType: "airport",
    label: "Airports",
    description:
      "Create the first airport guide with codes, terminals, runways, and cited history.",
  },
  {
    category: "manufacturers",
    title: "Airbus",
    slug: "airbus",
    contentType: "manufacturer",
    label: "Manufacturers",
    description:
      "Start the aerospace-company directory with products and cited company history.",
  },
  {
    category: "engines",
    title: "Rolls-Royce Trent 1000",
    slug: "rolls-royce-trent-1000",
    contentType: "engine",
    label: "Engines",
    description:
      "Start the propulsion directory with specifications, applications, and variants.",
  },
];

const improvementMissions = [
  {
    slug: "airbus-a320-family",
    label: "Popular aircraft",
    title: "Deepen the Airbus A320 family",
    description:
      "Add variant-level specifications, operator context, and direct primary sources.",
  },
  {
    slug: "star-alliance",
    label: "Popular alliance",
    title: "Keep Star Alliance current",
    description:
      "Verify member changes, connecting partners, and citations against primary sources.",
  },
  {
    slug: "mikoyan-mig-29",
    label: "Popular military aircraft",
    title: "Expand the MiG-29 guide",
    description:
      "Improve variant comparisons, operators, specifications, and source coverage.",
  },
] as const;

export function featuredArticles(documents: SearchDocument[]) {
  const bySlug = new Map(documents.map((document) => [document.slug, document]));
  return featuredArticleSlugs
    .map((slug) => bySlug.get(slug))
    .filter((document): document is SearchDocument => Boolean(document));
}

export function contributionMissions(documents: SearchDocument[]) {
  const categoryCounts = new Map<AviationCategoryId, number>();
  for (const document of documents) {
    const category = aviationCategoryFor(document);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  const missing = missingCategoryMissions
    .filter(
      (mission) =>
        !categoryCounts.get(mission.category) &&
        !documents.some((document) => document.slug === mission.slug),
    )
    .map<ContributionMission>((mission) => {
      const params = new URLSearchParams({
        title: mission.title,
        slug: mission.slug,
        contentType: mission.contentType,
      });
      return {
        id: `create-${mission.slug}`,
        label: mission.label,
        title: `Create ${mission.title}`,
        description: mission.description,
        href: `/contribute?${params.toString()}`,
      };
    });

  const improvements = improvementMissions.flatMap<ContributionMission>(
    (mission) => {
      const document = documents.find(
        (candidate) => candidate.slug === mission.slug,
      );
      if (!document) return [];
      return [
        {
          id: `improve-${mission.slug}`,
          label: mission.label,
          title: mission.title,
          description: mission.description,
          href: `/editor?type=${document.contentType}&slug=${encodeURIComponent(document.slug)}&correction=1`,
        },
      ];
    },
  );

  return [...missing, ...improvements];
}
