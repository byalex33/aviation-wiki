"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/rate-limit";

import {
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
  setArticleWatch,
} from "@/lib/notification-storage";
import {
  notificationTypes,
  type EmailFrequency,
  type NotificationType,
} from "@/lib/notification-types";

async function requireUserId() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId)
    throw new Error("Authentication is required.");
  await enforceRateLimit({ scope: "notification-settings", subject: session.userId, limit: 60, windowMs: 60_000 });
  return session.userId;
}

export async function markNotificationReadAction(formData: FormData) {
  const userId = await requireUserId();
  await markNotificationRead(userId, String(formData.get("notificationId") || ""));
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();
  await markAllNotificationsRead(userId);
  revalidatePath("/notifications");
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const userId = await requireUserId();
  const frequency = String(formData.get("frequency")) as EmailFrequency;
  if (!["immediate", "daily", "in_app"].includes(frequency))
    throw new Error("Invalid email frequency.");
  const enabledTypes = Object.fromEntries(
    notificationTypes.map((type) => [
      type,
      formData.get(`type:${type}`) === "on",
    ]),
  ) as Record<NotificationType, boolean>;
  await saveNotificationPreferences(userId, frequency, enabledTypes);
  revalidatePath("/notifications");
}

export async function toggleArticleWatchAction(formData: FormData) {
  const userId = await requireUserId();
  const articleId = String(formData.get("articleId") || "");
  if (!articleId) throw new Error("Article is required.");
  await setArticleWatch(userId, articleId, formData.get("watching") === "true");
  revalidatePath(String(formData.get("returnTo") || "/notifications"));
}
