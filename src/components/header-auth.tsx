"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notification-bell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The header's auth-dependent controls, resolved in the browser. Clerk's server
// <Show> calls auth(), which reads the request and would force every page to
// render dynamically; keeping it client-side lets public pages be cached.
export function HeaderAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn)
    return (
      <>
        <NotificationBell />
        <AccountMenu />
      </>
    );

  return (
    <>
      <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-3")}>
        Log in
      </Link>
      <Link href="/sign-up" className={cn(buttonVariants(), "h-10 px-4")}>
        Sign up
      </Link>
    </>
  );
}
