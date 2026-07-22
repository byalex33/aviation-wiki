"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifyRevision } from "@/lib/gemini-verification";
import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import {
  isSafeCitationUrl,
  parseArticleMarkdown,
} from "@/lib/article-markdown";
import { reconcileCitationSources } from "@/lib/article-citations";
import { requireContributor, requireModerator } from "@/lib/wiki-auth";
import {
  assertArticleEditable as assertPostgresArticleEditable,
  createOrGetArticle as createOrGetPostgresArticle,
  getArticleById as getPostgresArticleById,
  getArticleBySlug as getPostgresArticleBySlug,
  getContributorRestriction as getPostgresContributorRestriction,
  getRevision as getPostgresRevision,
  normalizeSlug,
  saveDraft as savePostgresDraft,
  transitionRevision as transitionPostgresRevision,
  validateRelationships as validatePostgresRelationships,
} from "@/lib/wiki-public-db";
import {
  contentTypes,
  relationshipTypes,
  type ArticleSection,
  type ContentType,
  type EntityRelationship,
  type RevisionContent,
  type SourceLink,
  type StructuredField,
} from "@/lib/wiki-types";

function parseArray<T>(formData: FormData, key: string): T[] {
  try {
    const value = JSON.parse(String(formData.get(key) || "[]"));
    return Array.isArray(value) ? value : [];
  } catch {
    throw new Error(`Invalid ${key}.`);
  }
}

function safeReturnTo(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") || "");
  return value.startsWith("/editor?") || value.startsWith("/contribute/")
    ? value
    : fallback;
}

function parseContent(
  formData: FormData,
  requireSubmissionFields = false,
): RevisionContent {
  const title = String(formData.get("title") || "")
    .trim()
    .slice(0, 160);
  const contentType = String(formData.get("contentType") || "") as ContentType;
  if (!title || !contentTypes.includes(contentType))
    throw new Error("A title and valid content type are required.");
  const markdown = String(formData.get("markdown") || "")
    .trim()
    .slice(0, 250_000);
  const parsedMarkdown = parseArticleMarkdown(markdown);
  if (parsedMarkdown.errors.length)
    throw new Error(
      `The Markdown has ${parsedMarkdown.errors.length} syntax ${parsedMarkdown.errors.length === 1 ? "error" : "errors"}.`,
    );
  const fields = parseArray<StructuredField>(formData, "fields")
    .map((field) => ({
      key: String(field.key || "")
        .trim()
        .slice(0, 80),
      value: String(field.value || "")
        .trim()
        .slice(0, 1000),
    }))
    .filter((field) => field.key && field.value)
    .slice(0, 60);
  const sections = parseArray<ArticleSection>(formData, "sections")
    .map((section) => ({
      heading: String(section.heading || "")
        .trim()
        .slice(0, 120),
      body: String(section.body || "")
        .trim()
        .slice(0, 30_000),
    }))
    .filter((section) => section.heading && section.body)
    .slice(0, 30);
  const submittedSources = parseArray<SourceLink>(formData, "sources");
  for (const source of submittedSources) {
    const url = String(source.url || "").trim();
    const archiveUrl = String(source.archiveUrl || "").trim();
    if (url && !isSafeCitationUrl(url))
      throw new Error(
        `Unsafe or unsupported source URL: ${url.slice(0, 200)}.`,
      );
    if (archiveUrl && !isSafeCitationUrl(archiveUrl))
      throw new Error(
        `Unsafe or unsupported archive URL: ${archiveUrl.slice(0, 200)}.`,
      );
  }
  const sources = reconcileCitationSources(
    parsedMarkdown.citations,
    submittedSources,
  );
  const relationships = parseArray<EntityRelationship>(
    formData,
    "relationships",
  )
    .map((relationship) => {
      const type = String(relationship.type || "");
      if (!relationshipTypes.includes(type as EntityRelationship["type"]))
        throw new Error("Invalid relationship type.");
      return {
        type: type as EntityRelationship["type"],
        targetArticleId: String(relationship.targetArticleId || "")
          .trim()
          .slice(0, 100),
        citationIdentifiers: [
          ...new Set(
            (Array.isArray(relationship.citationIdentifiers)
              ? relationship.citationIdentifiers
              : []
            )
              .map((identifier) => String(identifier).trim().toLowerCase())
              .filter(Boolean),
          ),
        ].slice(0, 20),
      };
    })
    .filter((relationship) => relationship.targetArticleId)
    .slice(0, 100);
  if (
    requireSubmissionFields &&
    (!markdown || !parsedMarkdown.citations.length)
  )
    throw new Error(
      "Article Markdown and at least one inline citation are required before submission.",
    );
  return {
    title,
    contentType,
    markdown,
    fields,
    sections,
    sources,
    relationships,
  };
}

