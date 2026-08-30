import "server-only";

import { extractRegistrationRecords } from "@/lib/registration-data";
import { listPublicStructuredSourceData } from "@/lib/wiki-public-db";

export async function loadRegistrationRecords() {
  return extractRegistrationRecords(await listPublicStructuredSourceData());
}
