import { PublicArticleRoute } from "@/components/public-article-route";
import { publicArticleMetadata } from "@/lib/seo";
export const generateMetadata = ({ params }: { params: Promise<{ slug: string }> }) => publicArticleMetadata(params, "engine");
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <PublicArticleRoute params={params} contentType="engine" />; }

// Cached for every reader (ISR). Approvals and edits revalidate the path
// immediately; the hour bounds staleness of cross-article links. Nothing is
// prerendered at build, so preview builds without a database still succeed.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
