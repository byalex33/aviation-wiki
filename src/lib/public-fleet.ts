import "server-only";

import { buildFleetRecords } from "@/lib/fleet-data";
import { listPublicFleetSourceData } from "@/lib/wiki-public-db";

export async function loadFleetRecords() {
  return buildFleetRecords(await listPublicFleetSourceData());
}
