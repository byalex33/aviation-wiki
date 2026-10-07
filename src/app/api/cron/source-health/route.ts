import { isAuthorizedCron } from "@/lib/cron-auth";
import { pruneExpiredRateLimits } from "@/lib/rate-limit";
import { runSourceHealthAudit } from "@/lib/source-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });

  const [audit, prunedRateLimits] = await Promise.all([
    runSourceHealthAudit(),
    pruneExpiredRateLimits(),
  ]);
  return Response.json({ ...audit, prunedRateLimits });
}
