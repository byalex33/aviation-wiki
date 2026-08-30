import type { FleetSourceArticle } from "@/lib/fleet-data";

export type ProductionListRecord = {
  id: string;
  title: string;
  slug: string;
  href: string;
  manufacturer: string;
  production: string;
  numberBuilt: string;
  deliveries: string;
  variants: string;
  status: "ongoing" | "ended" | "unknown";
  updatedAt: string;
};

function fieldValue(article: FleetSourceArticle, ...keys: string[]) {
  const expected = new Set(keys.map((key) => key.toLowerCase()));
  return article.fields.find((field) =>
    expected.has(field.key.trim().toLowerCase()),
  )?.value.trim();
}

function productionStatus(production: string, status: string): ProductionListRecord["status"] {
  const value = `${production} ${status}`;
  if (/\b(?:present|ongoing|in production|under production)\b/i.test(value)) return "ongoing";
  if (/\b(?:ended|ceased|closed|retired|\d{4}\s*[–-]\s*\d{4})\b/i.test(value)) return "ended";
  return "unknown";
}

export function buildProductionListRecords(articles: FleetSourceArticle[]) {
  return articles
    .filter((article) => article.contentType === "aircraft")
    .map<ProductionListRecord>((article) => {
      const production = fieldValue(article, "Production", "Production period") || "Not recorded";
      const status = fieldValue(article, "Status", "Production status") || "";
      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        href: `/aircraft/${article.slug}`,
        manufacturer: fieldValue(article, "Manufacturer", "Manufacturers") || "Not recorded",
        production,
        numberBuilt: fieldValue(article, "Number built", "Total built", "Aircraft built", "Produced") || "Not recorded",
        deliveries: fieldValue(article, "Deliveries", "Aircraft delivered", "Total deliveries") || "Not recorded",
        variants: fieldValue(article, "Variants", "Models") || "Not recorded",
        status: productionStatus(production, status),
        updatedAt: article.updatedAt,
      };
    })
    .toSorted((first, second) =>
      first.manufacturer.localeCompare(second.manufacturer) ||
      first.title.localeCompare(second.title),
    );
}

export function filterProductionListRecords(records: ProductionListRecord[], filters: { query?: string; manufacturer?: string; status?: string }) {
  const query = filters.query?.trim().toLocaleLowerCase("en");
  return records.filter((record) =>
    (!filters.manufacturer || record.manufacturer === filters.manufacturer) &&
    (!filters.status || record.status === filters.status) &&
    (!query || `${record.title} ${record.manufacturer} ${record.production} ${record.variants}`.toLocaleLowerCase("en").includes(query)),
  );
}

export function productionListManufacturers(records: ProductionListRecord[]) {
  return [...new Set(records.map((record) => record.manufacturer).filter((value) => value !== "Not recorded"))]
    .toSorted((first, second) => first.localeCompare(second));
}
