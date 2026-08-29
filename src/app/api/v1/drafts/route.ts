import { reconcileCitationSources } from "@/lib/article-citations";
import { isSafeCitationUrl, parseArticleMarkdown } from "@/lib/article-markdown";
import { verifyApiKey } from "@/lib/api-keys";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";
import { UserFacingError } from "@/lib/user-facing-error";
import {
  assertArticleEditable,
  createOrGetArticle,
  getArticleBySlug,
  getContributorRestriction,
  normalizeSlug,
  saveDraft,
} from "@/lib/wiki-public-db";
import { contentTypes, type ContentType, type SourceLink } from "@/lib/wiki-types";

export const dynamic = "force-dynamic";
// Bounds the full parse + transactional write path against a pathological body.
export const maxDuration = 30;

function errorResponse(message: string, status: number, extraHeaders?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers: extraHeaders });
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

export async function POST(request: Request) {
  // 1. Extract and verify API key
  const rawToken = extractBearerToken(request);
  if (!rawToken) return errorResponse("Missing or invalid Authorization header. Use: Authorization: Bearer <api_key>", 401);

  const apiKey = await verifyApiKey(rawToken);
  if (!apiKey) return errorResponse("Invalid or revoked API key.", 401);
  if (!apiKey.scopes.includes("articles:draft"))
    return errorResponse("This API key does not have the articles:draft scope.", 403);

  // 2. Rate limit: 10 requests per minute per key
  const rateLimit = await consumeRateLimit({
    scope: "api-v1-draft-create",
    subject: `key:${apiKey.keyId}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed)
    return Response.json(
      { error: "Rate limit exceeded. You may submit up to 10 drafts per minute." },
      { status: 429, headers: { ...rateLimitHeaders(rateLimit), "Cache-Control": "private, no-store" } },
    );

  // 3. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return errorResponse("Request body must be a JSON object.", 400);

  const raw = body as Record<string, unknown>;

  // 4. Validate fields
  const title = String(raw.title ?? "").trim().slice(0, 160);
  if (!title) return errorResponse("title is required.", 400);

  const contentType = String(raw.type ?? "") as ContentType;
  if (!contentTypes.includes(contentType))
    return errorResponse(`type must be one of: ${contentTypes.join(", ")}.`, 400);

  const content = String(raw.content ?? "").trim().slice(0, 250_000);
  const summary = String(raw.summary ?? "").trim().slice(0, 500);

  // 5. Validate sources
  const rawSources = Array.isArray(raw.sources) ? raw.sources : [];
  const submittedSources: SourceLink[] = [];
  for (const s of rawSources) {
    if (!s || typeof s !== "object" || Array.isArray(s)) continue;
    const src = s as Record<string, unknown>;
    const url = String(src.url ?? "").trim().slice(0, 2000);
    if (!url) continue;
    if (!isSafeCitationUrl(url))
      return errorResponse(`Unsafe or unsupported source URL: ${url.slice(0, 200)}.`, 400);
    const archiveUrl = String(src.archiveUrl ?? "").trim().slice(0, 2000) || undefined;
    if (archiveUrl && !isSafeCitationUrl(archiveUrl))
      return errorResponse(`Unsafe or unsupported archive URL: ${archiveUrl.slice(0, 200)}.`, 400);
    submittedSources.push({
      title: String(src.title ?? "").trim().slice(0, 300) || undefined,
      publisher: String(src.publisher ?? "").trim().slice(0, 200) || undefined,
      url,
      accessedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(src.accessedAt ?? "")) ? String(src.accessedAt) : undefined,
      archiveUrl,
    });
  }

  // 6. Validate and parse Markdown
  const parsed = parseArticleMarkdown(content);
  if (parsed.errors.length)
    return errorResponse(
      `Markdown has ${parsed.errors.length} syntax error${parsed.errors.length === 1 ? "" : "s"}: ${parsed.errors[0].message}.`,
      400,
    );

  // 7. Reconcile citation sources and extract sidebar fields
  const sources = reconcileCitationSources(parsed.citations, submittedSources);
  const fields = (parsed.sidebarFields ?? [])
    .map((f) => ({
      key: String(f.key ?? "").trim().slice(0, 80),
      value: String(f.value ?? "").trim().slice(0, 1000),
    }))
    .filter((f) => f.key && f.value)
    .slice(0, 60);

  // 8. Business logic: restriction check → article → editability → save
  try {
    const slug = normalizeSlug(title);
    if (!slug) return errorResponse("Could not derive a valid slug from the provided title.", 400);

    const restriction = await getContributorRestriction(apiKey.userId);
    if (restriction === "suspended" || restriction === "read_only")
      return errorResponse("This account is not permitted to create drafts.", 403);

    const existingArticle = await getArticleBySlug(slug, contentType);
    if (existingArticle && existingArticle.contentType !== contentType)
      return errorResponse(
        `An article with slug "${slug}" already exists with a different content type (${existingArticle.contentType}).`,
        409,
      );

    const article = existingArticle ?? (await createOrGetArticle(slug, title, contentType));
    await assertArticleEditable(article.id, "contributor", restriction);

    const revision = await saveDraft({
      articleId: article.id,
      proposedSlug: slug,
      contributorId: apiKey.userId,
      contributorName: apiKey.userName,
      editSummary: summary || "Draft created via API",
      content: { title, contentType, markdown: content, fields, sections: [], sources, relationships: [] },
      parentRevisionId: article.liveRevisionId,
    });

    return Response.json(
      {
        success: true,
        draftId: revision.id,
        articleId: article.id,
        slug: revision.articleSlug,
        url: absoluteUrl(`/contribute/${revision.articleSlug}`),
      },
      {
        status: 201,
        headers: {
          ...rateLimitHeaders(rateLimit),
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof UserFacingError)
      return errorResponse(error.message, 422, rateLimitHeaders(rateLimit));
    console.error("[api/v1/drafts] Unexpected error:", error instanceof Error ? error.message : "unknown");
    return errorResponse("An unexpected error occurred.", 500);
  }
}
