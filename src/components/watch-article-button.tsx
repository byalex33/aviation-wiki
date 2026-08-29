"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { togglePublicArticleWatchAction } from "@/app/public-actions";
import { buttonVariants } from "@/components/ui/button";
import { initialFormActionState } from "@/lib/form-action-state";

// Client island: the article shell around it is static/ISR (issue #5), so this
// resolves its own per-user state — whether the reader is signed in
// (Clerk `useAuth`) and whether they already watch this article (a small fetch
// to /api/articles/[articleId]/watch). Renders nothing for signed-out readers.
export function WatchArticleButton({
  articleId,
  returnTo,
}: {
  articleId: string;
  returnTo: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [watching, setWatching] = useState<boolean | null>(null);
  const submittedWatching = useRef<boolean | null>(null);
  const [state, formAction, pending] = useActionState(
    togglePublicArticleWatchAction,
    initialFormActionState,
  );

  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    fetch(`/api/articles/${articleId}/watch`)
      .then((response) => (response.ok ? response.json() : { watching: false }))
      .then((data: { watching?: boolean }) => {
        if (active) setWatching(Boolean(data.watching));
      })
      .catch(() => {
        if (active) setWatching(false);
      });
    return () => {
      active = false;
    };
  }, [articleId, isSignedIn]);

  useEffect(() => {
    if (state === initialFormActionState) return;
    if (state.error) toast.error(state.error);
    else {
      setWatching(submittedWatching.current);
      toast.success(
        submittedWatching.current
          ? "Article added to your watchlist."
          : "Article removed from your watchlist.",
      );
    }
  }, [state]);

  if (!isLoaded || !isSignedIn || watching === null) return null;

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
