import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";

export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };
export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Fsettings%2Fprofile");
  return <ProfileForm/>;
}
