import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

export const wikiRoles = ["contributor", "trusted_contributor", "moderator", "admin"] as const;
export type WikiRole = (typeof wikiRoles)[number];

function normalizeRole(value: unknown): WikiRole {
  return wikiRoles.includes(value as WikiRole) ? value as WikiRole : "contributor";
}

export async function getStaffUser() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) return null;
  const user = await currentUser();
  const role = normalizeRole(user?.publicMetadata.role);
  if (role !== "moderator" && role !== "admin") return null;
  return { userId: session.userId, name: user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Staff", role };
}

export async function requireStaff() {
  const staff = await getStaffUser();
  if (!staff) throw new Error("Moderator access is required.");
  return staff;
}

export async function requireAdmin() {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new Error("Administrator access is required.");
  return staff;
}

export async function requireContributor() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) throw new Error("You must be signed in to contribute.");
  const user = await currentUser();
  return {
    userId: session.userId,
    name: user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Contributor",
    role: normalizeRole(user?.publicMetadata.role),
  };
}

export async function isModerator() {
  return Boolean(await getStaffUser());
}

export async function requireModerator() {
  return requireStaff();
}
