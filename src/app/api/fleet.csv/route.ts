import {
  filterFleetRecords,
  fleetFiltersFromSearchParams,
} from "@/lib/fleet-data";
import { loadFleetRecords } from "@/lib/public-fleet";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const filters = fleetFiltersFromSearchParams(new URL(request.url).searchParams);
  const records = filterFleetRecords(await loadFleetRecords(), filters);
  const headers = [
    "aircraft",
    "article_url",
    "manufacturer",
    "type",
    "category",
    "family",
    "variants",
    "engines",
    "entry_into_service",
    "production",
    "status",
    "range",
    "seating",
    "current_operators",
    "historic_operators",
    "operator_evidence",
    "updated_at",
  ];
  const lines = records.map((record) =>
    [
      record.title,
      record.href,
      record.manufacturer,
      record.type,
      record.category,
      record.family,
      record.variants,
      record.engines,
      record.entryIntoService,
      record.production,
      record.status,
      record.range,
      record.seating,
      record.currentOperators.map((operator) => operator.name).join("; "),
      record.historicOperators.map((operator) => operator.name).join("; "),
      [
        ...record.currentOperators,
        ...record.historicOperators,
      ]
        .map((operator) => `${operator.name}: ${operator.evidence}`)
        .join("; "),
      record.updatedAt,
    ]
      .map((value) => csvCell(String(value)))
      .join(","),
  );
  const body = `${headers.map(csvCell).join(",")}\n${lines.join("\n")}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aviation-wiki-fleet.csv"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
