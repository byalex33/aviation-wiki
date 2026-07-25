import { unstable_rethrow } from "next/navigation";

export type FormActionState = {
  error: string | null;
};

export const initialFormActionState: FormActionState = { error: null };

export function formActionError(error: unknown): FormActionState {
  unstable_rethrow(error);
  return {
    error:
      error instanceof Error
        ? error.message
        : "The request could not be completed. Please try again.",
  };
}
