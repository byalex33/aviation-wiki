import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  description: "Get in touch with aviation.wiki.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-190px)] max-w-[760px] items-start px-5 py-14 sm:px-6 sm:py-20">
      <div className="w-full">
        <header>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">Get in touch</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Contact</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Have a question, spotted an issue, or want to talk about aviation.wiki? Send us an email.
          </p>
        </header>

        <section className="mt-10 rounded-xl border bg-card p-6 shadow-xs sm:p-8">
          <div className="grid size-11 place-items-center rounded-lg bg-accent text-primary">
            <Mail className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Email us</h2>
          <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
            We welcome general questions, corrections, privacy enquiries, and partnership ideas.
          </p>
          <a
            href="mailto:contact@aviation.wiki"
            className={cn(buttonVariants({ size: "lg" }), "mt-6")}
          >
            <Mail data-icon="inline-start" />
            contact@aviation.wiki
          </a>
        </section>
      </div>
    </main>
  );
}
