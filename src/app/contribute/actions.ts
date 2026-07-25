"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import {
  formActionError,
  type FormActionState,
} from "@/lib/form-action-state";
import {
  isSafeCitationUrl,
  parseArticleMarkdown,
  parseStructuredFieldMarkdown,
} from "@/lib/article-markdown";
import { reconcileCitationSources } from "@/lib/article-citations";
import { enforceRateLimit } from "@/lib/rate-limit";
import { UserFacingError } from "@/lib/user-facing-error";
import { isStaffRole, requireContributor, requireModerator } from "@/lib/wiki-auth";
import {
  assertArticleEditable as assertPostgresArticleEditable,
  createOrGetArticle as createOrGetPostgresArticle,
  getArticleById as getPostgresArticleById,
  getArticleBySlug as getPostgresArticleBySlug,
  getContributorRestriction as getPostgresContributorRestriction,
  getRevision as getPostgresRevision,
  moderatorEditRevision as moderatorEditPostgresRevision,
  normalizeSlug,
  publishRevision as publishPostgresRevision,
  recordAdminAudit as recordPostgresAdminAudit,
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
    throw new UserFacingError(`Invalid ${key}.`);
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
    throw new UserFacingError("A title and valid content type are required.");
  const markdown = String(formData.get("markdown") || "")
    .trim()
    .slice(0, 250_000);
  const parsedMarkdown = parseArticleMarkdown(markdown);
  if (parsedMarkdown.errors.length)
    throw new UserFacingError(
      `The Markdown has ${parsedMarkdown.errors.length} syntax ${parsedMarkdown.errors.length === 1 ? "error" : "errors"}.`,
    );
  const fields = (parsedMarkdown.sidebarFields ?? parseArray<StructuredField>(formData, "fields"))
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
  for (const field of fields) {
    const fieldMarkdown = parseStructuredFieldMarkdown(field.value);
    if (fieldMarkdown.errors.length) throw new UserFacingError(`Structured field "${field.key}" has invalid Markdown: ${fieldMarkdown.errors[0].message}`);
  }
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
      throw new UserFacingError(
        `Unsafe or unsupported source URL: ${url.slice(0, 200)}.`,
      );
    if (archiveUrl && !isSafeCitationUrl(archiveUrl))
      throw new UserFacingError(
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
        throw new UserFacingError("Invalid relationship type.");
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
    throw new UserFacingError(
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
  contributor?: Awaited<ReturnType<typeof requireContributor>>,
) {
  const authenticatedContributor = contributor || await requireContributor();
  const content = parseContent(formData, requireSubmissionFields);
  const slug = normalizeSlug(String(formData.get("slug") || content.title));
  if (!slug) throw new UserFacingError("A valid article slug is required.");
  const revisionId = String(formData.get("revisionId") || "") || undefined;
  const submittedArticleId =
    String(formData.get("articleId") || "") || undefined;
  const existingRevision = revisionId ? await getPostgresRevision(revisionId) : null;
  if (revisionId && !existingRevision) throw new UserFacingError("Revision not found.");
  const existingArticle = existingRevision
    ? await getPostgresArticleById(existingRevision.articleId)
    : submittedArticleId
      ? await getPostgresArticleById(submittedArticleId)
      : await getPostgresArticleBySlug(slug, content.contentType);
  const restriction = await getPostgresContributorRestriction(authenticatedContributor.userId);
  if (restriction === "suspended" || restriction === "read_only")
    throw new UserFacingError("This account is not allowed to submit edits.");
  const article =
    existingArticle ||
    await createOrGetPostgresArticle(slug, content.title, content.contentType);
  if (article.contentType !== content.contentType)
    throw new UserFacingError(
      "An existing article cannot change content type through an edit.",
    );
  if (existingRevision && existingRevision.articleId !== article.id)
    throw new UserFacingError("The revision does not belong to this article.");
  await assertPostgresArticleEditable(article.id, authenticatedContributor.role, restriction);
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
    throw new UserFacingError("An edit summary is required before submission.");
  return savePostgresDraft({
    revisionId,
    articleId: article.id,
    proposedSlug: slug,
    contributorId: authenticatedContributor.userId,
    contributorName: authenticatedContributor.name,
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
    throw new UserFacingError("Title, slug, and content type are required.");
  redirect(
    `/contribute/${slug}?title=${encodeURIComponent(title)}&type=${encodeURIComponent(contentType)}`,
  );
}

export async function startArticleFormAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await startArticleAction(formData);
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}

export async function saveDraftAction(formData: FormData) {
  const contributor = await requireContributor();
  await enforceRateLimit({
    scope: "contribution-draft-write",
    subject: contributor.userId,
    limit: 30,
    windowMs: 60_000,
  });
  const revision = await persistFromForm(formData, false, contributor);
  revalidatePath("/contribute");
  const returnTo = safeReturnTo(
    formData,
    `/contribute/${revision.articleSlug}`,
  );
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=1`);
}

export async function saveDraftFormAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await saveDraftAction(formData);
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}

export async function submitRevisionAction(formData: FormData) {
  const contributor = await requireContributor();
  await enforceRateLimit(
    {
      scope: "contribution-submit",
      subject: contributor.userId,
      limit: 5,
      windowMs: 10 * 60_000,
    },
    "Too many submission attempts. Wait a few minutes and try again.",
  );
  const revision = await persistFromForm(formData, true, contributor);
  await transitionPostgresRevision(revision.id, contributor.userId, "pending_review");
  revalidatePath("/contribute");
  revalidatePath("/moderation");
  if (isStaffRole(contributor.role)) {
    const previousLiveRevision =
      (await getPostgresArticleById(revision.articleId))?.liveRevision || null;
    const note = "Published directly by staff submitter.";
    const article = await publishPostgresRevision(
      revision.id,
      contributor.userId,
      note,
    );
    const approvedRevision = await getPostgresRevision(revision.id);
    if (approvedRevision) {
      const { emitRevisionOutcome } = await import("@/lib/notification-service");
      await emitRevisionOutcome({
        actorId: contributor.userId,
        revision: approvedRevision,
        outcome: "approved",
        note,
        previousLiveRevision,
      });
    }
    await recordPostgresAdminAudit({
      actorId: contributor.userId,
      actorName: contributor.name,
      action: "revision.staff_publish",
      entityType: "revision",
      entityId: revision.id,
      articleId: article.id,
      revisionId: revision.id,
      before: { status: "pending_review" },
      after: { status: "approved", note },
    });
    revalidatePath(articlePath(article.contentType, revision.articleSlug));
    revalidatePath(articlePath(article.contentType, article.slug));
    revalidatePath(articleHistoryPath(article.contentType, article.slug));
    redirect(articlePath(article.contentType, article.slug));
  }
  const returnTo = safeReturnTo(
    formData,
    `/contribute/${revision.articleSlug}`,
  );
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}submitted=1`);
}

export async function submitRevisionFormAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await submitRevisionAction(formData);
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}

export async function moderateRevisionAction(formData: FormData) {
  const moderator = await requireModerator();
  await enforceRateLimit({
    scope: "moderation-write",
    subject: moderator.userId,
    limit: 20,
    windowMs: 60_000,
  });
  const [{ recordAdminAudit }, { emitRevisionOutcome }] = await Promise.all([
    import("@/lib/admin-db"),
    import("@/lib/notification-service"),
  ]);
  const revisionId = String(formData.get("revisionId") || "");
  const intent = String(formData.get("intent") || "");
  const note = String(formData.get("moderatorNote") || "")
    .trim()
    .slice(0, 2000);
  const revision = await getPostgresRevision(revisionId);
  if (!revision || !["pending_review", "verifying"].includes(revision.status))
    throw new UserFacingError("This revision is not awaiting review.");
  await assertPostgresArticleEditable(revision.articleId, moderator.role);
  const beforeStatus = revision.status;
  const previousLiveRevision =
    (await getPostgresArticleById(revision.articleId))?.liveRevision || null;
  if (intent === "approve")
    await publishPostgresRevision(revisionId, moderator.userId, note || null);
  else if (intent === "request_changes") {
    if (!note) throw new UserFacingError("Explain the requested changes.");
    await transitionPostgresRevision(revisionId, moderator.userId, "changes_requested", {
      note,
      moderator: true,
    });
  } else if (intent === "reject") {
    if (!note) throw new UserFacingError("Explain why the revision was rejected.");
    await transitionPostgresRevision(revisionId, moderator.userId, "rejected", {
      note,
      moderator: true,
    });
  } else throw new UserFacingError("Invalid moderation action.");
  const moderatedRevision = await getPostgresRevision(revisionId);
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
    after: { status: (await getPostgresRevision(revisionId))?.status, note },
  });
  revalidatePath("/moderation");
  revalidatePath(articlePath(revision.contentType, revision.articleSlug));
  revalidatePath(articlePath(revision.contentType, revision.proposedSlug));
  revalidatePath(
    articleHistoryPath(revision.contentType, revision.proposedSlug),
  );
  redirect("/moderation");
}

