import Link from "next/link";
import { Database, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";
import { filterRegistrationRecords, registrationPrefixCountries, registrationPrefixes, type RegistrationRecord } from "@/lib/registration-data";

export function RegistrationDirectory({ records, prefix, query = "" }: { records: RegistrationRecord[]; prefix?: string; query?: string }) {
  const prefixes = registrationPrefixes(records);
  const filtered = filterRegistrationRecords(records, { prefix, query });
  const canonicalPrefix = prefix?.toUpperCase();

  return (
    <>
      <section className="max-w-3xl">
        <Badge variant="secondary" className="rounded-full text-primary"><Database />Approved data</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          {canonicalPrefix ? `${canonicalPrefix}-prefix ${registrationPrefixCountries[canonicalPrefix] ? `${registrationPrefixCountries[canonicalPrefix]} ` : ""}aircraft registrations` : "Aircraft registrations database"}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Search registration and tail-number fields published in approved aviation.wiki articles. Every row links back to the article that supplies it.
        </p>
      </section>

      <form className="mt-8 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row" action={canonicalPrefix ? `/registrations/${canonicalPrefix.toLowerCase()}` : "/registrations"}>
        <label className="relative flex-1">
          <span className="sr-only">Search registrations</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Registration or related article…" className="h-11 pl-10" />
        </label>
        <button className={buttonVariants({ size: "lg" })}>Search database</button>
      </form>

      {!canonicalPrefix && prefixes.length > 0 && (
        <nav className="mt-7 flex flex-wrap gap-2" aria-label="Registration prefixes">
          {prefixes.map((item) => (
            <Link key={item} href={`/registrations/${item.toLowerCase()}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{item}<span className="text-muted-foreground">{registrationPrefixCountries[item]}</span></Link>
          ))}
        </nav>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p><strong className="text-foreground">{filtered.length}</strong> {filtered.length === 1 ? "registration" : "registrations"}</p>
        {(query || canonicalPrefix) && <Link href="/registrations" className="article-link">Clear filters</Link>}
      </div>

      {filtered.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Prefix</th><th className="px-4 py-3">Related approved article</th><th className="px-4 py-3">Source field</th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-muted/25">
                  <th className="px-4 py-4 font-mono text-base text-primary">{record.registration}</th>
                  <td className="px-4 py-4"><Link href={`/registrations/${record.prefix.toLowerCase()}`} className="article-link">{record.prefix}</Link></td>
                  <td className="px-4 py-4"><Link href={record.articleHref} className="article-link font-medium">{record.articleTitle}</Link><span className="ml-2 text-xs text-muted-foreground">{formatDisplayLabel(record.contentType)}</span></td>
                  <td className="px-4 py-4 text-muted-foreground">{record.sourceField}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
          <Database className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No approved registrations found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a broader search, or add a sourced registration field to a relevant article.</p>
        </div>
      )}
    </>
  );
}
