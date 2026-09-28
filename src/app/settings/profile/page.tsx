import { Suspense } from "react";
import { ApiKeysPanel } from "@/components/auth/api-keys-panel";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { isProfileSection } from "@/components/auth/profile-sections";

export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };

async function contributionStats(userId: string) {
  try {
    const { getPublicContributorActivity } = process.env.DATABASE_URL
      ? await import("@/lib/wiki-public-db")
      : await import("@/lib/wiki-db");
    const activity = await getPublicContributorActivity(userId);
    return { approvedCount: activity.approvedCount, articleCount: activity.articleCount };
  } catch {
    // The preview is decorative; settings must still load if the database is unavailable.
    return null;
  }
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const requested = (await searchParams).section;
  const initialSection = isProfileSection(requested) ? requested : "profile";
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(initialSection === "profile" ? "/settings/profile" : `/settings/profile?section=${initialSection}`)}`);
  return <ProfileForm initialSection={initialSection} stats={await contributionStats(userId)} apiKeys={
    <Suspense fallback={<div role="status" aria-label="Loading API keys" className="flex flex-col gap-5"><div className="h-36 rounded-2xl bg-muted"/><div className="h-24 rounded-2xl bg-muted"/><span className="sr-only">Loading API keys</span></div>}>
      <ApiKeysPanel userId={userId}/>
    </Suspense>
  }/>;
}
