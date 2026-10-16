import { SeoLandingPage, metadataForSeoLanding } from "@/components/seo-landing-page";
export const metadata = metadataForSeoLanding("airlines-united-kingdom");
export const revalidate = 3600;

export default function Page() { return <SeoLandingPage id="airlines-united-kingdom" />; }
