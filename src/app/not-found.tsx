import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 py-16 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-primary">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold">This page could not be found</h1>
        <p className="mt-3 text-muted-foreground">
          The article or page you followed may have been moved, merged, or never
          existed. Search the encyclopedia or start from the home page.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={buttonVariants()}>
            Home
          </Link>
          <Link
            href="/search"
            className={buttonVariants({ variant: "outline" })}
          >
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
