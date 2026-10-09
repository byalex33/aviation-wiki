"use client";
import Link from "next/link";

import { useActionState, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, Bookmark, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { togglePublicArticleWatchAction } from "@/app/public-actions";
import { buttonVariants } from "@/components/ui/button";
import { trackArticleWatch } from "@/lib/tracwell";
import { initialFormActionState, type FormActionState } from "@/lib/form-action-state";
import { cn } from "@/lib/utils";

type WatchState = FormActionState & { watching?: boolean };

// Article pages are cached for everyone, so the reader's watch state is loaded
// here in the browser rather than rendered into the page.
export function WatchArticleButton({ articleId }: { articleId: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [loadedWatching, setLoadedWatching] = useState<boolean | null>(null);
  const [state, formAction, pending] = useActionState<WatchState, FormData>(
    async (previous: WatchState, formData: FormData): Promise<WatchState> => {
      const next = formData.get("watching") === "true";
      const result = await togglePublicArticleWatchAction(previous, formData);
      return { ...result, watching: result.error ? previous.watching : next };
    },
    initialFormActionState,
  );

  useEffect(() => {
    if (!isSignedIn) return;
    let current = true;
    fetch(`/api/articles/${encodeURIComponent(articleId)}/watch`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { watching?: boolean } | null) => {
        if (current) setLoadedWatching(body?.watching === true);
      })
      .catch(() => {
        if (current) setLoadedWatching(false);
      });
    return () => {
      current = false;
    };
  }, [isSignedIn, articleId]);

  useEffect(() => {
    if (state === initialFormActionState) return;
    if (state.error) toast.error(state.error);
    else if (state.watching !== undefined) {
      trackArticleWatch(state.watching, articleId);
      toast.success(
        state.watching
          ? "Article added to your watchlist."
          : "Article removed from your watchlist.",
      );
    }
  }, [state, articleId]);

  const watching = state.watching ?? loadedWatching;
  if (!isLoaded || !isSignedIn || watching === null) return null;

  return (
    <div className="flex flex-wrap items-center gap-2"><form action={formAction}>
      <input type="hidden" name="articleId" value={articleId} />
      <input
        type="hidden"
        name="watching"
        value={watching ? "false" : "true"}
      />
      <button
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-10 px-3",
          watching && "border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background",
        )}
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : watching ? (
          <BellOff />
        ) : (
          <Bell />
        )}
        {pending ? "Saving…" : watching ? "Watching" : "Watch"}
      </button>
    </form><Link href={`/saved?article=${encodeURIComponent(articleId)}`} className={`${buttonVariants({ variant: "outline", size: "sm" })} min-h-10 px-3`}><Bookmark />Save</Link></div>
  );
}
