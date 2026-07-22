import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { WikiRole } from "@/lib/wiki-auth";

export type PublicStaffUser = {
  id: string;
  name: string;
  imageUrl: string;
  role: Extract<WikiRole, "moderator" | "admin">;
};

const publicStaffRoles = ["admin", "moderator"] as const;

function isPublicStaffRole(value: unknown): value is PublicStaffUser["role"] {
  return publicStaffRoles.includes(value as PublicStaffUser["role"]);
}

export async function listPublicStaffUsers(): Promise<PublicStaffUser[]> {
  const client = await clerkClient();
  const staff: PublicStaffUser[] = [];
  let offset = 0;

  while (true) {
    const page = await client.users.getUserList({ limit: 500, offset });

    for (const user of page.data) {
      const role = user.publicMetadata.role;
      if (!isPublicStaffRole(role)) continue;

      staff.push({
        id: user.id,
        name: user.username || user.fullName || user.firstName || "Staff member",
        imageUrl: user.imageUrl,
        role,
      });
    }

    offset += page.data.length;
    if (!page.data.length || offset >= page.totalCount) break;
  }

  return staff.sort((a, b) => {
    const roleDifference = publicStaffRoles.indexOf(a.role) - publicStaffRoles.indexOf(b.role);
    return roleDifference || a.name.localeCompare(b.name);
  });
}
