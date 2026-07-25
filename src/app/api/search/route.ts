import { contentTypes, type ContentType } from "@/lib/wiki-types";
import { searchPublicArticles } from "@/lib/wiki-search";

function boundedInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(1, parsed))
    : fallback;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawType = params.get("type");
  const contentType = rawType && contentTypes.includes(rawType as ContentType) ? rawType as ContentType : undefined;
  const page = boundedInteger(params.get("page"), 1, 10_000);
  const pageSize = boundedInteger(params.get("pageSize"), 8, 50);
  return Response.json(await searchPublicArticles({ query: params.get("q") || "", contentType, country: params.get("country") || undefined, page, pageSize }), { headers: { "Cache-Control": "private, no-store" } });
}
