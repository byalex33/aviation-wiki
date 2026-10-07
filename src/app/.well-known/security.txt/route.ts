import { absoluteUrl } from "@/lib/site";

// RFC 9116. Rendered at build time, so every deploy pushes Expires a year out.
export const dynamic = "force-static";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function GET() {
  const expires = new Date(Date.now() + YEAR_MS).toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = [
    "Contact: https://github.com/byalex33/aviation-wiki/security/advisories/new",
    "Contact: mailto:hello@byalex.gg",
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    "Policy: https://github.com/byalex33/aviation-wiki/blob/main/SECURITY.md",
    `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
