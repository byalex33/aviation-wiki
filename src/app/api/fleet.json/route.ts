import {
  filterFleetRecords,
  fleetFiltersFromSearchParams,
} from "@/lib/fleet-data";
import { loadFleetRecords } from "@/lib/public-fleet";
import { absoluteUrl } from "@/lib/site";

export async function GET(request: Request) {
  const filters = fleetFiltersFromSearchParams(new URL(request.url).searchParams);
  const records = filterFleetRecords(await loadFleetRecords(), filters);

  return Response.json(
    {
      name: "aviation.wiki aircraft fleet database",
      generatedAt: new Date().toISOString(),
      source: absoluteUrl("/fleet"),
      methodology:
        "Values come from moderator-approved aviation.wiki article fields and relationships. Operator matches identify their evidence type; missing values are preserved.",
      filters,
      count: records.length,
      records: records.map((record) => ({
        ...record,
        href: absoluteUrl(record.href),
        currentOperators: record.currentOperators.map((operator) => ({
          ...operator,
          href: operator.href ? absoluteUrl(operator.href) : undefined,
        })),
        historicOperators: record.historicOperators.map((operator) => ({
          ...operator,
          href: operator.href ? absoluteUrl(operator.href) : undefined,
        })),
      })),
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Disposition":
          'attachment; filename="aviation-wiki-fleet.json"',
      },
    },
  );
}
