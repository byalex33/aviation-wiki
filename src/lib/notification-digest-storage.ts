import "server-only";
import type { DigestBatchResult, NewDigestBatch } from "@/lib/notification-digest";

async function storage() {
  return process.env.DATABASE_URL
    ? import("@/lib/postgres-digest-db")
    : import("@/lib/sqlite-digest-db");
}
export async function createDigestBatch(input: NewDigestBatch, now?: Date) {
  return (await storage()).createDigestBatch(input, now);
}
export async function listRecoverableDigestBatchIds(now?: Date) {
  return (await storage()).listRecoverableDigestBatchIds(now);
}
export async function claimDigestBatch(id: string, now?: Date) {
  return (await storage()).claimDigestBatch(id, now);
}
export async function finishDigestBatch(result: DigestBatchResult, now?: Date) {
  return (await storage()).finishDigestBatch(result, now);
}
export async function holdLegacyDigestDeliveries(now?: Date) {
  return (await storage()).holdLegacyDigestDeliveries(now);
}

export async function queueImmediateEmailDelivery(notificationId: string, userId: string) {
  return (await storage()).queueImmediateEmailDelivery(notificationId, userId);
}
