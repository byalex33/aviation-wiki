export const profileSections = {
  profile: { label: "Public profile", description: "How you appear next to your edits and on your profile page." },
  email: { label: "Email addresses", description: "Where account messages and verification codes go. None of these are shown publicly." },
  security: { label: "Password & security", description: "Keep your account secure and control access on other devices." },
  customise: { label: "Customisation", description: "Give your name an icon, a font and an effect. Some are animated.", pro: true },
  keys: { label: "API keys", description: "Let external tools create article drafts for you. Drafts go through the normal review process." },
  connections: { label: "Connected accounts", description: "Accounts you can use to sign in to aviation.wiki." },
};
export type ProfileSection = keyof typeof profileSections;

export function isProfileSection(value: unknown): value is ProfileSection {
  return typeof value === "string" && Object.hasOwn(profileSections, value);
}
