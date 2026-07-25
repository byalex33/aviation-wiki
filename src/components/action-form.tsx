"use client";

import { useActionState, type ComponentProps, type ReactNode } from "react";

import {
  initialFormActionState,
  type FormActionState,
} from "@/lib/form-action-state";

type ActionFormProps = Omit<ComponentProps<"form">, "action"> & {
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  children: ReactNode;
};

export function ActionForm({
  action,
  children,
  ...props
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialFormActionState,
  );

  return (
    <form action={formAction} aria-busy={pending} {...props}>
      {children}
      {state.error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
