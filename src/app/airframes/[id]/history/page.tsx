import { PublicArticleHistoryRoute } from "@/components/public-article-route";

export const dynamic = "force-dynamic";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return (
    <PublicArticleHistoryRoute
      params={params.then(({ id }) => ({ slug: id }))}
      searchParams={searchParams}
      contentType="airframe"
    />
  );
}
