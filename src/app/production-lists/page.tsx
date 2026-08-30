import type { Metadata } from "next";
import { Factory } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ensureAviationDataEnabled } from "@/lib/aviation-data-flags";

export const metadata: Metadata = {
  title: "Aircraft production lists",
  description: "Production lists generated directly from aviation.wiki individual airframe records.",
  alternates: { canonical: "/production-lists" },
};

export default function ProductionListsPage() {
  ensureAviationDataEnabled();
  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-7 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link> / Production lists</nav>
      <header className="max-w-3xl"><Badge variant="secondary" className="text-primary"><Factory /> Graph-backed tables</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Aircraft production lists</h1><p className="mt-4 text-lg leading-8 text-muted-foreground">These tables are queries over individual airframe records. They do not maintain a second copy of production data.</p></header>
      <Link href="/production-lists/a350-1000" className="mt-9 block rounded-2xl border bg-card p-5 shadow-xs transition-colors hover:bg-muted/30"><p className="text-xs font-semibold uppercase tracking-wide text-primary">First validated slice</p><h2 className="mt-2 text-2xl font-semibold">Airbus A350-1000</h2><p className="mt-2 text-sm text-muted-foreground">18 British Airways A350-1041 airframes, including MSN, registration, delivery, status, and reconciliation state.</p></Link>
    </main>
  );
}
