import type { NotificationRecord } from "@/lib/notification-types";

export const DIGEST_LEASE_MS = 5 * 60_000;
// Resend retains idempotency keys for 24 hours. Leave room for request latency.
export const DIGEST_RETRY_WINDOW_MS = 23 * 60 * 60_000;
export const DIGEST_HOLD_REASON = "Delivery outcome is uncertain and the safe retry window has expired. Check the provider before taking further action.";
export const DIGEST_PREFERENCE_HOLD_REASON = "Email preferences changed after this digest was prepared. The saved batch is held and will not be sent.";
export const LEGACY_DIGEST_HOLD_REASON = "An earlier digest attempt has no saved batch identity. Check the provider before taking further action.";

export type DigestPayload = { from: string; to: string[]; subject: string; text: string };
export type NewDigestBatch = {
  userId: string;
  notifications: NotificationRecord[];
  payload: DigestPayload;
};
export type ClaimedDigestBatch = {
  id: string;
  userId: string;
  notificationIds: string[];
  payload: DigestPayload;
  leaseToken: string;
};
export type DigestBatchResult = {
  id: string;
  leaseToken: string;
  status: "sent" | "pending" | "held";
  providerMessageId?: string;
  failureReason?: string;
};
