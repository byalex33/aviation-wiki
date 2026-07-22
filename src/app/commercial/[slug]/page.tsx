import { PublicArticleRoute } from "@/components/public-article-route";
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <PublicArticleRoute params={params} contentType="airline" />; }
