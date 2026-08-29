import { PublicArticleRoute } from "@/components/public-article-route";
import { publicArticleMetadata } from "@/lib/seo";
// Article shell is reader-agnostic and cached; served from the ISR cache and
// revalidated on approval/edit via revalidatePath/revalidateTag. See issue #5.
export const revalidate = 3600;
// Empty list: prebuild nothing, but render each slug on first visit and then
// serve it from the ISR cache (Next 16 requires this to enable runtime ISR).
export function generateStaticParams() { return []; }
export const generateMetadata = ({ params }: { params: Promise<{ slug: string }> }) => publicArticleMetadata(params, "aircraft");
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <PublicArticleRoute params={params} contentType="aircraft" />; }
