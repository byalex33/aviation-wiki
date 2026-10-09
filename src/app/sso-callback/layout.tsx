// The page is a client component, so the route config lives here. Under the
// strict, nonce-based CSP (src/lib/csp.ts), which needs per-request rendering.
export const dynamic = "force-dynamic";

export default function SsoCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
