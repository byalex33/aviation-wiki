import { SeoLandingPage, metadataForSeoLanding } from "@/components/seo-landing-page";
export const metadata = metadataForSeoLanding("engines-rolls-royce");
export const revalidate = 3600;

export default function Page() { return <SeoLandingPage id="engines-rolls-royce" />; }
