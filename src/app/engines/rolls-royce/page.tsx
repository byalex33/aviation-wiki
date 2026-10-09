import { SeoLandingPage, metadataForSeoLanding } from "@/components/seo-landing-page";
export const metadata = metadataForSeoLanding("engines-rolls-royce");
export default function Page() { return <SeoLandingPage id="engines-rolls-royce" />; }

// Reads the database, and Vercel preview builds have no DATABASE_URL, so this
// listing renders per request instead of being prerendered at build.
export const dynamic = "force-dynamic";
