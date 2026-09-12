"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Star, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Adapted from OpenSourceUI SystemAlertBanner (MIT); see THIRD_PARTY_NOTICES.md.
export function OpenSourceAlert() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const clerk = useClerk();
  const claim = useRef<{ userId: string; result: Promise<boolean> } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !clerk.user) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome") !== "signup") return;
    let active = true;

    if (claim.current?.userId !== userId) {
      const user = clerk.user;
      claim.current = {
        userId,
        result: user.unsafeMetadata.openSourceWelcomeShown
          ? Promise.resolve(false)
          : user.updateMetadata({ unsafeMetadata: { openSourceWelcomeShown: true } }).then(() => true),
      };
    }

    const dismiss = () => { toast.dismiss("open-source-welcome"); };
    void claim.current.result.then((show) => {
      if (!active) return;
      // Consume the signup marker without changing the user's route or hash.
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("welcome");
      window.history.replaceState(window.history.state, "", currentUrl);
      if (!show) return;
    toast.custom(() => (
      <div className="relative w-full overflow-hidden rounded-[1.25rem] border bg-card/95 text-card-foreground shadow-[0_8px_32px_-4px_rgba(0,0,0,0.10)] backdrop-blur-xl">
        <button type="button" onClick={dismiss} aria-label="Dismiss open-source welcome" className="absolute right-1 top-1 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <X className="size-4" aria-hidden="true" />
        </button>
        <div className="grid grid-cols-[2.375rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-4 pl-3.5 pr-12">
          <span className="row-span-3 mt-0.5 grid size-9.5 place-items-center rounded-[0.625rem] bg-amber-400 text-amber-950 shadow-sm">
            <Star className="size-[18px]" aria-hidden="true" />
          </span>
          <p className="text-[13px] font-semibold">Welcome to aviation.wiki</p>
          <p className="col-start-2 text-[13px] leading-relaxed text-muted-foreground">
            We’re open source! Explore the code, contribute, and give us a star on GitHub.
          </p>
          <a href="https://github.com/byalex33/aviation-wiki" target="_blank" rel="noreferrer" className="col-start-2 mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Star us on GitHub <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    ), { id: "open-source-welcome", duration: Infinity, className: "w-full", onDismiss: dismiss });

    }).catch(() => {
      if (active) {
        claim.current = null;
        console.warn("Could not save the signup welcome preference.");
      }
    });

    return () => { active = false; dismiss(); };
  }, [isLoaded, isSignedIn, userId, clerk]);

  return null;
}
