import "server-only";

import { randomUUID } from "node:crypto";
import { row, rows } from "@/lib/postgres";
import { notificationTypes, type EmailFrequency, type NotificationPreferences, type NotificationRecord, type NotificationType } from "@/lib/notification-types";
import type * as Local from "@/lib/notification-db";

type NotificationRow = {
  id: string; user_id: string; type: NotificationType; title: string; message: string;
  href: string; article_id: string | null; revision_id: string | null;
  read_at: Date | null; created_at: Date;
};
function mapNotification(value: NotificationRow): NotificationRecord {
  return { id: value.id, userId: value.user_id, type: value.type, title: value.title,
    message: value.message, href: value.href, articleId: value.article_id, revisionId: value.revision_id,
    readAt: value.read_at?.toISOString() ?? null, createdAt: value.created_at.toISOString() };
}
export async function createNotification(input: Parameters<typeof Local.createNotification>[0]) {
  const value = await row<NotificationRow>(`INSERT INTO notifications
    (id,user_id,type,title,message,href,article_id,revision_id,dedupe_key,created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT(dedupe_key) DO NOTHING RETURNING *`,
    [randomUUID(), input.userId, input.type, input.title.slice(0,160), input.message.slice(0,1000), input.href,
      input.articleId ?? null, input.revisionId ?? null, input.dedupeKey]);
  return value ? mapNotification(value) : null;
}
export async function getNotificationForUser(id: string, userId: string) {
  const value = await row<NotificationRow>("SELECT * FROM notifications WHERE id=$1 AND user_id=$2", [id,userId]);
  return value ? mapNotification(value) : null;
}
export async function getNotificationById(id: string) {
  const value = await row<NotificationRow>("SELECT * FROM notifications WHERE id=$1", [id]);
  return value ? mapNotification(value) : null;
}
export async function listNotifications(userId: string, page = 1, pageSize = 20) {
  const safePage = Number.isFinite(page) ? Math.max(1,Math.floor(page)) : 1;
  const safeSize = Number.isFinite(pageSize) ? Math.min(50,Math.max(1,Math.floor(pageSize))) : 20;
  const [count, values] = await Promise.all([
    row<{count: string}>("SELECT COUNT(*) count FROM notifications WHERE user_id=$1", [userId]),
    rows<NotificationRow>("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3", [userId,safeSize,(safePage-1)*safeSize]),
  ]);
  const total = Number(count?.count ?? 0);
  return { items: values.map(mapNotification), total, page: safePage, pages: Math.max(1,Math.ceil(total/safeSize)) };
}
export async function getUnreadCount(userId: string) {
  return Number((await row<{count: string}>("SELECT COUNT(*) count FROM notifications WHERE user_id=$1 AND read_at IS NULL", [userId]))?.count ?? 0);
}
export async function markNotificationRead(userId: string, id: string) {
  return (await rows("UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING id", [id,userId])).length;
}
export async function markAllNotificationsRead(userId: string) {
  return (await rows("UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL RETURNING id", [userId])).length;
}
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const value = await row<{email_frequency: EmailFrequency; enabled_types_json: Record<string,boolean>}>("SELECT * FROM notification_preferences WHERE user_id=$1", [userId]);
  return { frequency: value?.email_frequency ?? "in_app", enabledTypes: Object.fromEntries(notificationTypes.map(type => [type,value?.enabled_types_json[type] !== false])) as Record<NotificationType,boolean> };
}
export async function saveNotificationPreferences(userId: string, frequency: EmailFrequency, enabledTypes: Partial<Record<NotificationType,boolean>>) {
  const normalized = Object.fromEntries(notificationTypes.map(type => [type,enabledTypes[type] === true]));
  await rows(`INSERT INTO notification_preferences (user_id,email_frequency,enabled_types_json,updated_at)
    VALUES ($1,$2,$3::jsonb,NOW()) ON CONFLICT(user_id) DO UPDATE SET
    email_frequency=excluded.email_frequency,enabled_types_json=excluded.enabled_types_json,updated_at=excluded.updated_at`, [userId,frequency,normalized]);
}
export async function setArticleWatch(userId: string, articleId: string, watching: boolean) {
  if (watching) await rows("INSERT INTO article_watches (user_id,article_id,created_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING", [userId,articleId]);
  else await rows("DELETE FROM article_watches WHERE user_id=$1 AND article_id=$2", [userId,articleId]);
}
export async function isWatchingArticle(userId: string, articleId: string) {
  return Boolean(await row("SELECT 1 FROM article_watches WHERE user_id=$1 AND article_id=$2", [userId,articleId]));
}
export async function listArticleWatcherIds(articleId: string) {
  return (await rows<{user_id: string}>("SELECT user_id FROM article_watches WHERE article_id=$1", [articleId])).map(value => value.user_id);
}
export async function listArticleWatchAlerts(articleId: string) {
  return rows<{user_id: string; edits: boolean; sources: boolean; relationships: boolean}>(
    "SELECT user_id,edits,sources,relationships FROM article_watch_alerts WHERE article_id=$1", [articleId]);
}
export async function queueEmailDelivery(notificationId: string, userId: string) {
  await rows(`INSERT INTO notification_email_deliveries (id,notification_id,user_id,status,created_at,updated_at)
    VALUES ($1,$2,$3,'pending',NOW(),NOW()) ON CONFLICT(notification_id) DO NOTHING`, [randomUUID(),notificationId,userId]);
  return row("SELECT * FROM notification_email_deliveries WHERE notification_id=$1", [notificationId]);
}
export async function updateEmailDelivery(input: Parameters<typeof Local.updateEmailDelivery>[0]) {
  await rows(`UPDATE notification_email_deliveries SET status=$1,provider_message_id=$2,failure_reason=$3,
    retry_count=retry_count+$4,updated_at=NOW() WHERE notification_id=$5`,
    [input.status,input.providerMessageId ?? null,input.failureReason?.slice(0,500) ?? null,input.incrementRetry ? 1 : 0,input.notificationId]);
}
export async function listFailedEmailDeliveries(limit = 100) {
  return rows(`SELECT d.id,d.notification_id,d.status,d.provider_message_id,d.failure_reason,d.retry_count,d.created_at,d.updated_at,
    n.type,n.article_id,n.revision_id FROM notification_email_deliveries d JOIN notifications n ON n.id=d.notification_id
    WHERE d.status IN ('failed','held') ORDER BY d.updated_at DESC LIMIT $1`, [Math.min(500,Math.max(1,limit))]);
}
export async function listPendingDigestNotifications() {
  return (await rows<NotificationRow>(`SELECT n.* FROM notifications n JOIN notification_preferences p ON p.user_id=n.user_id
    LEFT JOIN notification_email_deliveries d ON d.notification_id=n.id
    WHERE p.email_frequency='daily' AND d.id IS NULL AND n.created_at >= NOW() - INTERVAL '2 days'
    ORDER BY n.user_id,n.created_at,n.id`)).map(mapNotification);
}
