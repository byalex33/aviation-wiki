import { PublicArticleHistoryRoute } from "@/components/public-article-route";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return <PublicArticleHistoryRoute params={params} searchParams={searchParams} contentType="spotting_guide" />;
}
