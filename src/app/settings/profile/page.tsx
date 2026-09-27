import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ProfileForm } from "@/components/auth/profile-form";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };
export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Fsettings%2Fprofile");
  return <AuthShell title="Your account." description="Choose how you appear to other contributors and manage your sign-in details."><ProfileForm/></AuthShell>;
}
