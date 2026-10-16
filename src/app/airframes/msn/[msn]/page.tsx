import { notFound, permanentRedirect } from "next/navigation";

import { findAirframeRecord } from "@/lib/airframe-db";
import { airframeSlug } from "@/lib/airframe-record";

export const dynamic = "force-dynamic";

export default async function AirframeByMsnPage({ params }: { params: Promise<{ msn: string }> }) {
  const record = await findAirframeRecord(airframeSlug((await params).msn));
  if (!record) notFound();
  permanentRedirect(record.href);
}
