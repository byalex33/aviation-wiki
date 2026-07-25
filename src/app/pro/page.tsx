import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, HeartHandshake, Minus, Plane, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pro",
  description: "Compare free and Pro access, then support aviation.wiki with one donation.",
};

const comparisonGroups = [
  {
    title: "Core access",
    rows: [
      { feature: "Read every aviation.wiki article", free: "Unlimited", pro: "Unlimited" },
      { feature: "Create and edit articles", free: "Included", pro: "Included" },
      { feature: "Community moderation standards", free: "The same", pro: "The same" },
    ],
  },
  {
    title: "Research tools",
    rows: [
      { feature: "Article watchlists", free: "Basic", pro: "Unlimited" },
      { feature: "Watch alerts", free: "Standard", pro: "Advanced" },
      { feature: "Saved collections", free: null, pro: "Included" },
    ],
  },
  {
    title: "Contributor identity",
    rows: [
      { feature: "Moderation queue", free: "Standard", pro: "Priority placement" },
      { feature: "Account badge", free: null, pro: "Supporter badge" },
      { feature: "Profile", free: "Standard", pro: "Customisable" },
    ],
  },
  {
    title: "Developer access",
    rows: [
      { feature: "API limits", free: "Standard", pro: "Higher limits", later: true },
    ],
  },
] as const;

function ComparisonValue({ value, later = false }: { value: string | null; later?: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-2 font-medium">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Check className="size-3.5" /></span>
      {value}
      {later && <Badge variant="outline" className="rounded-full text-[10px]">Later</Badge>}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-muted-foreground"><Minus className="size-4" /> Not included</span>
  );
}

export default function ProPage() {
  return (
    <main className="overflow-hidden">
      <section className="relative isolate overflow-hidden bg-foreground pb-40 pt-20 text-background sm:pb-48 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--primary)_42%,transparent),transparent_38%)]" />
        <Plane className="pointer-events-none absolute -right-10 top-10 size-72 -rotate-12 text-background/[0.025] sm:right-[6%] sm:size-96" aria-hidden="true" />
        <div className="mx-auto max-w-[980px] px-5 text-center sm:px-6">
          <Badge className="rounded-full bg-background/10 px-3 py-1 text-background ring-1 ring-background/15">
            <Sparkles className="size-3.5 text-primary" /> One donation · Permanent access
          </Badge>
          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-bold tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Free knowledge for everyone.<br /><span className="text-primary">More power for supporters.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-background/60 sm:text-xl">
            aviation.wiki will always be free to read and contribute to. Pro adds better personal tools for people who help fund the mission.
          </p>
          <a href="#compare" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-9 h-11 border-background/20 bg-background/5 px-5 text-background hover:bg-background/10 hover:text-background")}>
            Compare Free and Pro
          </a>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-24 grid max-w-[1040px] gap-5 px-5 sm:px-6 lg:grid-cols-2" aria-label="Plans">
        <article className="flex flex-col rounded-[1.75rem] border bg-card p-7 shadow-xl shadow-foreground/5 sm:p-9">
          <div className="flex items-center justify-between gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Plane className="size-6" /></span>
            <Badge variant="outline" className="rounded-full">Everyone</Badge>
          </div>
          <p className="mt-9 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Free</p>
          <h2 className="mt-2 text-4xl font-bold tracking-[-0.045em]">Free forever</h2>
          <p className="mt-4 min-h-14 leading-7 text-muted-foreground">The complete encyclopedia and all the tools needed to make meaningful contributions.</p>
          <ul className="mt-7 space-y-3 text-sm">
            {["Read and search every article", "Create sourced revisions", "Basic watches and standard alerts"].map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}
          </ul>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-9 h-11 w-full")}>Continue with Free</Link>
        </article>

        <article className="pro-card relative flex flex-col rounded-[1.75rem] border border-primary/40 bg-card p-7 shadow-2xl shadow-primary/10 ring-1 ring-primary/15 sm:p-9">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex items-center justify-between gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Crown className="size-6" /></span>
            <Badge className="rounded-full">Best way to support us</Badge>
          </div>
          <p className="mt-9 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pro</p>
          <h2 className="mt-2 text-4xl font-bold tracking-[-0.045em]">One donation</h2>
          <p className="mt-4 min-h-14 leading-7 text-muted-foreground">Permanent supporter access attached to your aviation.wiki account. No subscription.</p>
          <ul className="mt-7 space-y-3 text-sm">
            {["Everything included with Free", "Unlimited watchlists, advanced alerts, and collections", "Priority queue placement and supporter identity"].map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}
          </ul>
          <button disabled className={cn(buttonVariants({ size: "lg" }), "mt-9 h-11 w-full shadow-lg shadow-primary/15")}>Donations opening soon</button>
        </article>
      </section>

      <section id="compare" className="scroll-mt-20 px-5 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1040px]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">Side by side</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">See exactly what changes</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">The encyclopedia stays complete on Free. Pro improves how you follow, organise, and contribute to it.</p>
          </div>

          <div className="mt-12 overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-1/2 px-6 py-5 text-base">Feature</th>
                  <th className="w-1/4 px-6 py-5 text-base">Free</th>
                  <th className="w-1/4 bg-primary/[0.045] px-6 py-5 text-base text-primary"><span className="inline-flex items-center gap-2"><Crown className="size-4" />Pro</span></th>
                </tr>
              </thead>
              {comparisonGroups.map((group) => (
                <tbody key={group.title}>
                  <tr className="border-b bg-muted/45"><th colSpan={3} className="px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{group.title}</th></tr>
                  {group.rows.map((row) => (
                    <tr key={row.feature} className="border-b last:border-b-0">
                      <th scope="row" className="px-6 py-4 font-medium">{row.feature}</th>
                      <td className="px-6 py-4"><ComparisonValue value={row.free} /></td>
                      <td className="bg-primary/[0.045] px-6 py-4"><ComparisonValue value={row.pro} later={"later" in row && row.later} /></td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />Priority placement moves a submission forward in the queue; it never changes sourcing requirements, review standards, or editorial decisions.</p>
        </div>
      </section>

      <section className="border-t bg-muted/35">
        <div className="mx-auto max-w-[900px] px-5 py-20 text-center sm:px-6 sm:py-24">
          <HeartHandshake className="mx-auto size-10 text-primary" />
          <h2 className="mt-5 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Keep the knowledge free. Make your account Pro.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Stripe checkout will be added later. Until then, nothing here collects money or promises an active entitlement.</p>
          <button disabled className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 px-6")}>Pro checkout coming soon</button>
        </div>
      </section>
    </main>
  );
}
