"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { savedArticlesAction } from "./actions";
import { initialFormActionState } from "@/lib/form-action-state";
import { Button } from "@/components/ui/button";

export function SavedForm({ operation, articleId, collectionId, label, children }: {
  operation: string; articleId?: string; collectionId?: string; label: string; children?: ReactNode;
}) {
  const [state, action, pending] = useActionState(savedArticlesAction, initialFormActionState);
  useEffect(() => {
    if (state !== initialFormActionState && !state.error) toast.success("Saved articles updated.");
  }, [state]);
  return <form action={action} className="flex flex-wrap items-center gap-3">
    <input type="hidden" name="operation" value={operation} />
    {articleId && <input type="hidden" name="articleId" value={articleId} />}
    {collectionId && <input type="hidden" name="collectionId" value={collectionId} />}
    <fieldset disabled={pending} className="flex min-w-0 flex-wrap items-center gap-3">
      {children}
      <Button type="submit" size="sm" variant="outline">{pending ? "Saving…" : label}</Button>
    </fieldset>
    {state.error && <p role="alert" className="w-full text-sm text-destructive">{state.error}</p>}
  </form>;
}
