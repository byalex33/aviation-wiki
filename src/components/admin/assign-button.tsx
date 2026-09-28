"use client";

import { useTransition } from "react";

import { assignRevisionAction } from "@/app/admin/actions";
import { showAdminToast } from "@/components/admin/admin-toaster";

export function AssignButton({ revisionId, title }: { revisionId: string; title: string }) {
  const [pending, startTransition] = useTransition();

  function assign() {
    const formData = new FormData();
    formData.set("revisionId", revisionId);
    formData.set("assigned", "self");
    startTransition(async () => {
      try {
        await assignRevisionAction(formData);
        showAdminToast(`Assigned “${title}” to you`);
      } catch {
        showAdminToast("Could not assign this revision. Try again.", false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={assign}
      disabled={pending}
      className="relative z-10 h-[30px] rounded-lg border border-dashed border-input px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
    >
      {pending ? "Assigning…" : "Assign to me"}
    </button>
  );
}
