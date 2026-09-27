"use client";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthShell, AuthSkeleton } from "@/components/auth/auth-shell";
import { authDestination } from "@/lib/auth-ui";

function Callback() {
  const params = useSearchParams();
  const destination = authDestination(params.get("redirect_url"));
  const query = `?redirect_url=${encodeURIComponent(destination)}`;
  const signInUrl = `/sign-in${query}`;
  const signUpUrl = `/sign-up${query}`;
  return <><AuthSkeleton/><AuthenticateWithRedirectCallback signInUrl={signInUrl} signUpUrl={signUpUrl} continueSignUpUrl={signUpUrl} firstFactorUrl={signInUrl} secondFactorUrl={signInUrl} resetPasswordUrl={signInUrl} verifyEmailAddressUrl={signUpUrl} signInFallbackRedirectUrl={destination} signUpFallbackRedirectUrl={destination}/><div id="clerk-captcha"/></>;
}
export default function SsoCallbackPage() {
  return <AuthShell title="Completing sign-in." description="Connecting your account to aviation.wiki."><Suspense fallback={<AuthSkeleton/>}><Callback/></Suspense></AuthShell>;
}
