"use client";
import Link from "next/link";

import { useActionState, useEffect, useRef } from "react";
import { Bell, BellOff, Bookmark, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { togglePublicArticleWatchAction } from "@/app/public-actions";
import { buttonVariants } from "@/components/ui/button";
import { trackArticleWatch } from "@/lib/tracwell";
import { initialFormActionState } from "@/lib/form-action-state";
import { cn } from "@/lib/utils";

export function WatchArticleButton({
  articleId,
  returnTo,
  watching,
}: {
  articleId: string;
  returnTo: string;
  watching: boolean;
}) {
  const submittedWatching = useRef<boolean | null>(null);
  const [state, formAction, pending] = useActionState(
    togglePublicArticleWatchAction,
    initialFormActionState,
  );

  useEffect(() => {
    if (state === initialFormActionState) return;
    if (state.error) toast.error(state.error);
    else {
      if (submittedWatching.current !== null) {
        trackArticleWatch(submittedWatching.current, articleId);
      }
      toast.success(
        submittedWatching.current
          ? "Article added to your watchlist."
          : "Article removed from your watchlist.",
      );
    }
    submittedWatching.current = null;
  }, [state, articleId]);

  return (
    <div className="flex flex-wrap items-center gap-2"><form
      action={formAction}
      onSubmit={() => {
        submittedWatching.current = !watching;
      }}
    >
      <input type="hidden" name="articleId" value={articleId} />
      <input
        type="hidden"
        name="watching"
        value={watching ? "false" : "true"}
      />
      <input type="hidden" name="returnTo" value={returnTo} />
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
