import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import {
  createNotification,
  getNotificationPreferences,
  listArticleWatcherIds,
  listPendingDigestNotifications,
  queueEmailDelivery,
  updateEmailDelivery,
} from "@/lib/notification-db";
import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notification-types";
import type { RevisionRecord } from "@/lib/wiki-types";

type NotificationInput = {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  dedupeKey: string;
  articleId?: string | null;
  revisionId?: string | null;
};

function absoluteUrl(href: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new URL(href, origin).toString();
}

async function verifiedPrimaryEmail(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  return email?.verification?.status === "verified" ? email.emailAddress : null;
}

export async function deliverNotificationEmail(
  notification: NotificationRecord,
) {
  const delivery = queueEmailDelivery(notification.id, notification.userId);
  if (!delivery || delivery.status === "sent") return;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_EMAIL_FROM;
  if (!apiKey || !from) {
    updateEmailDelivery({
      notificationId: notification.id,
      status: "failed",
      failureReason: "Resend is not configured.",
      incrementRetry: true,
    });
    return;
  }
  try {
    const email = await verifiedPrimaryEmail(notification.userId);
    if (!email)
      throw new Error("No verified primary email address is available.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `aviation-wiki-${notification.id}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: notification.title,
        text: `${notification.message}\n\nView on aviation.wiki: ${absoluteUrl(notification.href)}`,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!response.ok)
      throw new Error(result.message || `Resend returned ${response.status}.`);
    updateEmailDelivery({
      notificationId: notification.id,
      status: "sent",
      providerMessageId: result.id || null,
    });
  } catch (error) {
    updateEmailDelivery({
      notificationId: notification.id,
      status: "failed",
      failureReason:
        error instanceof Error ? error.message : "Email delivery failed.",
      incrementRetry: true,
    });
  }
}

export async function emitNotification(input: NotificationInput) {
  if (!input.recipientId || input.recipientId === input.actorId) return null;
  const preferences = getNotificationPreferences(input.recipientId);
  const notification = createNotification({
    ...input,
    userId: input.recipientId,
  });
  if (!notification) return null;
  if (
    preferences.frequency === "immediate" &&
    preferences.enabledTypes[input.type]
  )
    await deliverNotificationEmail(notification);
  return notification;
}

