"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { ensureSchema, sql } from "@/lib/postgres";

export async function togglePublicArticleWatchAction(formData: FormData) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) throw new Error("Authentication is required.");
  const articleId = String(formData.get("articleId") || "");
  if (!articleId) throw new Error("Article is required.");
  await ensureSchema();
  if (formData.get("watching") === "true") {
    await sql`INSERT INTO article_watches (user_id,article_id,created_at) VALUES (${session.userId},${articleId},${new Date()}) ON CONFLICT DO NOTHING`;
  } else {
    await sql`DELETE FROM article_watches WHERE user_id=${session.userId} AND article_id=${articleId}`;
  }
  revalidatePath(String(formData.get("returnTo") || "/notifications"));
}
