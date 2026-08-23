import { PublicArticleRoute } from "@/components/public-article-route";
import { publicArticleMetadata } from "@/lib/seo";
export const generateMetadata = ({ params }: { params: Promise<{ slug: string }> }) => publicArticleMetadata(params, "airport");
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <PublicArticleRoute params={params} contentType="airport" />; }
