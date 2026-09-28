"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { isDefaultNameStyle, parseNameStyle } from "@/lib/name-style";
import { hasPro } from "@/lib/pro";
import { enforceRateLimit } from "@/lib/rate-limit";
import { UserFacingError } from "@/lib/user-facing-error";

export type NameStyleActionState = { error: string | null };

/** Saves the caller's Pro name style. The browser cannot write public metadata, so Pro is enforced here. */
export async function saveNameStyleAction(input: unknown): Promise<NameStyleActionState> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "Sign in to change your name style." };
    const user = await currentUser();
    if (!user || !hasPro(user.publicMetadata)) return { error: "Name styles are part of aviation.wiki Pro." };
    const style = parseNameStyle(input);
    if (!style) return { error: "That style isn't available. Refresh the page and try again." };
    await enforceRateLimit({ scope: "name-style", subject: userId, limit: 20, windowMs: 60_000 });

    const client = await clerkClient();
    // Clerk deep-merges metadata; null removes the key so a reset leaves no trace.
    await client.users.updateUserMetadata(userId, { publicMetadata: { nameStyle: isDefaultNameStyle(style) ? null : style } });
    if (user.username) revalidatePath(`/profile/${encodeURIComponent(user.username)}`);
    return { error: null };
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
}
