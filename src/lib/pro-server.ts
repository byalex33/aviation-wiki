import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { hasPro } from "@/lib/pro";

export async function getProUserIds(userIds: string[]) {
  const ids = [...new Set(userIds.filter(id => id && id !== "system"))];
  const pro = new Set<string>();
  if (!ids.length) return pro;
  const client = await clerkClient();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const page = await client.users.getUserList({ userId: ids.slice(offset, offset + 100), limit: 100 });
    for (const user of page.data) if (hasPro(user.publicMetadata)) pro.add(user.id);
  }
  return pro;
}

export type ApiKeyOwner =
  | { status: "active"; pro: boolean }
  | { status: "locked" }
  | { status: "closed" };

/** A deleted or banned Clerk account is closed; a locked one is only temporarily unavailable. */
export async function getApiKeyOwner(userId: string): Promise<ApiKeyOwner> {
  const client = await clerkClient();
  const user = (await client.users.getUserList({ userId: [userId], limit: 1 })).data[0];
  if (!user || user.banned) return { status: "closed" };
  if (user.locked) return { status: "locked" };
  return { status: "active", pro: hasPro(user.publicMetadata) };
}

/** Preserve chronological order within each tier. Resolve every candidate before limiting the queue. */
export async function prioritizeReviewQueue<T>(items: T[], contributorId: (item: T) => string) {
  // ponytail: loads the open queue; persist entitlements beside revisions if queue size makes this expensive.
  const pro = await getProUserIds(items.map(contributorId));
  return items.map(item => ({ ...item, pro: pro.has(contributorId(item)) }))
    .sort((a, b) => Number(b.pro) - Number(a.pro));
}