export async function moderateRevisionFormAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await moderateRevisionAction(formData);
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}

export async function editAndApproveAction(formData: FormData) {
  const moderator = await requireModerator();
  await enforceRateLimit({
    scope: "moderation-write",
    subject: moderator.userId,
    limit: 20,
    windowMs: 60_000,
  });
  const [{ recordAdminAudit }, { emitRevisionOutcome }] = await Promise.all([
    import("@/lib/admin-db"),
    import("@/lib/notification-service"),
  ]);
  const revisionId = String(formData.get("revisionId") || "");
  const content = parseContent(formData, true);
  const editSummary = String(formData.get("editSummary") || "")
    .trim()
    .slice(0, 500);
  const proposedSlug = normalizeSlug(String(formData.get("slug") || ""));
  const before = await getPostgresRevision(revisionId);
  if (!before) throw new UserFacingError("Revision not found.");
  await assertPostgresArticleEditable(before.articleId, moderator.role);
  const previousLiveRevision =
    (await getPostgresArticleById(before.articleId))?.liveRevision || null;
  await validatePostgresRelationships(
    before.articleId,
    content.contentType,
    content.relationships,
    new Set(
      parseArticleMarkdown(content.markdown).citations.map(
        (citation) => citation.identifier,
      ),
    ),
  );
  await moderatorEditPostgresRevision(
    revisionId,
    content,
    proposedSlug,
    editSummary || "Moderator edits before approval",
    moderator.userId,
  );
  const article = await publishPostgresRevision(
    revisionId,
    moderator.userId,
    "Edited and approved by moderator.",
  );
  const approvedRevision = await getPostgresRevision(revisionId);
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
    after: await getPostgresRevision(revisionId),
  });
  revalidatePath(articlePath(article.contentType, article.slug));
  revalidatePath(articleHistoryPath(article.contentType, article.slug));
  revalidatePath("/moderation");
  redirect(articlePath(article.contentType, article.slug));
}

export async function editAndApproveFormAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await editAndApproveAction(formData);
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}
