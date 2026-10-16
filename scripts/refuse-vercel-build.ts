// One-shot migrations and backfills must not run inside a Vercel build.
// `process.exit(0)` lets a dashboard command shaped like `script && npm run build`
// continue into the real build without writing to the database or failing the deploy.
export function runningOnVercel(env: { VERCEL?: string } = { VERCEL: process.env.VERCEL }) {
  return env.VERCEL === "1";
}

export function exitIfVercelBuild() {
  if (!runningOnVercel()) return;
  console.log(
    "Skipping one-shot migration or backfill during a Vercel build. Run it as its own command against the database.",
  );
  process.exit(0);
}
