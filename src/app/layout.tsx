import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Search, Sparkles } from "lucide-react";
import { Toaster } from "sonner";

import { AccountMenu } from "@/components/account-menu";
import { HeaderSearch } from "@/components/header-search";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeSelector } from "@/components/theme-selector";
import { buttonVariants } from "@/components/ui/button";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem("aviation-theme");if(t==="pastel-light"||t==="pastel-dark"||t==="twitter-light"||t==="twitter-dark"){document.documentElement.dataset.theme=t.indexOf("pastel")===0?"pastel-dreams":"twitter";document.documentElement.classList.toggle("dark",t.endsWith("-dark"))}}catch(e){}})()`;
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/aviation-wiki-logo.svg`,
};

function AviationLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path
        className="fill-primary-foreground"
        d="M51.7 29.1 36.2 20l-.4-9.2c-.1-2.2-1.8-4-3.8-4s-3.7 1.8-3.8 4l-.4 9.2-15.5 9.1c-1.1.7-1.8 1.9-1.8 3.2v3.3l17-5.2-.7 15.3-5.8 4v3.5l11-2.4 11 2.4v-3.5l-5.8-4-.7-15.3 17 5.2v-3.3c0-1.3-.7-2.5-1.8-3.2Z"
      />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${geistMono.variable} ${openSans.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <ClerkProvider appearance={{ theme: shadcn }}>
          <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
            <div className="relative mx-auto flex h-[60px] max-w-[1200px] items-center gap-2 px-5 sm:gap-6 sm:px-6">
              <Link
                href="/"
                className="group flex min-h-10 shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-tight"
                aria-label="aviation.wiki home"
              >
                <AviationLogo className="size-7" />
                <span className="hidden min-[360px]:inline">
                  Aviation<span className="text-primary">.wiki</span>
                </span>
                <span
                  className="-ml-1 hidden h-5 -rotate-3 items-center gap-1 rounded-full border border-primary/20 bg-accent px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary shadow-sm transition-transform group-hover:rotate-0 min-[420px]:inline-flex"
                  aria-label="Beta version"
                >
                  <Sparkles className="size-2.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Beta</span>
                </span>
              </Link>
              <div className="absolute left-1/2 hidden w-[min(36vw,440px)] -translate-x-1/2 md:block">
                <HeaderSearch />
              </div>
              <nav
                className="ml-auto flex items-center gap-2 text-sm"
                aria-label="Account navigation"
              >
                <Link
                  href="/search"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "size-10 md:hidden",
                  )}
                  aria-label="Search"
                >
                  <Search />
                </Link>
                <Show when="signed-out">
                  <SignInButton>
                    <button
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-10 px-3",
                      )}
                    >
                      Log in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className={cn(buttonVariants(), "h-10 px-4")}>
                      Sign up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <NotificationBell />
                  <AccountMenu />
                </Show>
              </nav>
            </div>
          </header>
          {children}
          <footer className="site-footer mt-auto overflow-hidden bg-foreground text-background">
            <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
              <div className="grid gap-10 py-12 sm:py-14 md:grid-cols-[1.5fr_0.7fr_0.9fr] md:gap-14">
                <div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight"
                    aria-label="aviation.wiki home"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-background">
                      <AviationLogo className="size-[25px]" />
                    </span>
                    <span>
                      aviation<span className="text-primary">.wiki</span>
                    </span>
                  </Link>
                  <p className="mt-5 max-w-sm text-[15px] leading-6 text-background/60">
                    Open aviation knowledge, built for everyone curious about
                    the people, machines, and places that make flight possible.
                  </p>
                </div>

                <nav aria-label="Footer navigation">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-background/40">
                    Navigate
                  </p>
                  <div className="mt-4 flex flex-col items-start gap-1 text-sm font-medium">
                    <Link
                      href="/"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Home
                    </Link>
                    <Link
                      href="/categories"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Categories
                    </Link>
                    <Link
                      href="/fleet"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Fleet database
                    </Link>
                    <Link
                      href="/fleet/compare"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Compare aircraft
                    </Link>
                    <Link
                      href="/compare"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Comparison guides
                    </Link>
                    <Link
                      href="/contribute"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Contribute
                    </Link>
                    <Link
                      href="/pro"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Pro
                    </Link>
                    <Link
                      href="/privacy"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Privacy
                    </Link>
                    <Link
                      href="/contact"
                      className="flex min-h-10 items-center transition-colors hover:text-primary"
                    >
                      Contact
                    </Link>
                  </div>
                </nav>

                <ThemeSelector />
              </div>

              <div className="flex flex-col gap-2 border-t border-background/10 py-5 text-xs text-background/40 sm:flex-row sm:items-center sm:justify-between">
                <p>© 2026 aviation.wiki</p>
                <p>The free encyclopedia of everything that flies.</p>
              </div>
            </div>
          </footer>
          <Analytics />
          <SpeedInsights />
          <Toaster position="bottom-right" richColors />
        </ClerkProvider>
      </body>
    </html>
  );
}
