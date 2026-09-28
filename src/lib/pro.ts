/**
 * Pro is granted by an admin (or, later, checkout) setting `publicMetadata.pro`.
 * Moderators and administrators get the same perks so they can test and support them.
 */
export function hasPro(publicMetadata: Record<string, unknown> | null | undefined) {
  if (!publicMetadata) return false;
  return publicMetadata.pro === true || publicMetadata.role === "moderator" || publicMetadata.role === "admin";
}
