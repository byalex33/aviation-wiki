import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BellRing, Check, Crown, Minus, Plus, Users, Zap } from "lucide-react";

import { DonationCard } from "./donation-card";
import { donationMode, donationsEnabled } from "@/lib/donations";

export const metadata: Metadata = {
  title: "Pro",
  alternates: { canonical: "/pro" },
  description: "Compare free and Pro access, then support aviation.wiki with one donation.",
};

const highlights = [
  { icon: BellRing, title: "Follow more closely", body: "Unlimited watchlists, advanced alerts and saved collections." },
  { icon: BadgeCheck, title: "Stand out as a supporter", body: "A supporter badge and a customisable profile." },
  { icon: Zap, title: "Get reviewed sooner", body: "Priority placement in the moderation queue. Same standards." },
];

const sameForEveryone = ["Read every article", "Create and edit articles", "The same moderation standards"];

const comparisonGroups = [
  {
    title: "Research tools",
    rows: [
      { feature: "Article watchlists", free: "Unlimited", pro: "Unlimited" },
      { feature: "Watch alerts", free: "Approved edits", pro: "Per-article filters" },
      { feature: "Saved collections", free: null, pro: "Included" },
    ],
  },
  {
    title: "Contributor identity",
    rows: [
      { feature: "Moderation queue", free: "Standard", pro: "Priority placement" },
      { feature: "Account badge", free: null, pro: "Supporter badge" },
      { feature: "Profile", free: "Standard", pro: "Customisable" },
      { feature: "Theme selection", free: "Default", pro: "Light or dark" },
    ],
  },
  {
    title: "Developer access",
    rows: [
      { feature: "Draft API limits", free: "10 per minute", pro: "60 per minute" },
    ],
  },
] as const;

const faqs = [
  { question: "Is this a subscription?", answer: "No. It's a single donation. Pro is attached to your aviation.wiki account permanently, and you'll never be charged again." },
  { question: "Does priority placement mean my edits get approved?", answer: "No. Priority placement only moves your submission forward in the moderation queue. Sourcing requirements, review standards and editorial decisions are exactly the same for everyone." },
  { question: "Will anything be taken away from free accounts?", answer: "No. Reading, searching, creating and editing articles stay free and complete for everyone. Pro only adds personal tools on top." },
  { question: "Does a bigger donation unlock more?", answer: "No. Every amount unlocks the same Pro tools. Donating more simply helps fund the encyclopedia." },
];

export default function ProPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-6">
      <section className="flex flex-col gap-10 pb-14 pt-12 sm:pt-16 lg:flex-row lg:items-start lg:gap-14">
        <div className="min-w-0 lg:flex-[1_1_420px] lg:pt-3">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Crown className="size-3.5" aria-hidden="true" />aviation.wiki Pro
          </p>
          <h1 className="mt-4 text-balance text-[40px] font-bold leading-none tracking-[-0.055em] sm:text-5xl lg:text-[58px]">
            Free for everyone. <span className="text-primary">Better tools for supporters.</span>
          </h1>
          <p className="mt-5 max-w-[480px] text-pretty text-[17px] leading-[1.6] text-muted-foreground">
            aviation.wiki will always be free to read and contribute to. Make one donation and your account gets Pro tools for good. There&apos;s no subscription.
          </p>
          <ul className="mt-7 flex flex-col gap-3.5">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li key={title} className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3.5">
                <span className="grid size-9 place-items-center rounded-[10px] bg-accent text-primary"><Icon className="size-[17px]" aria-hidden="true" /></span>
                <div>
                  <p className="text-[15px] font-semibold">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-normal text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <DonationCard enabled={donationsEnabled()} testMode={donationMode() === "test"} />
      </section>

      <section id="compare" aria-labelledby="compare-heading" className="mt-6 scroll-mt-20">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Free vs Pro</p>
        <h2 id="compare-heading" className="mt-1.5 text-3xl font-bold tracking-[-0.04em]">What Pro changes</h2>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-secondary px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />The same for everyone
          </p>
          <ul className="flex flex-wrap gap-x-[18px] gap-y-1.5">
            {sameForEveryone.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 text-[13px] text-secondary-foreground">
                <Check className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />{item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border bg-card">
          <table className="w-full table-fixed border-collapse text-left text-sm [&>tbody:last-of-type>tr:last-child]:border-b-0">
            <colgroup>
              <col className="w-[41%]" />
              <col className="w-[29.5%]" />
              <col className="w-[29.5%]" />
            </colgroup>
            <thead>
              <tr className="border-b text-[13px] font-semibold">
                <th scope="col" className="px-3 py-3.5 sm:px-5"><span className="sr-only">Feature</span></th>
                <th scope="col" className="px-3 py-3.5 sm:px-5">Free</th>
                <th scope="col" className="bg-primary/5 px-3 py-3.5 text-accent-foreground sm:px-5 dark:text-primary">
                  <span className="inline-flex items-center gap-1.5"><Crown className="size-3.5" aria-hidden="true" />Pro</span>
                </th>
              </tr>
            </thead>
            {comparisonGroups.map((group) => (
              <tbody key={group.title}>
                <tr className="border-b border-border/70">
                  <th scope="rowgroup" className="px-3 pb-1.5 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:px-5">{group.title}</th>
                  <td />
                  <td className="bg-primary/5" />
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.feature} className="border-b border-border/70">
                    <th scope="row" className="px-3 py-3.5 font-medium sm:px-5">{row.feature}</th>
                    <td className="px-3 py-3.5 sm:px-5">
                      {row.free ? (
                        <span className="flex items-center gap-1.5 text-secondary-foreground"><Check className="size-3.5 shrink-0" aria-hidden="true" />{row.free}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Minus className="size-3.5 shrink-0" aria-hidden="true" />Not included</span>
                      )}
                    </td>
                    <td className="bg-primary/5 px-3 py-3.5 font-semibold sm:px-5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />{row.pro}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Already have Pro? Open <Link href="/saved" className="text-primary underline">saved articles and alerts</Link> or <Link href="/settings/profile?section=customise" className="text-primary underline">customise your profile</Link>. API allowances are shared across all your keys.</p>
      </section>

      <section aria-labelledby="faq-heading" className="mt-14 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="min-w-0 lg:flex-[1_1_280px]">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-[-0.035em]">Questions</h2>
          <p className="mt-2 max-w-[320px] text-sm leading-[1.6] text-muted-foreground">
            Anything else? <Link href="/contact" className="text-primary underline underline-offset-[3px]">Contact us</Link>.
          </p>
        </div>
        <div className="min-w-0 border-t border-foreground lg:flex-[2_1_520px]">
          {faqs.map((faq, index) => (
            <details key={faq.question} name="pro-faq" open={index === 0} className="group border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-0.5 py-[18px] text-base font-semibold tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus className="size-4 shrink-0 text-muted-foreground group-open:hidden" aria-hidden="true" />
                <Minus className="hidden size-4 shrink-0 text-muted-foreground group-open:block" aria-hidden="true" />
              </summary>
              <p className="max-w-[620px] px-0.5 pb-[18px] text-sm leading-[1.65] text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
