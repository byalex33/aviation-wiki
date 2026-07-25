"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listAllClerkUsers } from "@/lib/admin-users";
import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import {
  formActionError,
  type FormActionState,
} from "@/lib/form-action-state";
import { verifyRevision } from "@/lib/gemini-verification";
import {
  requireAdmin,
  requireStaff,
  wikiRoles,
  type WikiRole,
} from "@/lib/wiki-auth";

const adminDatabase = () =>
  process.env.DATABASE_URL
    ? import("@/lib/wiki-public-db")
    : import("@/lib/admin-db");

const wikiDatabase = () =>
  process.env.DATABASE_URL
    ? import("@/lib/wiki-public-db")
    : import("@/lib/wiki-db");

function text(formData: FormData, key: string, max = 2_000) {
  return String(formData.get(key) || "")
    .trim()
    .slice(0, max);
}

export async function adminModerateRevisionAction(formData: FormData) {
  const [adminDb, wikiDb, notifications] = await Promise.all([
    adminDatabase(),
    wikiDatabase(),
    import("@/lib/notification-service"),
  ]);
  const actor = await requireStaff();
  const revisionId = text(formData, "revisionId", 100);
  const intent = text(formData, "intent", 40);
  const note = text(formData, "moderatorNote");
  const before = await wikiDb.getRevision(revisionId);
  if (!before || !["pending_review", "verifying"].includes(before.status))
    throw new Error("This revision is not awaiting review.");
  await adminDb.assertArticleEditable(before.articleId, actor.role);
  const previousLiveRevision =
    (await wikiDb.getArticleById(before.articleId))?.liveRevision || null;
  if (intent === "approve")
    await wikiDb.publishRevision(revisionId, actor.userId, note || null);
  else if (intent === "request_changes") {
    if (!note)
      throw new Error("A message is required when requesting changes.");
    await wikiDb.transitionRevision(revisionId, actor.userId, "changes_requested", {
      note,
      moderator: true,
    });
  } else if (intent === "reject") {
    if (!note) throw new Error("A rejection reason is required.");
    await wikiDb.transitionRevision(revisionId, actor.userId, "rejected", {
      note,
      moderator: true,
    });
  } else throw new Error("Invalid moderation decision.");
  const after = await wikiDb.getRevision(revisionId);
  if (after && ["approve", "request_changes", "reject"].includes(intent))
    await notifications.emitRevisionOutcome({
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
  await adminDb.recordAdminAudit({
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
  const adminDb = await adminDatabase();
  const actor = await requireStaff();
  const revisionId = text(formData, "revisionId", 100);
  const revision = await adminDb.getAdminRevision(revisionId);
  if (!revision) throw new Error("Revision not found.");
  const assigned = formData.get("assigned") === "self" ? actor.userId : null;
  await adminDb.assignRevision(revisionId, assigned);
  await adminDb.recordAdminAudit({
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
  const adminDb = await adminDatabase();
  const actor = await requireStaff();
  const revisionId = text(formData, "revisionId", 100);
  const note = text(formData, "note", 4_000);
  if (!note || !(await adminDb.getAdminRevision(revisionId)))
    throw new Error("A valid revision and note are required.");
  await adminDb.addPrivateRevisionNote({
    revisionId,
    moderatorId: actor.userId,
    moderatorName: actor.name,
    note,
  });
  await adminDb.recordAdminAudit({
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
  const [adminDb, wikiDb] = await Promise.all([adminDatabase(), wikiDatabase()]);
  const actor = await requireAdmin();
  const articleId = text(formData, "articleId", 100);
  const before = await adminDb.getArticleAdminById(articleId);
  if (!before) throw new Error("Article not found.");
  const protectionLevel = text(formData, "protectionLevel", 30);
  if (!["open", "trusted", "moderator", "admin"].includes(protectionLevel))
    throw new Error("Invalid editing permission.");
  const slug = wikiDb.normalizeSlug(text(formData, "slug", 100));
  if (!slug) throw new Error("A valid slug is required.");
  const redirectToSlug =
    wikiDb.normalizeSlug(text(formData, "redirectToSlug", 100)) || null;
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
  await adminDb.updateArticleAdmin(input);
  const after = await adminDb.getArticleAdminById(articleId);
  await adminDb.recordAdminAudit({
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

export async function updateArticleFormAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await updateArticleAction(formData);
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}

export async function restoreArticleRevisionAction(formData: FormData) {
  const [adminDb, wikiDb] = await Promise.all([adminDatabase(), wikiDatabase()]);
  const actor = await requireAdmin();
  const revisionId = text(formData, "revisionId", 100);
  const source = await wikiDb.getRevision(revisionId);
  if (!source) throw new Error("Revision not found.");
  await adminDb.assertArticleEditable(source.articleId, actor.role);
  let restored = await wikiDb.restoreRevision(revisionId, actor.userId, actor.name);
  restored = await wikiDb.transitionRevision(restored.id, actor.userId, "pending_review", {
    verification: await verifyRevision(restored),
    moderator: true,
  });
  const article = (await wikiDb.getArticleById(restored.articleId))!;
  await adminDb.recordAdminAudit({
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
  const adminDb = await adminDatabase();
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
  await adminDb.upsertContributorProfile(profile);
  await adminDb.recordAdminAudit({
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
  const adminDb = await adminDatabase();
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
  await adminDb.updateSourceCheck({
    url,
    status,
    strength,
    note: text(formData, "note"),
    checkedBy: actor.userId,
  });
  await adminDb.recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "source.reviewed",
    entityType: "source",
    entityId: url,
    after: { status, strength },
  });
  revalidatePath("/admin/sources");
}

export async function sendCustomNotificationAction(formData: FormData) {
  const [adminDb, { emitCustomNotification }] = await Promise.all([
    adminDatabase(),
    import("@/lib/notification-service"),
  ]);
  const actor = await requireAdmin();
  const audience = text(formData, "recipientId", 120);
  const title = text(formData, "title", 160);
  const message = text(formData, "message", 1_000);
  const requestedHref = text(formData, "href", 500);
  const href = requestedHref || "/notifications";
  if (!title || !message)
    throw new Error("A notification title and message are required.");
  if (!href.startsWith("/") || href.startsWith("//"))
    throw new Error("The destination must be a local aviation.wiki path.");
  const users = await listAllClerkUsers();
  const recipients =
    audience === "all"
      ? users
      : users.filter((user) => user.id === audience);
  if (!recipients.length) throw new Error("Notification recipient not found.");
  const notifications: Array<
    Awaited<ReturnType<typeof emitCustomNotification>>
  > = [];
  for (let index = 0; index < recipients.length; index += 10) {
    const batch = recipients.slice(index, index + 10);
    notifications.push(
      ...(await Promise.all(
        batch.map((recipient) =>
          emitCustomNotification({
            recipientId: recipient.id,
            actorId: actor.userId,
            title,
            message,
            href,
          }),
        ),
      )),
    );
  }
  const sentCount = notifications.filter(Boolean).length;
  if (sentCount !== recipients.length)
    throw new Error("One or more notifications could not be created.");
  await adminDb.recordAdminAudit({
    actorId: actor.userId,
    actorName: actor.name,
    action: "notification.custom_sent",
    entityType: audience === "all" ? "audience" : "user",
    entityId: audience,
    after: { recipientCount: sentCount, title, message, href },
  });
  revalidatePath("/admin/notifications");
  revalidatePath("/notifications");
  redirect("/admin/notifications?sent=1");
}
