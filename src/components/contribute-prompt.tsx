"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

// Signed-in copy is resolved in the browser. A server auth() call would read
// the request and stop the page from being cached.
export function ContributePrompt({
  signedInHref = "/contribute",
  signedOutHref = "/contribute",
  signedInLabel,
  signedOutLabel,
  className,
}: {
  signedInHref?: string;
  signedOutHref?: string;
  signedInLabel: string;
  signedOutLabel: string;
  className?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = Boolean(isLoaded && isSignedIn);

  return (
    <Link href={signedIn ? signedInHref : signedOutHref} className={className}>
      {signedIn ? signedInLabel : signedOutLabel}
    </Link>
  );
}
