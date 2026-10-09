import { redirect } from "next/navigation";

export default function ApiKeysPage() {
  redirect("/settings/profile?section=keys");
}

// Under the strict, nonce-based CSP (src/lib/csp.ts), which needs per-request rendering.
export const dynamic = "force-dynamic";
