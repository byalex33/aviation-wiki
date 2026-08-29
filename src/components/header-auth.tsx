"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";

import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notification-bell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Client island for the header's auth-dependent controls. Clerk's server
// <Show> component calls auth() (→ headers()), which would force every route to
// render dynamically; resolving the state on the client instead keeps the root
// layout static so article pages can be ISR (issue #5).
export function HeaderAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <>
        <NotificationBell />
        <AccountMenu />
      </>
    );
  }

  return (
    <>
      <SignInButton>
        <button
          className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-3")}
        >
          Log in
        </button>
      </SignInButton>
      <SignUpButton>
        <button className={cn(buttonVariants(), "h-10 px-4")}>Sign up</button>
      </SignUpButton>
    </>
  );
}
