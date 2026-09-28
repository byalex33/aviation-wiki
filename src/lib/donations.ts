import "server-only";

import Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";

const PURPOSE = "aviation_wiki_pro_v1";

export function donationMode() {
  const mode = /^[rs]k_(live|test)_/.exec(process.env.STRIPE_SECRET_KEY ?? "")?.[1];
  return mode === "live" || mode === "test" ? mode : null;
}

export function donationOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("Donations require an HTTPS app URL (or localhost).");
  }
  return url.origin;
}

export function donationsEnabled() {
  return !!(donationMode() && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripeClient() {
  if (!donationMode()) throw new Error("Stripe is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2 });
}

export function donationAmount(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return null;
  const pounds = Number(value);
  return pounds >= 3 && pounds <= 99999 ? pounds * 100 : null;
}

export function donationCheckoutParams(userId: string, amount: number, origin: string): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    managed_payments: { enabled: false },
    payment_method_types: ["card"],
    client_reference_id: userId,
    metadata: { purpose: PURPOSE, user_id: userId, amount_pence: String(amount), origin },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: amount,
        product_data: { name: "Support aviation.wiki", description: "One-time donation with permanent Pro access." },
      },
    }],
    success_url: `${origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pro?cancelled=1`,
  };
}

// Stripe stores the fulfillment marker. Repeating the Clerk patch is safe even
// if concurrent webhooks arrive, or a request fails between these two writes.
export async function fulfillDonation(sessionId: string, expectedUserId?: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const meta = session.metadata;
  const amount = session.amount_total;
  if (
    meta?.purpose !== PURPOSE || meta.origin !== donationOrigin() ||
    !meta.user_id || meta.user_id !== session.client_reference_id ||
    (expectedUserId !== undefined && meta.user_id !== expectedUserId) ||
    session.mode !== "payment" || session.currency !== "gbp" ||
    session.livemode !== (donationMode() === "live") ||
    !Number.isSafeInteger(amount) || amount! < 300 || amount! > 9999900 ||
    String(amount) !== meta.amount_pence
  ) return null;

  const paid = session.status === "complete" && session.payment_status === "paid";
  // Test money must never grant benefits in the production Clerk instance.
  const canGrantPro = session.livemode || process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") === true;
  if (paid && meta.pro_fulfilled !== "true" && canGrantPro) {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(meta.user_id, { publicMetadata: { pro: true } });
    await stripe.checkout.sessions.update(session.id, { metadata: { pro_fulfilled: "true" } });
  }
  return { session, paid, canGrantPro };
}
