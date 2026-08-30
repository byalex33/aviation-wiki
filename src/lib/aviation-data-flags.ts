import { notFound } from "next/navigation";

// The aviation data graph ships dark. Its PostgreSQL tables are additive and are
// never created from a web request in production (see AVIATION-DATA-MODEL.md), so
// the public routes, navigation entries, and sitemap URLs for the feature stay
// hidden until the migration and the first curated import have run and
// AVIATION_DATA_ENABLED is set to "true" in the environment.
//
// In development and test, ensureSchema() creates the tables automatically, so
// the feature is on unless AVIATION_DATA_ENABLED is explicitly "false".
export function computeAviationDataEnabled(
  env: { AVIATION_DATA_ENABLED?: string; NODE_ENV?: string } = process.env,
) {
  return env.AVIATION_DATA_ENABLED
    ? env.AVIATION_DATA_ENABLED === "true"
    : env.NODE_ENV !== "production";
}

export const aviationDataEnabled = computeAviationDataEnabled();

// Guard for the aviation data graph route handlers and pages. Renders the 404
// page while the feature is dark so unpopulated routes are never publicly
// reachable.
export function ensureAviationDataEnabled() {
  if (!aviationDataEnabled) notFound();
}
