export const wikiRoles = ["contributor", "trusted_contributor", "moderator", "admin"] as const;
export type WikiRole = (typeof wikiRoles)[number];

export function isStaffRole(role: WikiRole) {
  return role === "moderator" || role === "admin";
}
