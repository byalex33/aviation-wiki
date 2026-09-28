import { Suspense } from "react";
import { ApiKeysPanel } from "@/components/auth/api-keys-panel";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";

export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const initialSection = (await searchParams).section === "keys" ? "keys" : "profile";
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(initialSection === "keys" ? "/settings/profile?section=keys" : "/settings/profile")}`);
  return <ProfileForm initialSection={initialSection} apiKeys={
    <Suspense fallback={<div role="status" aria-label="Loading API keys" className="space-y-4 py-8"><div className="h-32 bg-muted"/><div className="h-20 bg-muted"/><span className="sr-only">Loading API keys</span></div>}>
      <ApiKeysPanel userId={userId}/>
    </Suspense>
  }/>;
}
