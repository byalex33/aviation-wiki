import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";

import {
  createNotification,
  getNotificationPreferences,
  listArticleWatcherIds,
  listArticleWatchAlerts,
  listPendingDigestNotifications,
  updateEmailDelivery,
} from "@/lib/notification-storage";
import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notification-types";
import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import type { RevisionRecord } from "@/lib/wiki-types";
import { getProUserIds } from "@/lib/pro-server";

import { queueImmediateEmailDelivery, claimDigestBatch, createDigestBatch, finishDigestBatch, holdLegacyDigestDeliveries, listRecoverableDigestBatchIds } from "@/lib/notification-digest-storage";

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
  const delivery = await queueImmediateEmailDelivery(notification.id, notification.userId);
  if (!delivery || delivery.status === "sent") return;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_EMAIL_FROM;
  if (!apiKey || !from) {
    await updateEmailDelivery({
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
    await updateEmailDelivery({
      notificationId: notification.id,
      status: "sent",
      providerMessageId: result.id || null,
    });
  } catch (error) {
    await updateEmailDelivery({
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
  const preferences = await getNotificationPreferences(input.recipientId);
  const notification = await createNotification({
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

export async function emitCustomNotification(input: {
  recipientId: string;
  actorId: string;
  title: string;
  message: string;
  href: string;
}) {
  const preferences = await getNotificationPreferences(input.recipientId);
  const notification = await createNotification({
    userId: input.recipientId,
    type: "custom",
    title: input.title,
    message: input.message,
    href: input.href,
    dedupeKey: `custom:${input.actorId}:${randomUUID()}`,
  });
  if (
    notification &&
    preferences.frequency === "immediate" &&
    preferences.enabledTypes.custom
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
  const href = `/contribute/${outcome === "approved" ? revision.proposedSlug : revision.articleSlug}?type=${revision.contentType}`;
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
      href: articleHistoryPath(revision.contentType, revision.proposedSlug),
      articleId: revision.articleId,
      revisionId: revision.id,
      dedupeKey: `revision:${revision.id}:supersedes:${previousLiveRevision.id}`,
    });
  }

  const watchers = await listArticleWatcherIds(revision.articleId);
  const alertSettings = await listArticleWatchAlerts(revision.articleId);
  const proWatchers = await getProUserIds(alertSettings.map(setting => setting.user_id)).catch(error => {
    // An identity outage must not unmute articles or interrupt an approved publication.
    console.error("Could not refresh watch alert entitlements; keeping saved preferences", error);
    return new Set(alertSettings.map(setting => setting.user_id));
  });
  const advancedAlerts = new Map(alertSettings.filter(setting => proWatchers.has(setting.user_id)).map(setting => [setting.user_id, setting]));
  for (const watcherId of watchers) {
    if (watcherId === revision.contributorId) continue;
    if (advancedAlerts.get(watcherId)?.edits === false) continue;
    await emitNotification({
      recipientId: watcherId,
      actorId,
      type: "watched_article_edited",
      title: "Watched article updated",
      message: `${revision.title} has a newly approved revision.`,
      href: articlePath(revision.contentType, revision.proposedSlug),
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
    for (const watcherId of watchers) {
      if (watcherId === revision.contributorId) continue;
      const settings = advancedAlerts.get(watcherId);
      if (!(isSource ? settings?.sources : settings?.relationships)) continue;
      await emitNotification({
        recipientId: watcherId, actorId, type: kind,
        title: `Watched article: ${isSource ? "source" : "relationship"} ${accepted ? "added" : "removed"}`,
        message: `${revision.title}: ${count} ${isSource ? "source" : "relationship"}${count === 1 ? "" : "s"} ${accepted ? "added" : "removed"}.`,
        href: articlePath(revision.contentType, revision.proposedSlug), articleId: revision.articleId, revisionId: revision.id,
        dedupeKey: `watch:${watcherId}:revision:${revision.id}:${kind}`,
      });
    }
  }
}

async function digestRecipientEmail(userId: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      verifiedPrimaryEmail(userId),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Recipient verification timed out.")), 10_000); }),
    ]);
  } finally { if (timeout) clearTimeout(timeout); }
}

export async function deliverDailyDigests({ recoveryOnly = false } = {}) {
  await holdLegacyDigestDeliveries();
  const deadline = Date.now() + 45_000;
  let preparationFailures = 0;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_EMAIL_FROM;
  // Persist the complete request before any attempt can reach the provider.
  if (!recoveryOnly && apiKey && from) {
    const pending = await listPendingDigestNotifications();
    const byUser = new Map<string, NotificationRecord[]>();
    for (const notification of pending)
      byUser.set(notification.userId, [...(byUser.get(notification.userId) || []), notification]);
    for (const [userId, notifications] of byUser) {
      if (Date.now() >= deadline) break;
      try {
        const preferences = await getNotificationPreferences(userId);
        if (preferences.frequency !== "daily") continue;
        const enabled = notifications.filter((notification) => preferences.enabledTypes[notification.type]);
        if (!enabled.length) continue;
        // A Clerk outage leaves notifications unclaimed and eligible for the next run.
        const email = await digestRecipientEmail(userId);
        if (!email) continue;
        for (let offset = 0; offset < enabled.length; offset += 100) {
          if (Date.now() >= deadline) break;
          const batch = enabled.slice(offset, offset + 100);
          await createDigestBatch({ userId, notifications: batch, payload: {
            from, to: [email],
            subject: `${batch.length} aviation.wiki update${batch.length === 1 ? "" : "s"}`,
            text: batch.map((notification) => `${notification.title}\n${notification.message}\n${absoluteUrl(notification.href)}`).join("\n\n"),
          } });
        }
      } catch { preparationFailures += 1; }
    }
  }
  let sent = 0;
  const users = new Set<string>();
  for (const id of await listRecoverableDigestBatchIds()) {
    if (Date.now() >= deadline) break;
    // Do not start the provider's retry window while delivery is unconfigured.
    if (!apiKey) break;
    const batch = await claimDigestBatch(id);
    if (!batch) continue;
    users.add(batch.userId);
    try {
      const email = await digestRecipientEmail(batch.userId);
      if (!email || batch.payload.to.length !== 1 || email !== batch.payload.to[0]) {
        await finishDigestBatch({ id, leaseToken: batch.leaseToken, status: "held",
          failureReason: "The verified recipient changed after this batch was prepared. Check the provider before taking further action.",
        });
        continue;
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `aviation-wiki-digest-${batch.id}`,
        },
        body: JSON.stringify(batch.payload),
      });
      const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (response.status === 409 && result.name === "invalid_idempotent_request") {
        await finishDigestBatch({ id, leaseToken: batch.leaseToken, status: "held", failureReason: "The provider reported a different payload for this batch identity. Investigate before retrying." });
        continue;
      }
      if (!response.ok || !result.id)
        throw new Error(result.message || `Resend returned ${response.status} without a delivery confirmation.`);
      if (await finishDigestBatch({ id, leaseToken: batch.leaseToken, status: "sent", providerMessageId: result.id }))
        sent += batch.notificationIds.length;
    } catch (error) {
      await finishDigestBatch({ id, leaseToken: batch.leaseToken, status: "pending",
        failureReason: error instanceof Error ? error.message : "Digest delivery failed.",
      });
    }
  }
  return { users: users.size, notifications: sent, preparationFailures };
}
