import { PublicArticleRoute } from "@/components/public-article-route";
import { publicArticleMetadata } from "@/lib/seo";

// ISR — see issue #5. Empty generateStaticParams: prebuild nothing, render each
// slug on first visit, then serve from the ISR cache (Next 16 requires this).
export const revalidate = 3600;
export function generateStaticParams() { return []; }
export const generateMetadata = ({ params }: { params: Promise<{ slug: string }> }) => publicArticleMetadata(params, "alliance");
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicArticleRoute params={params} contentType="alliance" />;
}
