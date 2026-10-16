import { permanentRedirect } from "next/navigation";

import { F15_LEGACY_SLUG } from "@/lib/article-path-aliases";

// The aircraft route sends this slug on to the manufacturer-model URL once that
// article exists. Keeping this hop on the legacy slug avoids a 404 before the
// database rename.
export default function LegacyF15Page() {
  permanentRedirect(`/aircraft/${F15_LEGACY_SLUG}`);
}
