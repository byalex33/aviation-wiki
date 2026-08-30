import "server-only";

import { buildProductionListRecords } from "@/lib/production-list-data";
import { listPublicFleetSourceData } from "@/lib/wiki-public-db";

export async function loadProductionListRecords() {
  const { articles } = await listPublicFleetSourceData();
  return buildProductionListRecords(articles);
}
