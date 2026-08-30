import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistrationDirectory } from "@/components/registration-directory";
import { loadRegistrationRecords } from "@/lib/public-registrations";
import { registrationPrefixCountries } from "@/lib/registration-data";

function normalizedPrefix(value: string) {
  return value.trim().toUpperCase();
}

export async function generateMetadata({ params }: { params: Promise<{ prefix: string }> }): Promise<Metadata> {
  const prefix = normalizedPrefix((await params).prefix);
  const country = registrationPrefixCountries[prefix];
  return {
    title: `${prefix}-prefix ${country ? `${country} ` : ""}aircraft registrations`,
    description: `Browse approved ${country ? `${country} ` : ""}aircraft registrations beginning with the ${prefix} prefix and follow every entry to its sourced aviation.wiki article.`,
    alternates: { canonical: `/registrations/${prefix.toLowerCase()}` },
  };
}

export default async function RegistrationPrefixPage({ params, searchParams }: { params: Promise<{ prefix: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const prefix = normalizedPrefix((await params).prefix);
  if (!/^[A-Z0-9]{1,3}$/.test(prefix)) notFound();
  const records = await loadRegistrationRecords();
  const rawQuery = (await searchParams).q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery || "").slice(0, 80);
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / </span><Link href="/registrations" className="article-link">Registrations</Link><span> / {prefix}</span></nav>
      <RegistrationDirectory records={records} prefix={prefix} query={query} />
    </main>
  );
}
