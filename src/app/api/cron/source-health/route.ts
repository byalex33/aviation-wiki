import { runSourceHealthAudit } from "@/lib/source-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });

  return Response.json(await runSourceHealthAudit());
}
