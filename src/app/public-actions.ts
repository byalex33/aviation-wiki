"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import {
  formActionError,
  type FormActionState,
} from "@/lib/form-action-state";
import { setArticleWatch } from "@/lib/notification-storage";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function togglePublicArticleWatchAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    const session = await auth();
    if (!session.isAuthenticated || !session.userId)
      throw new Error("Authentication is required.");
    const articleId = String(formData.get("articleId") || "");
    if (!articleId) throw new Error("Article is required.");
    const watching = formData.get("watching") === "true";
    await enforceRateLimit({ scope: "article-watch", subject: session.userId, limit: 60, windowMs: 60_000 });
    await setArticleWatch(session.userId, articleId, watching);
    // Not the article itself: its page is cached for everyone, and the Watch
    // button keeps its own state.
    revalidatePath("/saved");
    return { error: null };
  } catch (error) {
    return formActionError(error);
  }
}
