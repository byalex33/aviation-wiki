import type { Metadata } from "next";
import { Flag, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ensureAviationDataEnabled } from "@/lib/aviation-data-flags";

export const metadata: Metadata = {
  title: "Aircraft registration database",
  description: "Browse temporal aircraft registration assignments and the airframes behind them.",
  alternates: { canonical: "/registrations" },
};

export default function RegistrationsPage() {
  ensureAviationDataEnabled();
  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-7 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link> / Registrations</nav>
      <header className="max-w-3xl">
        <Badge variant="secondary" className="text-primary"><Flag /> Temporal registry</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Aircraft registrations</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">A registration can move between aircraft, and an aircraft can carry many registrations. These pages preserve assignments with start and end dates instead of treating a mark as permanent identity.</p>
      </header>
      <form action="/registrations/lookup" className="mt-8 flex max-w-xl gap-2" role="search">
        <label className="relative flex-1"><span className="sr-only">Registration</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input name="registration" placeholder="Try G-XWBA" className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm" /></label>
        <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Look up</button>
      </form>
      <section className="mt-10 rounded-2xl border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Available prefix</p><Link href="/registrations/g" className="article-link mt-2 block text-2xl font-semibold">G — United Kingdom</Link><p className="mt-2 text-sm text-muted-foreground">The first structured slice contains British Airways A350-1000 registrations.</p></section>
    </main>
  );
}
