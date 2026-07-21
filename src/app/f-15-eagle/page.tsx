import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "McDonnell Douglas F-15 Eagle",
  description: "The aviation.wiki article on the McDonnell Douglas F-15 Eagle air-superiority fighter.",
};

const infobox = [
  ["Role", "Air superiority fighter"],
  ["Manufacturer", "McDonnell Douglas (now Boeing)"],
  ["First flight", "27 July 1972"],
  ["Introduction", "9 January 1976"],
  ["Status", "In service"],
  ["Primary users", "USAF & allied air forces"],
  ["Produced", "1972–present"],
  ["Unit cost", "US$29.9M (F-15C, 1998)"],
];

const specifications = [
  ["Crew", "1 (2 in two-seat variants)"],
  ["Length", "19.43 m (63 ft 9 in)"],
  ["Wingspan", "13.05 m (42 ft 10 in)"],
  ["Height", "5.63 m (18 ft 6 in)"],
  ["Empty weight", "12,700 kg (28,000 lb)"],
  ["Powerplant", "2 × Pratt & Whitney F100 afterburning turbofans"],
  ["Maximum speed", "Mach 2.5 (2,655 km/h)"],
  ["Combat range", "1,967 km (1,222 mi)"],
  ["Service ceiling", "20,000 m (65,000 ft)"],
  ["Armament", "1 × 20 mm M61 cannon; AIM-9/7/120 missiles"],
];

export default function F15EaglePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-5 sm:px-6">
      <nav className="mb-5 flex flex-wrap gap-2 text-[13px] text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="article-link">Main</Link><span>/</span><Link href="#" className="article-link">Military</Link><span>/</span><Link href="#" className="article-link">Fighters</Link><span>/</span><span className="text-foreground/75">F-15 Eagle</span>
      </nav>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_344px]">
        <article className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-wide text-primary">Air superiority fighter</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-[-0.035em] sm:text-[40px]">McDonnell Douglas F-15 Eagle</h1>
          <p className="mt-2.5 flex flex-wrap gap-3 text-[13px] text-muted-foreground"><span>From aviation.wiki</span><span>·</span><span>Last edited 3 days ago</span><span>·</span><span>312k views</span></p>

          <p className="article-lead">The <strong>McDonnell Douglas F-15 Eagle</strong> is an American twin-engine, all-weather tactical fighter aircraft designed to gain and maintain air superiority in aerial combat.<sup><a href="#ref-1">[1]</a></sup> Developed for the United States Air Force from a 1967 requirement, it first flew in July 1972 and entered service in 1976.</p>
          <p>The Eagle&apos;s design emphasized a high thrust-to-weight ratio and low wing loading, giving it exceptional acceleration and manoeuvrability. A large fixed wing, twin vertical stabilizers, and a powerful pulse-Doppler radar allowed it to detect and engage targets far beyond visual range.<sup><a href="#ref-2">[2]</a></sup> As of 2026 the F-15 has more than 100 aerial combat victories with no confirmed air-to-air losses.</p>

          <figure className="my-7">
            <div className="aircraft-placeholder flex aspect-[16/7] items-center justify-center rounded-xl border"><Plane className="size-16 -rotate-12 text-muted-foreground/35" strokeWidth={1.1} /></div>
            <figcaption className="mt-2 text-xs text-muted-foreground">An F-15C displaying its twin vertical stabilizers and large wing area.</figcaption>
          </figure>

          <h2>Development</h2>
          <p>The program originated from the U.S. Air Force&apos;s F-X studies of the mid-1960s, seeking a dedicated air-superiority fighter to replace the F-4 Phantom II. McDonnell Douglas was awarded the contract in 1969, and the first prototype flew on 27 July 1972.</p>
          <p>A two-seat dual-role derivative, the <a href="#" className="article-link">F-15E Strike Eagle</a>, added air-to-ground capability while retaining the air-superiority performance of the original. Production of the modernized <a href="#" className="article-link">F-15EX Eagle II</a> continues today.</p>

          <h2>Design</h2>
          <p>The F-15 is powered by two afterburning turbofan engines mounted side by side in the fuselage. Its cropped-delta wing and large control surfaces provide sustained turn performance, while the bubble canopy affords the pilot near-unobstructed vision.<sup><a href="#ref-2">[2]</a></sup></p>

          <h2>Operational history</h2>
          <p>Entering U.S. service in 1976, the Eagle became the backbone of American air defense and has been exported to several allied nations. It saw extensive combat from the 1980s onward, establishing an air-to-air record that remains unmatched among modern fighters.<sup><a href="#ref-3">[3]</a></sup></p>

          <h2>Specifications <span className="text-sm font-medium text-muted-foreground">(F-15C)</span></h2>
          <Card className="gap-0 overflow-hidden py-0 shadow-xs">
            {specifications.map(([key, value]) => <div key={key} className="grid grid-cols-[40%_1fr] gap-4 border-b px-[18px] py-2.5 text-sm last:border-0"><span className="font-medium text-muted-foreground">{key}</span><span>{value}</span></div>)}
          </Card>

          <h2 id="ref-1">References</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-[13.5px] text-muted-foreground">
            <li id="ref-2">Spick, Mike. <em>The Illustrated Directory of Fighters</em>. Salamander Books, 2002.</li>
            <li id="ref-3">Davies, Steve. <em>Combat Legend: F-15 Eagle</em>. Airlife Publishing, 2003.</li>
            <li>United States Air Force. “F-15 Eagle Fact Sheet.” Public affairs release, 2024.</li>
          </ol>
        </article>

        <aside className="top-[76px] overflow-hidden rounded-xl border bg-card shadow-lg lg:sticky">
          <div className="p-2.5"><div className="aircraft-placeholder flex aspect-[4/3] items-center justify-center rounded-lg"><Plane className="size-14 -rotate-12 text-muted-foreground/35" strokeWidth={1.1} /></div></div>
          <div className="px-[18px] pb-2"><h2 className="text-lg font-bold tracking-tight">F-15 Eagle</h2><p className="text-[13px] text-muted-foreground">Air superiority fighter</p></div>
          <dl>{infobox.map(([key, value]) => <div key={key} className="grid grid-cols-[42%_1fr] gap-3 border-t px-[18px] py-2 text-[13px]"><dt className="font-medium text-muted-foreground">{key}</dt><dd>{value}</dd></div>)}</dl>
          <Link href="/" className={`${buttonVariants()} mx-[18px] mb-[18px] mt-3 flex`}><ArrowLeft data-icon="inline-start" /> Back to main</Link>
        </aside>
      </div>
    </main>
  );
}
