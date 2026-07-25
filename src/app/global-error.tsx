"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <h1>aviation.wiki could not load</h1>
            <p>Please retry. Your last change may not have been saved.</p>
            <button type="button" onClick={() => unstable_retry()}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
