import { PublicArticleHistoryRoute } from "@/components/public-article-route";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return (
    <PublicArticleHistoryRoute
      params={params}
      searchParams={searchParams}
      contentType="alliance"
    />
  );
}
