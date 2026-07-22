import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import {
  getContributorProfiles,
  getRevisionCountsByContributor,
} from "@/lib/admin-db";
import type { WikiRole } from "@/lib/wiki-auth";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  role: WikiRole;
  lastActiveAt: number | null;
  createdAt: number;
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

export async function listAdminUsers(): Promise<AdminUser[]> {
  const [users, stats, profiles] = await Promise.all([
    listAllClerkUsers(),
    Promise.resolve(getRevisionCountsByContributor()),
    Promise.resolve(getContributorProfiles()),
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
      approvedCount: Number(stat?.approved_count ?? 0),
      rejectedCount: Number(stat?.rejected_count ?? 0),
      pendingCount: Number(stat?.pending_count ?? 0),
      moderatorNotes: String(profile?.moderator_notes ?? ""),
      restriction: String(profile?.restriction ?? "none"),
      trusted: Boolean(profile?.trusted) || role === "trusted_contributor",
    };
  });
}
