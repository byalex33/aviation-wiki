import { getArticleHeadings, type MarkdownRoot } from "@/lib/article-markdown";
import type { SpottingLocationsBlock } from "@/lib/spotting-locations";

export const SPOTTING_GUIDE_HEADINGS = [
  "Runway use",
  "Parking and access",
  "Legal and security",
  "Best times and light",
  "Typical traffic",
] as const;

export const SPOTTING_FRESH_DAYS = 90;
export const SPOTTING_STALE_DAYS = 180;

export type SpottingFreshnessState = "unverified" | "fresh" | "aging" | "stale";

export type SpottingFreshness = {
  state: SpottingFreshnessState;
  days: number | null;
  label: string;
};

const verifiedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function fieldValue(fields: Array<{ key: string; value: string }>, key: string) {
  return fields.find((field) => field.key.trim().toLowerCase() === key)?.value.trim() ?? "";
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function todayUtc(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function spottingFreshness(isoDate: string | null, now = new Date()): SpottingFreshness {
  if (!isoDate || !isIsoDate(isoDate) || isoDate > todayUtc(now)) {
    return { state: "unverified", days: null, label: "Not yet verified" };
  }
  const verified = Date.parse(`${isoDate}T00:00:00Z`);
  const today = Date.parse(`${todayUtc(now)}T00:00:00Z`);
  const days = Math.round((today - verified) / 86_400_000);
  const formatted = verifiedDate.format(new Date(verified));
  if (days >= SPOTTING_STALE_DAYS) {
    return { state: "stale", days, label: `Last verified ${formatted}` };
  }
  if (days >= SPOTTING_FRESH_DAYS) {
    return { state: "aging", days, label: `Last verified ${formatted}` };
  }
  return { state: "fresh", days, label: `Last verified ${formatted}` };
}

export function isPlaceholderSpottingGuide(
  fields: Array<{ key: string; value: string }>,
  block: SpottingLocationsBlock | null,
) {
  if (/placeholder/i.test(fieldValue(fields, "guide status"))) return true;
  if (!block) return false;
  return block.placeholder || (block.locations.length > 0 && block.locations.every((location) => location.placeholder));
}

export function spottingGuidePresentation(
  fields: Array<{ key: string; value: string }>,
  now = new Date(),
) {
  const placeholder = /placeholder/i.test(fieldValue(fields, "guide status"));
  if (placeholder) return { placeholder: true, freshness: spottingFreshness(null, now) };
  return { placeholder: false, freshness: spottingFreshness(fieldValue(fields, "last verified") || null, now) };
}

export function spottingGuideIssues(
  input: {
    title: string;
    markdown: string;
    fields: Array<{ key: string; value: string }>;
    citationCount: number;
  },
  parsed: { spottingLocations: SpottingLocationsBlock | null; root: MarkdownRoot },
  now = new Date(),
) {
  const issues: string[] = [];
  if (!/plane spotting/i.test(input.title)) {
    issues.push('A spotting guide title must include “plane spotting”, for example “London Heathrow Airport plane spotting”.');
  }
  const headings = new Set(
    getArticleHeadings(parsed.root)
      .filter((heading) => heading.depth === 2)
      .map((heading) => heading.text.toLocaleLowerCase("en")),
  );
  for (const heading of SPOTTING_GUIDE_HEADINGS) {
    if (!headings.has(heading.toLocaleLowerCase("en"))) issues.push(`Add a “${heading}” section.`);
  }
  const block = parsed.spottingLocations;
  if (!block) issues.push("Add one <SpottingLocations> block.");
  const placeholder = isPlaceholderSpottingGuide(input.fields, block);
  const verified = fieldValue(input.fields, "last verified");
  if (placeholder) {
    if (!input.markdown.includes("PLACEHOLDER")) {
      issues.push("Placeholder spotting guides must include the word PLACEHOLDER so readers can see the notes are not verified.");
    }
    if (verified) issues.push("Remove the Last verified date until a contributor has checked this guide in the field.");
  } else {
    if (!verified || !isIsoDate(verified)) {
      issues.push("Add a Sidebar field “Last verified: YYYY-MM-DD” after the guide has been checked in the field.");
    } else if (verified > todayUtc(now)) {
      issues.push("Last verified cannot be in the future.");
    }
    if (input.citationCount < 1) issues.push("Cite the sources for the locations, runway use, and access notes.");
  }
  return issues;
}

export const SPOTTING_LOCATIONS_HELP = `<SpottingLocations title="Spotting locations" placeholder="true">
- Name: Placeholder pin
  Runways: Not recorded
  Placeholder: true
  Note: PLACEHOLDER. Replace this with a community-verified spot. This line is not a real location.
</SpottingLocations>`;

type GuideLocation = {
  name: string;
  latitude?: string;
  longitude?: string;
  runways: string;
  placeholder: boolean;
  note: string;
};

export function renderSpottingGuideMarkdown(input: {
  introduction: string;
  noticeTitle: string;
  notice: string;
  sidebar: string[];
  locations: GuideLocation[];
  placeholder: boolean;
  sections: Record<(typeof SPOTTING_GUIDE_HEADINGS)[number], string>;
  closing?: string;
  footnotes?: string[];
}) {
  const locations = input.locations
    .map((location) => {
      const lines = [`- Name: ${location.name}`];
      if (location.latitude) lines.push(`  Latitude: ${location.latitude}`);
      if (location.longitude) lines.push(`  Longitude: ${location.longitude}`);
      lines.push(
        `  Runways: ${location.runways}`,
        `  Placeholder: ${location.placeholder ? "true" : "false"}`,
        `  Note: ${location.note}`,
      );
      return lines.join("\n");
    })
    .join("\n");
  const sections = SPOTTING_GUIDE_HEADINGS.map(
    (heading) => `## ${heading}\n\n${input.sections[heading]}`,
  ).join("\n\n");
  const footnotes = input.footnotes?.length ? `\n\n${input.footnotes.join("\n")}` : "";
  const closing = input.closing ? `\n\n${input.closing}` : "";
  return `${input.introduction}

<Notice title="${input.noticeTitle}" variant="warning">

${input.notice}

</Notice>

<Sidebar>
${input.sidebar.join("\n")}
</Sidebar>

<SpottingLocations title="Spotting locations" placeholder="${input.placeholder ? "true" : "false"}">
${locations}
</SpottingLocations>

${sections}${closing}${footnotes}
`;
}

export function spottingGuideStarterMarkdown(title: string) {
  const airport = title.replace(/\s+plane spotting$/i, "").trim() || "this airport";
  const section = `PLACEHOLDER. This section has not been checked at ${airport}. Replace it with sourced notes. Do not present an unverified guess as a spotting fact.`;
  return renderSpottingGuideMarkdown({
    introduction: `PLACEHOLDER. This is an empty community spotting guide for ${airport}. It has not been checked in the field and it is not a recommendation of where to stand, park, or photograph aircraft.`,
    noticeTitle: "Placeholder guide",
    notice: "PLACEHOLDER. Replace every section before treating this page as a spotting guide. Leave Last verified empty until someone confirms the notes on site.",
    sidebar: [
      "Guide status: Placeholder — not field-verified",
      `Airport: ${airport}`,
    ],
    placeholder: true,
    locations: [
      {
        name: "Placeholder — no spot recorded",
        runways: "Not recorded",
        placeholder: true,
        note: "PLACEHOLDER. This entry has no coordinates because no spotting location has been verified. Replace it with a community-checked spot.",
      },
    ],
    sections: {
      "Runway use": section,
      "Parking and access": section,
      "Legal and security": `${section} Do not enter airside areas, cross fences, or block emergency access.`,
      "Best times and light": section,
      "Typical traffic": section,
    },
  });
}
