export const wikiRoles = ["contributor", "trusted_contributor", "moderator", "admin"] as const;
export type WikiRole = (typeof wikiRoles)[number];

export const wikiRoleDetails: Record<WikiRole, { label: string; description: string }> = {
  contributor: {
    label: "Contributor",
    description: "Drafts articles and suggests edits. Every change is reviewed by a moderator before it goes live.",
  },
  trusted_contributor: {
    label: "Trusted contributor",
    description: "Has a consistent record of well-sourced, approved edits. Changes are still reviewed, but carry a trusted track record.",
  },
  moderator: {
    label: "Moderator",
    description: "Reviews submitted revisions, approves or requests changes, and keeps the encyclopedia accurate.",
  },
  admin: {
    label: "Administrator",
    description: "Manages the wiki: sources, data imports, contributor roles and the audit log.",
  },
};

export function isStaffRole(role: WikiRole) {
  return role === "moderator" || role === "admin";
}
