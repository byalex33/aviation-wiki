import { unstable_rethrow } from "next/navigation";

import { UserFacingError } from "@/lib/user-facing-error";

export type FormActionState = {
  error: string | null;
};

export const initialFormActionState: FormActionState = { error: null };

export function formActionError(error: unknown): FormActionState {
  unstable_rethrow(error);
  return {
    error:
      error instanceof UserFacingError
        ? error.message
        : "The request could not be completed. Please try again.",
  };
}
