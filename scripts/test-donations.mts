import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import Stripe from "stripe";

// No .env files or network calls: exercise signed events with in-memory services.
Object.assign(process.env, {
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  CLERK_SECRET_KEY: "sk_test_example",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
});
const require = createRequire(import.meta.url);
function mock(id: string, exports: unknown) {
  const resolved = require.resolve(id);
  const replacement = new Module(resolved);
  replacement.exports = exports;
  require.cache[resolved] = replacement;
}
let grants = 0;
let unavailable = false;
let signedIn: string | null = "user_donor";
let creates = 0;
let limited = false;
const metadata = { purpose: "aviation_wiki_pro_v1", user_id: "user_donor", amount_pence: "1500", origin: "http://localhost:3000" };
let session = {
  id: "cs_test_verified", mode: "payment", currency: "gbp", livemode: false,
  client_reference_id: "user_donor", amount_total: 1500, metadata: { ...metadata },
  status: "complete", payment_status: "paid", created: 1790630000,
} as unknown as Stripe.Checkout.Session;
class TestStripe {
  webhooks = new Stripe("sk_test_example").webhooks;
  checkout = { sessions: {
    retrieve: async () => structuredClone(session),
    update: async (_id: string, patch: { metadata: Record<string, string> }) => {
      Object.assign(session.metadata!, patch.metadata);
    },
    create: async (params: Stripe.Checkout.SessionCreateParams) => {
      creates++;
      assert.equal(params.client_reference_id, "user_donor");
      assert.equal(params.metadata?.amount_pence, "1500");
      return { url: "https://checkout.stripe.com/test" };
    },
  } };
}
mock("stripe", TestStripe);
mock("@clerk/nextjs/server", {
  currentUser: async () => signedIn ? { id: signedIn } : null,
  clerkClient: async () => ({ users: { updateUserMetadata: async (id: string, patch: unknown) => {
    if (unavailable) throw new Error("Temporary outage");
    assert.equal(id, "user_donor");
    assert.deepEqual(patch, { publicMetadata: { pro: true } });
    grants++;
  } } }),
});
class Redirect extends Error {}
mock("next/navigation", {
  redirect: (url: string) => { throw new Redirect(url); },
  unstable_rethrow: (error: unknown) => { if (error instanceof Redirect) throw error; },
});
mock("../src/lib/rate-limit", { enforceRateLimit: async () => { if (limited) throw new Error("Rate limited"); } });
const { donationAmount, donationCheckoutParams, fulfillDonation } = await import("../src/lib/donations");
const { POST } = await import("../src/app/api/stripe/webhook/route");
const { donateAction } = await import("../src/app/pro/actions");
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Network prohibited in tests"); };
try {
  for (const value of [null, "", "2", "3.5", "-3", "3e2", "100000", "NaN", new Blob()]) assert.equal(donationAmount(value), null);
  assert.equal(donationAmount("3"), 300);
  assert.equal(donationAmount("99999"), 9999900);
  const params = donationCheckoutParams("user_donor", 1500, "https://www.aviation.wiki");
  assert.equal(params.mode, "payment");
  assert.deepEqual(params.managed_payments, { enabled: false });
  assert.equal(params.success_url, "https://www.aviation.wiki/pro/success?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(params.line_items?.[0].price_data?.unit_amount, 1500);

  const form = new FormData();
  form.set("amount", "15");
  signedIn = null;
  await assert.rejects(donateAction({ error: null }, form), /sign-in/);
  assert.equal(creates, 0);
  signedIn = "user_donor";
  form.set("amount", "2");
  assert.match((await donateAction({ error: null }, form)).error!, /whole-pound/);
  assert.equal(creates, 0);
  form.set("amount", "15");
  limited = true;
  assert.ok((await donateAction({ error: null }, form)).error);
  assert.equal(creates, 0);
  limited = false;
  await assert.rejects(donateAction({ error: null }, form), /checkout.stripe.com/);
  assert.equal(creates, 1);

  assert.equal(await fulfillDonation("invalid"), null);
  assert.equal(await fulfillDonation(session.id, "other_user"), null);
  const original = structuredClone(session);
  for (const patch of [
    { amount_total: 200 }, { currency: "usd" }, { mode: "subscription" }, { livemode: true },
    { client_reference_id: "other_user" }, { metadata: { ...metadata, purpose: "other" } },
    { metadata: { ...metadata, origin: "https://other.example" } },
    { metadata: { ...metadata, amount_pence: "2000" } },
  ]) {
    session = { ...structuredClone(original), ...patch } as Stripe.Checkout.Session;
    assert.equal(await fulfillDonation(session.id), null);
  }
  session = structuredClone(original);
  session.payment_status = "unpaid";
  assert.equal((await fulfillDonation(session.id))?.paid, false);
  assert.equal(grants, 0);
  session = structuredClone(original);
  process.env.CLERK_SECRET_KEY = "sk_live_example";
  assert.equal((await fulfillDonation(session.id))?.canGrantPro, false);
  assert.equal(grants, 0);
  process.env.CLERK_SECRET_KEY = "sk_test_example";

  async function event(type = "checkout.session.completed", tamper = false, timestamp?: number) {
    const payload = JSON.stringify({ id: "evt_test", type, data: { object: { id: session.id } } });
    const signature = new Stripe("sk_test_example").webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET!, timestamp });
    return POST(new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST", body: tamper ? payload + " " : payload, headers: { "stripe-signature": signature },
    }));
  }
  assert.equal((await event(undefined, true)).status, 400);
  assert.equal((await event(undefined, false, 1)).status, 400);
  assert.equal((await POST(new Request("http://localhost", { method: "POST", body: "{}" }))).status, 400);
  assert.equal((await event("payment_intent.created")).status, 200);
  assert.equal(grants, 0);
  unavailable = true;
  assert.equal((await event()).status, 500);
  assert.equal(session.metadata?.pro_fulfilled, undefined);
  unavailable = false;
  assert.equal((await event("checkout.session.async_payment_succeeded")).status, 200);
  assert.equal(grants, 1);
  assert.equal((await event()).status, 200);
  assert.equal(grants, 1);
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal((await POST(new Request("http://localhost", { method: "POST" }))).status, 503);
  console.log("Donation checks passed: amounts, auth, ownership, signatures, retries, replay and test/live separation.");
} finally {
  globalThis.fetch = originalFetch;
}