async function persistFromForm(
  formData: FormData,
  requireSubmissionFields = false,
) {
  const contributor = await requireContributor();
  const content = parseContent(formData, requireSubmissionFields);
  const slug = normalizeSlug(String(formData.get("slug") || content.title));
  if (!slug) throw new Error("A valid article slug is required.");
  const revisionId = String(formData.get("revisionId") || "") || undefined;
  const submittedArticleId =
    String(formData.get("articleId") || "") || undefined;
  const existingRevision = revisionId ? await getPostgresRevision(revisionId) : null;
  if (revisionId && !existingRevision) throw new Error("Revision not found.");
  const existingArticle = existingRevision
    ? await getPostgresArticleById(existingRevision.articleId)
    : submittedArticleId
      ? await getPostgresArticleById(submittedArticleId)
      : await getPostgresArticleBySlug(slug, content.contentType);
  const restriction = await getPostgresContributorRestriction(contributor.userId);
  if (restriction === "suspended" || restriction === "read_only")
    throw new Error("This account is not allowed to submit edits.");
  const article =
    existingArticle ||
    await createOrGetPostgresArticle(slug, content.title, content.contentType);
  if (article.contentType !== content.contentType)
    throw new Error(
      "An existing article cannot change content type through an edit.",
    );
  if (existingRevision && existingRevision.articleId !== article.id)
    throw new Error("The revision does not belong to this article.");
  await assertPostgresArticleEditable(article.id, contributor.role, restriction);
  await validatePostgresRelationships(
    article.id,
    content.contentType,
    content.relationships,
    new Set(
      parseArticleMarkdown(content.markdown).citations.map(
        (citation) => citation.identifier,
      ),
    ),
  );
  const editSummary = String(formData.get("editSummary") || "")
    .trim()
    .slice(0, 500);
  if (requireSubmissionFields && !editSummary)
    throw new Error("An edit summary is required before submission.");
  return savePostgresDraft({
    revisionId,
    articleId: article.id,
    proposedSlug: slug,
    contributorId: contributor.userId,
    contributorName: contributor.name,
    editSummary,
    content,
    parentRevisionId: article.liveRevisionId,
  });
}

export async function startArticleAction(formData: FormData) {
  await requireContributor();
  const title = String(formData.get("title") || "").trim();
  const slug = normalizeSlug(String(formData.get("slug") || title));
  const contentType = String(formData.get("contentType") || "");
  if (!title || !slug || !contentTypes.includes(contentType as ContentType))
    throw new Error("Title, slug, and content type are required.");
  redirect(
    `/contribute/${slug}?title=${encodeURIComponent(title)}&type=${encodeURIComponent(contentType)}`,
  );
}

export async function saveDraftAction(formData: FormData) {
  const revision = await persistFromForm(formData);
  revalidatePath("/contribute");
  const returnTo = safeReturnTo(
    formData,
    `/contribute/${revision.articleSlug}`,
  );
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=1`);
}

export async function submitRevisionAction(formData: FormData) {
  const contributor = await requireContributor();
  const revision = await persistFromForm(formData, true);
  await transitionPostgresRevision(revision.id, contributor.userId, "verifying");
  const verification = await verifyRevision(revision);
  await transitionPostgresRevision(revision.id, contributor.userId, "pending_review", {
    verification,
  });
  revalidatePath("/contribute");
  revalidatePath("/moderation");
  const returnTo = safeReturnTo(
    formData,
    `/contribute/${revision.articleSlug}`,
  );
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}submitted=1`);
}

export async function moderateRevisionAction(formData: FormData) {
  const moderator = await requireModerator();
  const [{ assertArticleEditable, recordAdminAudit }, { getArticleById, getRevision, publishRevision, transitionRevision }, { emitRevisionOutcome }] = await Promise.all([
    import("@/lib/admin-db"),
    import("@/lib/wiki-db"),
    import("@/lib/notification-service"),
  ]);
  const revisionId = String(formData.get("revisionId") || "");
  const intent = String(formData.get("intent") || "");
  const note = String(formData.get("moderatorNote") || "")
    .trim()
    .slice(0, 2000);
  const revision = getRevision(revisionId);
  if (!revision || !["pending_review", "verifying"].includes(revision.status))
    throw new Error("This revision is not awaiting review.");
  assertArticleEditable(revision.articleId, moderator.role);
  const beforeStatus = revision.status;
  const previousLiveRevision =
    getArticleById(revision.articleId)?.liveRevision || null;
  if (intent === "approve")
    publishRevision(revisionId, moderator.userId, note || null);
  else if (intent === "request_changes") {
    if (!note) throw new Error("Explain the requested changes.");
    transitionRevision(revisionId, moderator.userId, "changes_requested", {
      note,
      moderator: true,
    });
  } else if (intent === "reject") {
    if (!note) throw new Error("Explain why the revision was rejected.");
    transitionRevision(revisionId, moderator.userId, "rejected", {
      note,
      moderator: true,
    });
  } else throw new Error("Invalid moderation action.");
  const moderatedRevision = getRevision(revisionId);
  if (moderatedRevision)
    await emitRevisionOutcome({
      actorId: moderator.userId,
      revision: moderatedRevision,
      outcome:
        intent === "approve"
          ? "approved"
          : intent === "request_changes"
            ? "changes_requested"
            : "rejected",
      note,
      previousLiveRevision,
    });
  recordAdminAudit({
    actorId: moderator.userId,
    actorName: moderator.name,
    action: `revision.${intent}`,
    entityType: "revision",
    entityId: revisionId,
    articleId: revision.articleId,
    revisionId,
    before: { status: beforeStatus },
    after: { status: getRevision(revisionId)?.status, note },
  });
  revalidatePath("/moderation");
  revalidatePath(articlePath(revision.contentType, revision.articleSlug));
  revalidatePath(articlePath(revision.contentType, revision.proposedSlug));
  revalidatePath(
    articleHistoryPath(revision.contentType, revision.proposedSlug),
  );
  redirect("/moderation");
}

