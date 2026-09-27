import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" }, description: "Terms for using and contributing to aviation.wiki." };
export default function TermsPage() {
  return <main className="mx-auto max-w-[760px] px-5 py-14 font-[family-name:var(--font-open-sans)]">
    <header className="border-b pb-8"><p className="text-xs uppercase tracking-widest text-muted-foreground">Legal</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Terms of service</h1><p className="mt-4 text-muted-foreground">Terms for using aviation.wiki and contributing to its encyclopedia.</p></header>
    <div className="space-y-8 py-8 text-sm leading-7">
      <section><h2 className="text-lg font-semibold">Using the encyclopedia</h2><p>Aviation.wiki is a community reference. Articles may contain errors or be out of date. Do not use the site for flight planning, navigation, maintenance decisions, or other operational aviation decisions. Use current official publications and qualified professional advice for those purposes.</p></section>
      <section><h2 className="text-lg font-semibold">Your account</h2><p>Keep your sign-in details secure and use an email address you control. You are responsible for activity you authorize through your account. Do not impersonate others, misuse another account, or attempt to bypass access controls.</p></section>
      <section><h2 className="text-lg font-semibold">Contributions and licensing</h2><p>Submit material you have the right to share, cite reliable sources, and preserve required attribution. Original editorial contributions are available under CC BY-SA 4.0. Imported data and media retain their own terms. Contributions may be edited, reviewed, or declined, and published contributions and attribution may remain in the revision history.</p><p>See our <a className="underline underline-offset-4" href="https://github.com/byalex33/aviation-wiki/blob/main/CONTENT-LICENSE.md">content license</a> for details.</p></section>
      <section><h2 className="text-lg font-semibold">Acceptable use</h2><p>Do not submit unlawful material, spam, harassment, private personal information, or content that infringes another person&apos;s rights. Do not disrupt the service or abuse its APIs. We may remove content or restrict accounts to protect the site and its contributors.</p></section>
      <section><h2 className="text-lg font-semibold">Availability and changes</h2><p>The site and its content are provided as available. Features and these terms may change as the service develops. Nothing in these terms removes rights that cannot be excluded under applicable law.</p></section>
      <section><h2 className="text-lg font-semibold">Privacy and contact</h2><p>Our <Link className="underline underline-offset-4" href="/privacy">privacy policy</Link> describes how we handle personal information. For account, content, or terms questions, <Link className="underline underline-offset-4" href="/contact">contact us</Link>.</p></section>
    </div>
  </main>;
}
