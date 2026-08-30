import type { Metadata } from "next";
import Link from "next/link";

import { RegistrationDirectory } from "@/components/registration-directory";
import { loadRegistrationRecords } from "@/lib/public-registrations";

export const metadata: Metadata = {
  title: "Aircraft registrations database",
  description: "Search aircraft registrations and tail numbers from approved, sourced aviation.wiki articles.",
  alternates: { canonical: "/registrations" },
};

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = valueOf((await searchParams).q).slice(0, 80);
  const records = await loadRegistrationRecords();
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / Registrations</span></nav>
      <RegistrationDirectory records={records} query={query} />
    </main>
  );
}
