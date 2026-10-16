import { SeoLandingPage, metadataForSeoLanding } from "@/components/seo-landing-page";
export const metadata = metadataForSeoLanding("aircraft-boeing");
export const revalidate = 3600;

export default function Page() { return <SeoLandingPage id="aircraft-boeing" />; }
