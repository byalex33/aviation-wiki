import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, BellRing, Crown, FolderHeart, Loader2, Mail } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

const MINIMUM_DONATION_GBP = 3;

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const nextSteps = [
  { icon: BellRing, title: "Set up a watchlist", body: "Follow aircraft, operators and airports with advanced alerts.", href: "/saved#watchlist-title" },
  { icon: BadgeCheck, title: "Customise your profile", body: "Your supporter badge is already showing on your profile.", href: "/settings/profile?section=customise" },
  { icon: FolderHeart, title: "Start a collection", body: "Save articles into collections you can come back to.", href: "/saved#collections-title" },
] as const;

type ProSuccessPageProps = {
  searchParams: Promise<{ status?: string; amount?: string; ref?: string }>;
};

export default async function ProSuccessPage({ searchParams }: ProSuccessPageProps) {
  const params = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=%2Fpro%2Fsuccess");

  const processing = params.status === "processing";
  const parsedAmount = Number.parseInt(params.amount ?? "", 10);
  const amount = Number.isFinite(parsedAmount) && parsedAmount >= MINIMUM_DONATION_GBP ? parsedAmount : 15;
  const amountLabel = `£${amount.toLocaleString("en-GB")}`;
  const reference = params.ref?.trim();
  const email = user.primaryEmailAddress?.emailAddress;
  const displayName = user.username || user.fullName || "your account";
  const profileHref = user.username ? `/profile/${encodeURIComponent(user.username)}` : "/settings/profile";

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-14 sm:px-6 sm:pt-[72px]">
      <div className="flex flex-col items-center text-center">
        {processing ? (
          <>
            <span className="grid size-16 place-items-center rounded-[20px] bg-secondary">
              <Loader2 className="size-[26px] animate-spin text-primary" aria-hidden="true" />
            </span>
            <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Payment processing
            </p>
            <h1 className="mt-2.5 text-balance text-[38px] font-bold leading-[1.05] tracking-[-0.05em] sm:text-[44px]">
              Thank you. Almost there.
            </h1>
            <p className="mt-3.5 max-w-[440px] text-pretty text-base leading-[1.6] text-muted-foreground">
              We&apos;re confirming your {amountLabel} donation with Stripe. Pro will switch on automatically, usually within a minute. You can leave this page.
            </p>
          </>
        ) : (
          <>
            <span className="grid size-16 place-items-center rounded-[20px] bg-primary shadow-[0_18px_36px_-16px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
              <Crown className="size-[30px] text-primary-foreground" aria-hidden="true" />
            </span>
            <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Donation received
            </p>
            <h1 className="mt-2.5 text-balance text-[38px] font-bold leading-[1.05] tracking-[-0.05em] sm:text-[44px]">
              Thank you. Pro is on.
            </h1>
            <p className="mt-3.5 max-w-[440px] text-pretty text-base leading-[1.6] text-muted-foreground">
              Your {amountLabel} helps keep aviation.wiki free for everyone. Pro is now permanently on your account.
            </p>
          </>
        )}
      </div>

      <div className="mt-9 overflow-hidden rounded-[18px] border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <p className="text-sm font-semibold">Receipt</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              processing
                ? "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {processing ? "Processing" : "Paid"}
          </span>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 px-5 py-[18px] text-sm">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="text-right font-semibold">{amountLabel} · one-time</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="text-right">{dateFormatter.format(new Date())}</dd>
          <dt className="text-muted-foreground">Account</dt>
          <dd className="text-right">{displayName}</dd>
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="text-right font-mono text-[13px]">{reference || "Pending"}</dd>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted px-5 py-3.5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" aria-hidden="true" />
            {email ? `Receipt sent to ${email}` : "A receipt will be emailed to you once confirmed"}
          </span>
        </div>
      </div>

      <section className="mt-10">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {processing ? "Ready once Pro switches on" : "Start using Pro"}
        </p>
        <div className="mt-3 flex flex-col border-t border-foreground">
          {nextSteps.map(({ icon: Icon, title, body, href }) => (
            <Link
              key={title}
              href={href}
              className="grid grid-cols-[40px_minmax(0,1fr)_16px] items-center gap-3.5 border-b py-4 transition-colors hover:bg-secondary"
            >
              <span className="grid size-10 place-items-center rounded-[11px] bg-accent">
                <Icon className="size-[18px] text-primary" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-normal text-muted-foreground">{body}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-9 flex flex-wrap justify-center gap-2.5">
        <Link href={profileHref} className={cn(buttonVariants({ size: "lg" }))}>Go to my profile</Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Back to the encyclopedia</Link>
      </div>
      <p className="mt-5 text-center text-xs leading-[1.6] text-muted-foreground">
        Something wrong with your donation? <Link href="/contact" className="underline underline-offset-[3px]">Contact us</Link> with your reference.
      </p>
    </main>
  );
}
