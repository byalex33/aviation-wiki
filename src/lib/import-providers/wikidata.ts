import "server-only";

import type { ContentType } from "@/lib/wiki-types";
import type { AviationImportProvider, ImportField, ImportPreview, ImportSearchResult } from "@/lib/import-types";
import { getCommonsImages } from "@/lib/import-providers/wikimedia-commons";

type Fetcher = typeof fetch;
type Claim = { mainsnak?: { datavalue?: { value?: unknown } }; references?: Array<{ snaks?: Record<string, Array<{ datavalue?: { value?: unknown } }>> }> };
type Entity = { id: string; labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }>; claims?: Record<string, Claim[]> };

const properties: Partial<Record<ContentType, Array<[string, string]>>> = {
  airline: [["P229", "IATA code"], ["P230", "ICAO code"], ["P231", "Callsign"], ["P17", "Country"], ["P571", "Founded"], ["P576", "Ceased operations"]],
  aircraft: [["P176", "Manufacturer"], ["P495", "Country of origin"], ["P571", "Inception"]],
  airport: [["P238", "IATA code"], ["P239", "ICAO code"], ["P17", "Country"], ["P137", "Operator"], ["P571", "Opened"]],
  manufacturer: [["P17", "Country"], ["P571", "Founded"], ["P576", "Dissolved"]],
  engine: [["P176", "Manufacturer"], ["P495", "Country of origin"], ["P571", "Inception"]],
  country: [["P297", "ISO 3166-1 alpha-2 code"], ["P298", "ISO 3166-1 alpha-3 code"], ["P299", "ISO 3166-1 numeric code"]],
};

const expectedInstanceIds: Partial<Record<ContentType, string[]>> = {
  airline: ["Q46970"],
  aircraft: ["Q11436"],
  airport: ["Q1248784"],
  engine: ["Q192980"],
  country: ["Q6256"],
};

function entityId(value: unknown) { return typeof value === "object" && value && "id" in value ? String((value as { id: unknown }).id) : null; }
function scalar(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value && "time" in value) return String((value as { time: unknown }).time).replace(/^\+/, "").split("T")[0];
  return null;
}
function referenceUrls(claim: Claim, entityUrl: string) {
  const urls = (claim.references || []).flatMap((reference) => (reference.snaks?.P854 || []).map((snak) => scalar(snak.datavalue?.value)).filter((value): value is string => Boolean(value)));
  return [...new Set([...urls, entityUrl])];
}

export class WikidataImportProvider implements AviationImportProvider {
  readonly id = "wikidata" as const;
  readonly label = "Wikidata + Wikimedia Commons";
  constructor(private readonly fetcher: Fetcher = fetch) {}

  private async request(params: URLSearchParams) {
    const response = await this.fetcher(`https://www.wikidata.org/w/api.php?${params}`, { headers: { "User-Agent": "aviation.wiki importer/1.0 (admin preview)" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error("Wikidata did not return source data.");
    return response.json() as Promise<Record<string, unknown>>;
  }

  async search(query: string, contentType: ContentType): Promise<ImportSearchResult[]> {
    void contentType;
    const params = new URLSearchParams({ action: "wbsearchentities", format: "json", origin: "*", language: "en", uselang: "en", type: "item", limit: "12", search: query.slice(0, 120) });
    const data = await this.request(params) as { search?: Array<{ id: string; label?: string; description?: string; concepturi?: string }> };
    return (data.search || []).map((item) => ({ provider: this.id, sourceId: item.id, title: item.label || item.id, description: item.description || "", sourceUrl: item.concepturi || `https://www.wikidata.org/wiki/${item.id}` }));
  }

  async preview(sourceId: string, contentType: ContentType): Promise<ImportPreview> {
    if (!/^Q[1-9][0-9]{0,11}$/.test(sourceId)) throw new Error("Invalid Wikidata item identifier.");
    const params = new URLSearchParams({ action: "wbgetentities", format: "json", origin: "*", ids: sourceId, languages: "en", languagefallback: "1", props: "labels|descriptions|claims" });
    const data = await this.request(params) as { entities?: Record<string, Entity> };
    const entity = data.entities?.[sourceId];
    if (!entity || "missing" in entity) throw new Error("Wikidata item not found.");
    const entityUrl = `https://www.wikidata.org/wiki/${sourceId}`;
    const neededEntityIds = new Set<string>();
    for (const [property] of properties[contentType] || []) for (const claim of entity.claims?.[property] || []) { const id = entityId(claim.mainsnak?.datavalue?.value); if (id) neededEntityIds.add(id); }
    let labels: Record<string, string> = {};
    if (neededEntityIds.size) {
      const labelParams = new URLSearchParams({ action: "wbgetentities", format: "json", origin: "*", ids: [...neededEntityIds].join("|"), languages: "en", languagefallback: "1", props: "labels" });
      const labelData = await this.request(labelParams) as { entities?: Record<string, Entity> };
      labels = Object.fromEntries(Object.entries(labelData.entities || {}).map(([id, item]) => [id, item.labels?.en?.value || id]));
    }
    const fields: ImportField[] = [];
    const unverifiedFields: string[] = [];
    for (const [property, key] of properties[contentType] || []) {
      const claims = entity.claims?.[property] || [];
      if (!claims.length) { unverifiedFields.push(key); continue; }
      const values = claims.map((claim) => { const raw = claim.mainsnak?.datavalue?.value; const id = entityId(raw); return id ? labels[id] : scalar(raw); }).filter((value): value is string => Boolean(value));
      if (!values.length) { unverifiedFields.push(key); continue; }
      fields.push({ id: property, key, value: [...new Set(values)].join(", "), verified: true, sourceUrls: [...new Set(claims.flatMap((claim) => referenceUrls(claim, entityUrl)))], sourceLabel: `Wikidata ${sourceId}, ${property}` });
    }
    const fileNames = (entity.claims?.P18 || []).map((claim) => scalar(claim.mainsnak?.datavalue?.value)).filter((value): value is string => Boolean(value));
    const images = await getCommonsImages(fileNames, this.fetcher);
    const instanceIds = (entity.claims?.P31 || []).map((claim) => entityId(claim.mainsnak?.datavalue?.value)).filter(Boolean);
    const expected = expectedInstanceIds[contentType];
    const typeVerified = expected ? instanceIds.some((id) => expected.includes(id!)) : false;
    if (!typeVerified) unverifiedFields.unshift("Content type classification");
    return { provider: this.id, sourceId, sourceUrl: entityUrl, title: entity.labels?.en?.value || sourceId, description: entity.descriptions?.en?.value || "", contentType, typeVerified, fields, images, unverifiedFields };
  }
}
