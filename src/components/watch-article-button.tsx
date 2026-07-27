"use client";

import { useActionState, useEffect, useRef } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { togglePublicArticleWatchAction } from "@/app/public-actions";
import { buttonVariants } from "@/components/ui/button";
import { initialFormActionState } from "@/lib/form-action-state";

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
    else
      toast.success(
        submittedWatching.current
          ? "Article added to your watchlist."
          : "Article removed from your watchlist.",
      );
  }, [state]);

  return (
    <form
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
        className={`${buttonVariants({ variant: "outline", size: "sm" })} min-h-10 px-3`}
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
        {pending ? "Saving…" : watching ? "Unwatch" : "Watch"}
      </button>
    </form>
  );
}
