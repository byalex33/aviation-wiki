// Public directory pages export `revalidate = 3600` (a literal, because Next.js
// will not apply an imported segment config). Approvals also call
// revalidatePublicPages so a new article does not wait for the hour.

// Preview and local production builds have no DATABASE_URL. Those builds still
// prerender the page, using a placeholder, so the route stays in the cache
// instead of rendering on every request. A build that has DATABASE_URL
// prerenders the real directory.
export function publicDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export const PUBLIC_DIRECTORY_PATHS = [
  "/",
  "/aircraft",
  "/aircraft/airbus",
  "/aircraft/boeing",
  "/airports",
  "/airports/united-kingdom",
  "/spotting",
  "/airlines/united-kingdom",
  "/manufacturers",
  "/engines",
  "/engines/rolls-royce",
  "/military",
  "/general-aviation",
  "/cargo",
  "/commercial-aircraft",
  "/alliances",
  "/aviation-news",
  "/commercial",
  "/categories",
] as const;

// Loaded on demand so scripts that only need the path list do not import Next.
export async function revalidatePublicPages() {
  const { revalidatePath } = await import("next/cache");
  for (const path of PUBLIC_DIRECTORY_PATHS) revalidatePath(path);
  revalidatePath("/sitemap.xml");
}
