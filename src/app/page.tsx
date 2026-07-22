import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Plane, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDisplayLabel } from "@/lib/display";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

const categories = [
  { name: "Commercial", description: "Airlines, flag carriers & low-cost operators", count: "1,240", glyph: "AIR", href: "/commercial" },
  { name: "Military", description: "Fighters, bombers, transports & UAVs", count: "9,120", glyph: "MIL", href: "#" },
  { name: "General aviation", description: "Light aircraft, jets & rotorcraft", count: "14,380", glyph: "GEN", href: "#" },
  { name: "Historic", description: "Pioneers, warbirds & retired types", count: "6,510", glyph: "HIS", href: "#" },
];

const commercialTailLogos = [
  { airline: "British Airways", src: "https://airhex.com/images/airline-logos/tail/british-airways.png" },
  { airline: "Emirates", src: "https://airhex.com/images/airline-logos/tail/emirates.png" },
  { airline: "Delta Air Lines", src: "https://airhex.com/images/airline-logos/tail/delta.png" },
  { airline: "Qantas", src: "https://airhex.com/images/airline-logos/tail/qantas.png" },
  { airline: "Singapore Airlines", src: "https://airhex.com/images/airline-logos/tail/singapore-airlines.png" },
];

export default async function Home() {
  const documents = await listPublicSearchDocuments();
  const featured = documents.find((document) => document.slug === "f-15-eagle") || documents[0];
  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-6">
      <section className="px-0 py-16 text-center sm:py-20">
        <Badge variant="outline" className="mb-5 h-7 rounded-full bg-card px-3 font-medium text-muted-foreground">
          <span className="mr-1 size-1.5 rounded-full bg-primary" />{documents.length} approved {documents.length === 1 ? "article" : "articles"}
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-[52px]">The free encyclopedia of everything that flies</h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">A collaborative reference on the aircraft, engines, and people that made flight possible.</p>
        <form className="relative mx-auto mt-8 max-w-[600px]" action="/search">
          <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input name="q" className="h-[52px] rounded-xl bg-card pl-12 pr-28 text-base shadow-md" placeholder="Search names, codes, registrations…" aria-label="Search aviation.wiki" />
          <button type="submit" className={cn(buttonVariants({ size: "lg" }), "absolute right-1.5 top-1.5 h-10 px-5")}>Search</button>
        </form>
      </section>

      <section id="browse" className="mb-12">
        <div className="mb-4 flex items-baseline justify-between"><h2 className="text-[15px] font-semibold">Browse by category</h2><Link href="#" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">View all <ArrowRight className="size-3.5" /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.name} href={category.href} className="block">
              <Card className="group h-full gap-0 py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <CardContent className="p-[18px]">
                {category.name === "Commercial" ? (
                  <div className="commercial-tail-logos mb-3.5 size-10 overflow-hidden rounded-lg bg-accent" aria-label="Commercial airline tail logos">
                    {commercialTailLogos.map((logo) => (
                      <Image key={logo.airline} src={logo.src} alt={`${logo.airline} tail logo`} width={40} height={40} className="commercial-tail-logo" />
                    ))}
                  </div>
                ) : (
                  <div className="mb-3.5 grid size-10 place-items-center rounded-lg bg-accent font-mono text-[10px] font-semibold text-primary">{category.glyph}</div>
                )}
                <h3 className="font-semibold">{category.name}</h3>
                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{category.description}</p>
                <p className="mt-2.5 font-mono text-xs text-muted-foreground/70">{category.count} articles</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {featured && <section className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <div className="aircraft-placeholder relative flex aspect-[16/8] items-center justify-center">
            <Plane className="size-14 -rotate-12 text-muted-foreground/35" strokeWidth={1.25} />
            <Badge className="absolute left-3.5 top-3.5 rounded-full">Approved article</Badge>
          </div>
          <CardContent className="p-6">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{formatDisplayLabel(featured.contentType)}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight"><Link href={featured.href}>{featured.title}</Link></h2>
            <p className="mt-2.5 text-[15px] leading-6 text-muted-foreground">{featured.description}</p>
            <Link href={featured.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5")}>Read article <ArrowRight data-icon="inline-end" /></Link>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0 shadow-xs">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-[15px] font-semibold">Public data only</h2><BookOpen className="size-4 text-muted-foreground" /></div>
          <CardContent className="p-5 text-sm leading-6 text-muted-foreground">Search and discovery use only live, approved revisions and verified entity relationships. Drafts, pending work, archives, and private moderation details stay private.</CardContent>
        </Card>
      </section>}
    </main>
  );
}
