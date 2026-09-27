import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell, AuthSkeleton } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };
export default function SignInPage() {
  return <AuthShell title="Welcome back." description="Pick up where you left off. Your research, contributions, and saved work are here."><Suspense fallback={<AuthSkeleton/>}><AuthForm mode="sign-in"/></Suspense></AuthShell>;
}
