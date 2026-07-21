import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Menu, Plane, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "aviation.wiki", template: "%s — aviation.wiki" },
  description: "The free encyclopedia of aircraft, engines, airports, and aviation history.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-6 px-5 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-tight" aria-label="aviation.wiki home">
              <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"><Plane className="size-3.5 -rotate-12" /></span>
              aviation.wiki
            </Link>
            <form className="relative ml-auto hidden w-full max-w-[420px] md:block" action="/">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-[38px] bg-card pl-9 shadow-xs" placeholder="Search aircraft, engines, events…" aria-label="Search aviation.wiki" />
            </form>
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
              <Link href="/#browse" className="font-medium transition-colors hover:text-foreground">Browse</Link>
              <Link href="/#popular" className="font-medium transition-colors hover:text-foreground">Popular</Link>
              <Link href="/f-15-eagle" className="font-medium transition-colors hover:text-foreground">Random</Link>
              <Link href="#" className={cn(buttonVariants(), "h-9 px-4")}>Contribute</Link>
            </nav>
            <button className="ml-auto grid size-9 place-items-center rounded-md border md:hidden" aria-label="Open menu"><Menu className="size-4" /></button>
          </div>
        </header>
        {children}
        <footer className="border-t bg-card">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-7 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>aviation.wiki — open aviation knowledge for everyone.</span>
            <nav className="flex gap-5 font-medium text-foreground/70"><Link href="#">Privacy</Link><Link href="#">Contact</Link><Link href="#">Contribute</Link></nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