export async function editAndApproveAction(formData: FormData) {
  const moderator = await requireModerator();
  const [{ assertArticleEditable, recordAdminAudit }, { getArticleById, getRevision, moderatorEditRevision, publishRevision, validateRelationships }, { emitRevisionOutcome }] = await Promise.all([
    import("@/lib/admin-db"),
    import("@/lib/wiki-db"),
    import("@/lib/notification-service"),
  ]);
  const revisionId = String(formData.get("revisionId") || "");
  const content = parseContent(formData, true);
  const editSummary = String(formData.get("editSummary") || "")
    .trim()
    .slice(0, 500);
  const proposedSlug = normalizeSlug(String(formData.get("slug") || ""));
  const before = getRevision(revisionId);
  if (!before) throw new Error("Revision not found.");
  assertArticleEditable(before.articleId, moderator.role);
  const previousLiveRevision =
    getArticleById(before.articleId)?.liveRevision || null;
  validateRelationships(
    before.articleId,
    content.contentType,
    content.relationships,
    new Set(
      parseArticleMarkdown(content.markdown).citations.map(
        (citation) => citation.identifier,
      ),
    ),
  );
  moderatorEditRevision(
    revisionId,
    content,
    proposedSlug,
    editSummary || "Moderator edits before approval",
    moderator.userId,
  );
  const article = publishRevision(
    revisionId,
    moderator.userId,
    "Edited and approved by moderator.",
  );
  const approvedRevision = getRevision(revisionId);
  if (approvedRevision)
    await emitRevisionOutcome({
      actorId: moderator.userId,
      revision: approvedRevision,
      outcome: "approved",
      note: "Edited and approved by moderator.",
      previousLiveRevision,
    });
  recordAdminAudit({
    actorId: moderator.userId,
    actorName: moderator.name,
    action: "revision.edited_and_approved",
    entityType: "revision",
    entityId: revisionId,
    articleId: article.id,
    revisionId,
    before,
    after: getRevision(revisionId),
  });
  revalidatePath(articlePath(article.contentType, article.slug));
  revalidatePath(articleHistoryPath(article.contentType, article.slug));
  revalidatePath("/moderation");
  redirect(articlePath(article.contentType, article.slug));
}

export async function restoreRevisionAction(formData: FormData) {
  const moderator = await requireModerator();
  const [{ assertArticleEditable, recordAdminAudit }, { getArticleById, getRevision, restoreRevision, transitionRevision }] = await Promise.all([
    import("@/lib/admin-db"),
    import("@/lib/wiki-db"),
  ]);
  const sourceRevisionId = String(formData.get("revisionId") || "");
  const source = getRevision(sourceRevisionId);
  if (!source) throw new Error("Revision not found.");
  assertArticleEditable(source.articleId, moderator.role);
  let restored = restoreRevision(
    sourceRevisionId,
    moderator.userId,
    moderator.name,
  );
  restored = transitionRevision(
    restored.id,
    moderator.userId,
    "pending_review",
    { verification: await verifyRevision(restored), moderator: true },
  );
  const article = getArticleById(restored.articleId)!;
  recordAdminAudit({
    actorId: moderator.userId,
    actorName: moderator.name,
    action: "article.restoration_proposed",
    entityType: "article",
    entityId: article.id,
    articleId: article.id,
    revisionId: restored.id,
    after: {
      sourceRevisionId,
      proposedRevisionId: restored.id,
      status: restored.status,
    },
  });
  revalidatePath("/moderation");
  redirect(`/moderation/${restored.id}`);
}
