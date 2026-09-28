"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { donationAmount, donationCheckoutParams, donationOrigin, donationsEnabled, stripeClient } from "@/lib/donations";
import { formActionError, type FormActionState } from "@/lib/form-action-state";
import { enforceRateLimit } from "@/lib/rate-limit";
import { UserFacingError } from "@/lib/user-facing-error";

export async function donateAction(_state: FormActionState, form: FormData): Promise<FormActionState> {
  try {
    const user = await currentUser();
    if (!user) redirect("/sign-in?redirect_url=%2Fpro");
    if (!donationsEnabled()) throw new UserFacingError("Donations are not available yet.");
    const amount = donationAmount(form.get("amount"));
    if (amount === null) throw new UserFacingError("Choose a whole-pound donation between £3 and £99,999.");
    await enforceRateLimit({ scope: "donation-checkout", subject: user.id, limit: 5, windowMs: 60_000 });
    const session = await stripeClient().checkout.sessions.create(donationCheckoutParams(user.id, amount, donationOrigin()));
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    redirect(session.url);
  } catch (error) {
    const state = formActionError(error);
    if (!(error instanceof UserFacingError)) {
      console.error("Donation checkout failed", error instanceof Error ? { name: error.name, message: error.message } : "Unknown error");
    }
    return state;
  }
}
