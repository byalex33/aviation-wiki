import { contentTypes, type ContentType } from "@/lib/wiki-types";
import { searchPublicArticles } from "@/lib/wiki-search";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawType = params.get("type");
  const contentType = rawType && contentTypes.includes(rawType as ContentType) ? rawType as ContentType : undefined;
  const page = Number.parseInt(params.get("page") || "1", 10);
  const pageSize = Number.parseInt(params.get("pageSize") || "8", 10);
  return Response.json(await searchPublicArticles({ query: params.get("q") || "", contentType, country: params.get("country") || undefined, page: Number.isFinite(page) ? page : 1, pageSize: Number.isFinite(pageSize) ? pageSize : 8 }), { headers: { "Cache-Control": "private, no-store" } });
}
