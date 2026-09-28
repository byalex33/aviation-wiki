import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { wikiRoles, type WikiRole } from "@/lib/wiki-roles";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  role: WikiRole;
  lastActiveAt: number | null;
  createdAt: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  moderatorNotes: string;
  restriction: string;
  trusted: boolean;
};

export async function listAllClerkUsers() {
  const client = await clerkClient();
  const users = [];
  let offset = 0;
  while (true) {
    const page = await client.users.getUserList({ limit: 500, offset });
    users.push(...page.data);
    offset += page.data.length;
    if (!page.data.length || offset >= page.totalCount) break;
  }
  return users;
}

/**
 * Looks up roles for a small set of users (e.g. the revisions on screen) so
 * names can carry their role treatment. Unknown or failed lookups fall back to
 * the plain contributor treatment rather than breaking the admin page.
 */
export async function getUserRoles(userIds: string[]) {
  const ids = [...new Set(userIds.filter((id) => id && id !== "system"))];
  const roles = new Map<string, WikiRole>();
  if (!ids.length) return roles;
  try {
    const client = await clerkClient();
    for (let start = 0; start < ids.length; start += 100) {
      const page = await client.users.getUserList({
        userId: ids.slice(start, start + 100),
        limit: 100,
      });
      for (const user of page.data) {
        const role = user.publicMetadata.role as WikiRole;
        if (wikiRoles.includes(role)) roles.set(user.id, role);
      }
    }
  } catch (error) {
    console.error("Could not load contributor roles", error);
  }
  return roles;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { getContributorProfiles, getRevisionCountsByContributor } =
    process.env.DATABASE_URL
      ? await import("@/lib/wiki-public-db")
      : await import("@/lib/admin-db");
  const [users, stats, profiles] = await Promise.all([
    listAllClerkUsers(),
    getRevisionCountsByContributor(),
    getContributorProfiles(),
  ]);
  const statMap = new Map(
    stats.map((item) => [String(item.contributor_id), item]),
  );
  const profileMap = new Map(
    profiles.map((item) => [String(item.user_id), item]),
  );
  return users.map((user) => {
    const stat = statMap.get(user.id);
    const profile = profileMap.get(user.id);
    const metadataRole = user.publicMetadata.role;
    const role: WikiRole = [
      "contributor",
      "trusted_contributor",
      "moderator",
      "admin",
    ].includes(String(metadataRole))
      ? (metadataRole as WikiRole)
      : "contributor";
    return {
      id: user.id,
      name: user.username || user.fullName || user.firstName || "Unnamed user",
      email: user.primaryEmailAddress?.emailAddress || "No email",
      imageUrl: user.imageUrl,
      role,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      submittedCount: Number(stat?.submitted_count ?? 0),
      approvedCount: Number(stat?.approved_count ?? 0),
      rejectedCount: Number(stat?.rejected_count ?? 0),
      pendingCount: Number(stat?.pending_count ?? 0),
      moderatorNotes: String(profile?.moderator_notes ?? ""),
      restriction: String(profile?.restriction ?? "none"),
      trusted: Boolean(profile?.trusted) || role === "trusted_contributor",
    };
  });
}
