import { notFound } from "next/navigation";

export async function GET(
  _request: Request,
  {
    params,
  }: {
  params: Promise<{ indexNowKey: string }>;
  },
) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || (await params).indexNowKey !== `${key}.txt`) notFound();
  return new Response(key, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
