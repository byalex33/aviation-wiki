"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addPrivateRevisionNote,
  assertArticleEditable,
  assignRevision,
  getAdminRevision,
  getArticleAdminById,
  recordAdminAudit,
  updateArticleAdmin,
  updateSourceCheck,
  upsertContributorProfile,
} from "@/lib/admin-db";
import { listAllClerkUsers } from "@/lib/admin-users";
import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import { verifyRevision } from "@/lib/gemini-verification";
import { emitRevisionOutcome } from "@/lib/notification-service";
import {
  getArticleById,
  getRevision,
  normalizeSlug,
  publishRevision,
  restoreRevision,
  transitionRevision,
} from "@/lib/wiki-db";
import {
  requireAdmin,
  requireStaff,
  wikiRoles,
  type WikiRole,
} from "@/lib/wiki-auth";

function text(formData: FormData, key: string, max = 2_000) {
  return String(formData.get(key) || "")
    .trim()
    .slice(0, max);
}

export async function adminModerateRevisionAction(formData: FormData) {
  const actor = await requireStaff();
  const revisionId = text(formData, "revisionId", 100);
  const intent = text(formData, "intent", 40);
  const note = text(formData, "moderatorNote");
  const before = getRevision(revisionId);
  if (!before || !["pending_review", "verifying"].includes(before.status))
    throw new Error("This revision is not awaiting review.");
  assertArticleEditable(before.articleId, actor.role);
  const previousLiveRevision =
    getArticleById(before.articleId)?.liveRevision || null;
  if (intent === "approve")
    publishRevision(revisionId, actor.userId, note || null);
  else if (intent === "request_changes") {
    if (!note)
      throw new Error("A message is required when requesting changes.");
    transitionRevision(revisionId, actor.userId, "changes_requested", {
      note,
      moderator: true,
    });
  } else if (intent === "reject") {
    if (!note) throw new Error("A rejection reason is required.");
    transitionRevision(revisionId, actor.userId, "rejected", {
      note,
      moderator: true,
    });
  } else throw new Error("Invalid moderation decision.");
  const after = getRevision(revisionId);
  if (after && ["approve", "request_changes", "reject"].includes(intent))
    await emitRevisionOutcome({
      actorId: actor.userId,
      revision: after,
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
    actorId: actor.userId,
    actorName: actor.name,
    action: `revision.${intent}`,
    entityType: "revision",
    entityId: revisionId,
    articleId: before.articleId,
    revisionId,
    before: { status: before.status },
    after: { status: after?.status, note },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath(`/admin/moderation/${revisionId}`);
  revalidatePath(`/wiki/${before.articleSlug}`);
  redirect("/admin/moderation");
}

export async function assignRevisionAction(formData: FormData) {
  const actor = await requireStaff();
  const revisionId = text(formData, "revisionId", 100);
  const revision = getAdminRevision(revisionId);
  if (!revision) throw new Error("Revision not found.");
  const assigned = formData.get("assigned") === "self" ? actor.userId : null;
  assignRevision(revisionId, assigned);
  recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: assigned ? "revision.assigned" : "revision.unassigned",
    entityType: "revision",
    entityId: revisionId,
    articleId: String(revision.article_id),
    revisionId,
    before: { assignedTo: revision.assigned_moderator_id },
    after: { assignedTo: assigned },
  });
  revalidatePath(`/admin/moderation/${revisionId}`);
  revalidatePath("/admin/moderation");
}

export async function addPrivateNoteAction(formData: FormData) {
  const actor = await requireStaff();
  const revisionId = text(formData, "revisionId", 100);
  const note = text(formData, "note", 4_000);
  if (!note || !getAdminRevision(revisionId))
    throw new Error("A valid revision and note are required.");
  addPrivateRevisionNote({
    revisionId,
    moderatorId: actor.userId,
    moderatorName: actor.name,
    note,
  });
  recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "revision.private_note_added",
    entityType: "revision",
    entityId: revisionId,
    revisionId,
    after: { note },
  });
  revalidatePath(`/admin/moderation/${revisionId}`);
}

