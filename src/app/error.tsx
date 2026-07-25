"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 py-16 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-destructive">
          Unexpected error
        </p>
        <h1 className="mt-3 text-3xl font-bold">This page ran into a problem</h1>
        <p className="mt-3 text-muted-foreground">
          Your changes may not have been saved. Try loading this part of the
          page again.
        </p>
        <Button className="mt-6" onClick={() => unstable_retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
