"use client";

import { useActionState, useEffect } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { togglePublicArticleWatchAction } from "@/app/public-actions";
import { buttonVariants } from "@/components/ui/button";

export function WatchArticleButton({
  articleId,
  returnTo,
  watching,
}: {
  articleId: string;
  returnTo: string;
  watching: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    togglePublicArticleWatchAction,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.status === "success") toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="articleId" value={articleId} />
      <input
        type="hidden"
        name="watching"
        value={watching ? "false" : "true"}
      />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        className={buttonVariants({ variant: "outline", size: "sm" })}
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
