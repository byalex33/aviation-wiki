import "server-only";

import type { ImportImage } from "@/lib/import-types";

type Fetcher = typeof fetch;
type MetadataValue = { value?: string };

function text(value: string | undefined) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

export function isCompatibleCommonsLicense(license: string, licenseUrl: string) {
  const value = `${license} ${licenseUrl}`.toLowerCase();
  return /public domain|cc0|creativecommons\.org\/(publicdomain|licenses\/(by|by-sa)\/)/.test(value);
}

export async function getCommonsImages(fileNames: string[], fetcher: Fetcher = fetch): Promise<ImportImage[]> {
  if (!fileNames.length) return [];
  const params = new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", prop: "imageinfo", titles: fileNames.slice(0, 12).map((name) => `File:${name.replace(/^File:/i, "")}`).join("|"), iiprop: "url|extmetadata", iiurlwidth: "900", iiextmetadatalanguage: "en", iiextmetadatafilter: "Artist|Credit|Attribution|LicenseShortName|LicenseUrl|UsageTerms" });
  const response = await fetcher(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "aviation.wiki importer/1.0 (admin preview)" }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error("Wikimedia Commons did not return image metadata.");
  const data = await response.json() as { query?: { pages?: Array<{ title?: string; imageinfo?: Array<{ url?: string; thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, MetadataValue> }> }> } };
  const retrievedAt = new Date().toISOString().slice(0, 10);
  return (data.query?.pages || []).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.url || !info.descriptionurl) return [];
    const metadata = info.extmetadata || {};
    const creator = text(metadata.Artist?.value);
    const license = text(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
    const licenseUrl = text(metadata.LicenseUrl?.value);
    const attribution = text(metadata.Attribution?.value || metadata.Credit?.value || metadata.Artist?.value);
    const compatible = Boolean(creator && license && licenseUrl && attribution && isCompatibleCommonsLicense(license, licenseUrl));
    return [{ id: page.title || info.descriptionurl, fileName: (page.title || "").replace(/^File:/, ""), imageUrl: info.url, thumbnailUrl: info.thumburl || info.url, creator, license, licenseUrl, attribution, sourcePage: info.descriptionurl, retrievedAt, compatible, incompatibilityReason: compatible ? undefined : "Complete creator, attribution, and compatible machine-readable reuse terms are required." }];
  });
}