export async function updateArticleAction(formData: FormData) {
  const actor = await requireAdmin();
  const articleId = text(formData, "articleId", 100);
  const before = getArticleAdminById(articleId);
  if (!before) throw new Error("Article not found.");
  const protectionLevel = text(formData, "protectionLevel", 30);
  if (!["open", "trusted", "moderator", "admin"].includes(protectionLevel))
    throw new Error("Invalid editing permission.");
  const slug = normalizeSlug(text(formData, "slug", 100));
  if (!slug) throw new Error("A valid slug is required.");
  const redirectToSlug =
    normalizeSlug(text(formData, "redirectToSlug", 100)) || null;
  if (redirectToSlug === slug)
    throw new Error("An article cannot redirect to itself.");
  const input = {
    articleId,
    protectionLevel,
    locked: formData.get("locked") === "on",
    archived: formData.get("archived") === "on",
    redirectToSlug,
    slug,
  };
  updateArticleAdmin(input);
  const after = getArticleAdminById(articleId);
  recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "article.controls_updated",
    entityType: "article",
    entityId: articleId,
    articleId,
    before,
    after,
  });
  revalidatePath("/admin/articles");
  revalidatePath(
    articlePath(
      String(before.content_type) as import("@/lib/wiki-types").ContentType,
      String(before.slug),
    ),
  );
  revalidatePath(
    articlePath(
      String(before.content_type) as import("@/lib/wiki-types").ContentType,
      slug,
    ),
  );
}

export async function restoreArticleRevisionAction(formData: FormData) {
  const actor = await requireAdmin();
  const revisionId = text(formData, "revisionId", 100);
  const source = getRevision(revisionId);
  if (!source) throw new Error("Revision not found.");
  assertArticleEditable(source.articleId, actor.role);
  let restored = restoreRevision(revisionId, actor.userId, actor.name);
  restored = transitionRevision(restored.id, actor.userId, "pending_review", {
    verification: await verifyRevision(restored),
    moderator: true,
  });
  const article = getArticleById(restored.articleId)!;
  recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "article.restoration_proposed",
    entityType: "article",
    entityId: article.id,
    articleId: article.id,
    revisionId: restored.id,
    after: {
      sourceRevisionId: revisionId,
      proposedRevisionId: restored.id,
      status: restored.status,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath(articlePath(article.contentType, article.slug));
  revalidatePath(articleHistoryPath(article.contentType, article.slug));
  revalidatePath("/admin/moderation");
  redirect(`/admin/moderation/${restored.id}`);
}

export async function updateContributorAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = text(formData, "userId", 120);
  const role = text(formData, "role", 40) as WikiRole;
  if (!wikiRoles.includes(role)) throw new Error("Invalid role.");
  const users = await listAllClerkUsers();
  const target = users.find((user) => user.id === userId);
  if (!target) throw new Error("Clerk user not found.");
  const previousRole = wikiRoles.includes(
    target.publicMetadata.role as WikiRole,
  )
    ? (target.publicMetadata.role as WikiRole)
    : "contributor";
  const adminCount = users.filter(
    (user) => user.publicMetadata.role === "admin",
  ).length;
  if (
    userId === actor.userId &&
    previousRole === "admin" &&
    role !== "admin" &&
    adminCount <= 1
  )
    throw new Error("The final admin cannot remove their own admin access.");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { role } });
  const profile = {
    userId,
    notes: text(formData, "moderatorNotes", 4_000),
    restriction: text(formData, "restriction", 40),
    trusted: formData.get("trusted") === "on" || role === "trusted_contributor",
  };
  if (!["none", "read_only", "suspended"].includes(profile.restriction))
    throw new Error("Invalid account restriction.");
  upsertContributorProfile(profile);
  recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "contributor.updated",
    entityType: "user",
    entityId: userId,
    before: { role: previousRole },
    after: {
      role,
      restriction: profile.restriction,
      trusted: profile.trusted,
      moderatorNotes: profile.notes,
    },
  });
  revalidatePath("/admin/contributors");
}

export async function updateSourceCheckAction(formData: FormData) {
  const actor = await requireStaff();
  const url = text(formData, "url", 2_000);
  const status = text(formData, "status", 30);
  const strength = text(formData, "strength", 30);
  if (
    !/^https?:\/\//.test(url) ||
    !["ok", "broken", "unchecked"].includes(status) ||
    !["strong", "standard", "weak"].includes(strength)
  )
    throw new Error("Invalid source review.");
  updateSourceCheck({
    url,
    status,
    strength,
    note: text(formData, "note"),
    checkedBy: actor.userId,
  });
  recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "source.reviewed",
    entityType: "source",
    entityId: url,
    after: { status, strength },
  });
  revalidatePath("/admin/sources");
}
