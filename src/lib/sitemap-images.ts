const XML_SPECIAL_CHARACTERS = /[&<>"']/;

export function sitemapImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }

    const canonicalUrl = url.toString();
    return XML_SPECIAL_CHARACTERS.test(canonicalUrl) ? undefined : canonicalUrl;
  } catch {
    return undefined;
  }
}
