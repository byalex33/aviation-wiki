"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { formActionError, type FormActionState } from "@/lib/form-action-state";
import { hasPro } from "@/lib/pro";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createCollection, deleteCollection, saveCollectionArticle, saveWatchAlerts } from "@/lib/saved-articles";
import { setArticleWatch } from "@/lib/notification-storage";
import { UserFacingError } from "@/lib/user-facing-error";

export async function savedArticlesAction(_state: FormActionState, form: FormData): Promise<FormActionState> {
  try {
    const user = await currentUser();
    if (!user) throw new UserFacingError("Sign in to use your saved articles.");
    await enforceRateLimit({ scope: "saved-articles", subject: user.id, limit: 60, windowMs: 60_000 });
    const operation = String(form.get("operation") || "");
    const articleId = String(form.get("articleId") || "");
    const collectionId = String(form.get("collectionId") || "");
    if (operation === "unwatch") {
      await setArticleWatch(user.id, articleId, false);
    } else {
      if (!hasPro(user.publicMetadata)) throw new UserFacingError("Collections and per-article alerts require aviation.wiki Pro.");
      switch (operation) {
        case "create": await createCollection(user.id, String(form.get("name") || "")); break;
        case "delete": await deleteCollection(user.id, collectionId); break;
        case "add": await saveCollectionArticle(user.id, collectionId, articleId, true); break;
        case "remove": await saveCollectionArticle(user.id, collectionId, articleId, false); break;
        case "alerts": await saveWatchAlerts(user.id, articleId, form.get("edits") === "on", form.get("sources") === "on", form.get("relationships") === "on"); break;
        default: throw new UserFacingError("Unknown saved article action.");
      }
    }
    revalidatePath("/saved");
    return { error: null };
  } catch (error) { return formActionError(error); }
}
