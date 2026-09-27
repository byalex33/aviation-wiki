import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell, AuthSkeleton } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: true } };
export default function SignUpPage() {
  return <AuthShell title="A place for your aviation knowledge." description="Help document the aircraft, airlines, and people that make aviation what it is."><Suspense fallback={<AuthSkeleton/>}><AuthForm mode="sign-up"/></Suspense></AuthShell>;
}