export async function emitRevisionOutcome(input: {
  actorId: string;
  revision: RevisionRecord;
  outcome: "approved" | "changes_requested" | "rejected";
  note?: string | null;
  previousLiveRevision?: RevisionRecord | null;
}) {
  const { actorId, revision, outcome, note, previousLiveRevision } = input;
  const href = `/contribute/${revision.proposedSlug}?type=${revision.contentType}`;
  const outcomeContent = {
    approved: {
      type: "revision_approved" as const,
      title: "Revision approved",
      message: `Your revision to ${revision.title} was approved.`,
    },
    changes_requested: {
      type: "changes_requested" as const,
      title: "Changes requested",
      message: `A moderator requested changes to your revision of ${revision.title}.`,
    },
    rejected: {
      type: "revision_rejected" as const,
      title: "Revision rejected",
      message: `Your revision to ${revision.title} was rejected.`,
    },
  }[outcome];
  await emitNotification({
    recipientId: revision.contributorId,
    actorId,
    ...outcomeContent,
    message: outcomeContent.message,
    href,
    articleId: revision.articleId,
    revisionId: revision.id,
    dedupeKey: `revision:${revision.id}:${outcome}`,
  });
  if (note) {
    await emitNotification({
      recipientId: revision.contributorId,
      actorId,
      type: "moderator_feedback",
      title: "Moderator feedback",
      message: `A moderator left feedback on your revision of ${revision.title}.`,
      href,
      articleId: revision.articleId,
      revisionId: revision.id,
      dedupeKey: `revision:${revision.id}:feedback:${outcome}`,
    });
  }
  if (outcome !== "approved") return;

  if (previousLiveRevision && previousLiveRevision.id !== revision.id) {
    await emitNotification({
      recipientId: previousLiveRevision.contributorId,
      actorId,
      type: revision.editSummary.startsWith("Restore revision")
        ? "article_restored"
        : "article_superseded",
      title: revision.editSummary.startsWith("Restore revision")
        ? "Article restored"
        : "Article revision superseded",
      message: `${revision.title} now has a newer approved revision.`,
      href: `/history/${revision.proposedSlug}`,
      articleId: revision.articleId,
      revisionId: revision.id,
      dedupeKey: `revision:${revision.id}:supersedes:${previousLiveRevision.id}`,
    });
  }

  for (const watcherId of listArticleWatcherIds(revision.articleId)) {
    if (watcherId === revision.contributorId) continue;
    await emitNotification({
      recipientId: watcherId,
      actorId,
      type: "watched_article_edited",
      title: "Watched article updated",
      message: `${revision.title} has a newly approved revision.`,
      href: `/wiki/${revision.proposedSlug}`,
      articleId: revision.articleId,
      revisionId: revision.id,
      dedupeKey: `watch:${watcherId}:revision:${revision.id}`,
    });
  }

  const previousSources = new Set(
    previousLiveRevision?.sources.map((source) => source.url) || [],
  );
  const nextSources = new Set(revision.sources.map((source) => source.url));
  const previousRelationships = new Set(
    previousLiveRevision?.relationships.map(
      (relationship) => `${relationship.type}:${relationship.targetArticleId}`,
    ) || [],
  );
  const nextRelationships = new Set(
    revision.relationships.map(
      (relationship) => `${relationship.type}:${relationship.targetArticleId}`,
    ),
  );
  for (const [kind, count] of [
    [
      "source_accepted",
      [...nextSources].filter((value) => !previousSources.has(value)).length,
    ],
    [
      "source_removed",
      [...previousSources].filter((value) => !nextSources.has(value)).length,
    ],
    [
      "relationship_accepted",
      [...nextRelationships].filter(
        (value) => !previousRelationships.has(value),
      ).length,
    ],
    [
      "relationship_removed",
      [...previousRelationships].filter(
        (value) => !nextRelationships.has(value),
      ).length,
    ],
  ] as const) {
    if (!count) continue;
    const isSource = kind.startsWith("source");
    const accepted = kind.endsWith("accepted");
    await emitNotification({
      recipientId: revision.contributorId,
      actorId,
      type: kind,
      title: `${isSource ? "Source" : "Relationship"} ${accepted ? "accepted" : "removed"}`,
      message: `${count} ${isSource ? "source" : "relationship"}${count === 1 ? "" : "s"} ${accepted ? "were accepted" : "were removed"} in ${revision.title}.`,
      href,
      articleId: revision.articleId,
      revisionId: revision.id,
      dedupeKey: `revision:${revision.id}:${kind}`,
    });
  }
}

export async function deliverDailyDigests() {
  const pending = listPendingDigestNotifications();
  const byUser = new Map<string, NotificationRecord[]>();
  for (const notification of pending)
    byUser.set(notification.userId, [
      ...(byUser.get(notification.userId) || []),
      notification,
    ]);
  let sent = 0;
  for (const [userId, notifications] of byUser) {
    const preferences = getNotificationPreferences(userId);
    const enabled = notifications.filter(
      (notification) => preferences.enabledTypes[notification.type],
    );
    if (!enabled.length) continue;
    for (const notification of enabled)
      queueEmailDelivery(notification.id, userId);
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.NOTIFICATION_EMAIL_FROM;
      if (!apiKey || !from) throw new Error("Resend is not configured.");
      const email = await verifiedPrimaryEmail(userId);
      if (!email)
        throw new Error("No verified primary email address is available.");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `aviation-wiki-digest-${userId}-${new Date().toISOString().slice(0, 10)}`,
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `${enabled.length} aviation.wiki update${enabled.length === 1 ? "" : "s"}`,
          text: enabled
            .map(
              (notification) =>
                `${notification.title}\n${notification.message}\n${absoluteUrl(notification.href)}`,
            )
            .join("\n\n"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          result.message || `Resend returned ${response.status}.`,
        );
      for (const notification of enabled)
        updateEmailDelivery({
          notificationId: notification.id,
          status: "sent",
          providerMessageId: result.id || null,
        });
      sent += enabled.length;
    } catch (error) {
      for (const notification of enabled)
        updateEmailDelivery({
          notificationId: notification.id,
          status: "failed",
          failureReason:
            error instanceof Error ? error.message : "Digest delivery failed.",
          incrementRetry: true,
        });
    }
  }
  return { users: byUser.size, notifications: sent };
}
