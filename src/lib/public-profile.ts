import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";

import type { PublicContributorActivity } from "@/lib/public-profile-types";
import { wikiRoles, type WikiRole } from "@/lib/wiki-roles";

export type PublicProfile = PublicContributorActivity & {
  id: string;
  username: string;
  displayName: string;
  imageUrl: string;
  role: WikiRole;
  bio: string | null;
  createdAt: number;
};

function normalizeRole(value: unknown): WikiRole {
  return wikiRoles.includes(value as WikiRole)
    ? (value as WikiRole)
    : "contributor";
}

function publicBio(value: unknown) {
  if (typeof value !== "string") return null;
  const bio = value.trim();
  return bio ? bio.slice(0, 320) : null;
}

export const getPublicProfile = cache(
  async (requestedUsername: string): Promise<PublicProfile | null> => {
    const username = requestedUsername.trim();
    if (!username || username.length > 100) return null;

    const client = await clerkClient();
    const result = await client.users.getUserList({
      username: [username],
      limit: 10,
    });
    const user = result.data.find(
      (candidate) =>
        candidate.username?.toLocaleLowerCase() === username.toLocaleLowerCase(),
    );
    if (!user?.username) return null;

    const { getPublicContributorActivity } = process.env.DATABASE_URL
      ? await import("@/lib/wiki-public-db")
      : await import("@/lib/wiki-db");
    const activity = await getPublicContributorActivity(user.id);

    return {
      id: user.id,
      username: user.username,
      displayName: user.fullName || user.username,
      imageUrl: user.imageUrl,
      role: normalizeRole(user.publicMetadata.role),
      bio: publicBio(user.publicMetadata.bio),
      createdAt: user.createdAt,
      ...activity,
    };
  },
);
