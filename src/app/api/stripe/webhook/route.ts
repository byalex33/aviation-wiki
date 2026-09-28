import type Stripe from "stripe";
import { fulfillDonation, stripeClient } from "@/lib/donations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook is not configured", { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    try {
      await fulfillDonation(event.data.object.id);
    } catch {
      // A non-2xx response asks Stripe to retry temporary Stripe/Clerk failures.
      console.error("Stripe donation fulfillment failed", { eventId: event.id });
      return new Response("Fulfillment temporarily unavailable", { status: 500 });
    }
  }
  return Response.json({ received: true });
}
