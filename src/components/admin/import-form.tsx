"use client";

import { useActionState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { importAviationDataAction } from "@/app/admin/import/actions";
import { buttonVariants } from "@/components/ui/button";

export function ImportForm({ children }: { children: ReactNode }) {
  const [state, formAction, pending] = useActionState(importAviationDataAction, null);

  return (
    <form action={formAction} className="mt-7 space-y-6">
      {children}
      {state?.message && (
        <p role="alert" aria-live="polite" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex justify-end">
        <button className={buttonVariants({ size: "lg" })} disabled={pending} type="submit">
          {pending && <LoaderCircle className="animate-spin" />}
          {pending ? "Creating private draft…" : "Create private draft from selected data"}
        </button>
      </div>
    </form>
  );
}
