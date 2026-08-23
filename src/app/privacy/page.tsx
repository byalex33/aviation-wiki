import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  alternates: { canonical: "/privacy" },
  description: "How aviation.wiki handles information about its visitors and contributors.",
};

const sections = [
  {
    title: "Information we collect",
    body: "When you create an account, sign in, submit a contribution, or contact us, we may receive the information you provide. We may also collect basic technical information such as your IP address, browser type, device type, and pages visited through server logs and analytics.",
  },
  {
    title: "How we use information",
    body: "We use this information to operate and secure aviation.wiki, authenticate accounts, review and attribute contributions, respond to messages, understand how the site is used, and improve the service.",
  },
  {
    title: "Cookies and service providers",
    body: "aviation.wiki and its service providers may use cookies or similar technologies that are necessary for authentication, security, preferences, and site analytics. Providers process information on our behalf to deliver these services.",
  },
  {
    title: "Sharing and disclosure",
    body: "We do not sell your personal information. We may share information with service providers that help us run the site, when required by law, or when reasonably necessary to protect aviation.wiki, its users, or the public.",
  },
  {
    title: "Contributions",
    body: "Approved contributions and associated public attribution may remain visible as part of the encyclopedia and its revision history. Please do not include private or sensitive personal information in a contribution.",
  },
  {
    title: "Retention and your choices",
    body: "We retain information only for as long as it is reasonably needed for the purposes described here, including security, record-keeping, and legal obligations. You may contact us to ask about, correct, or request deletion of your personal information, subject to applicable requirements.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-190px)] max-w-[760px] px-5 py-14 sm:px-6 sm:py-20">
      <header className="border-b pb-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">Legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Privacy</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          This page explains what information aviation.wiki may collect and how it is used.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: 22 July 2026</p>
      </header>

      <div className="space-y-8 py-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
            <p className="mt-2 text-[15px] leading-7 text-foreground/75">{section.body}</p>
          </section>
        ))}

        <section className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
          <p className="mt-2 text-[15px] leading-7 text-foreground/75">
            For privacy questions or requests, email{" "}
            <a className="font-medium text-primary hover:underline" href="mailto:contact@aviation.wiki">
              contact@aviation.wiki
            </a>
            . We may update this notice as the site and its services change.
          </p>
        </section>
      </div>
    </main>
  );
}
