import { isAuthorizedCron } from "@/lib/cron-auth";
import { deliverDailyDigests } from "@/lib/notification-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await deliverDailyDigests());
}

export const POST = GET;
