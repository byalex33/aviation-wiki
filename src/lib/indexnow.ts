import "server-only";

const baseUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://aviation.wiki",
);

export async function submitIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !paths.length) return;
  const urlList = [
    ...new Set(paths.map((path) => new URL(path, baseUrl).href)),
  ].filter((url) => new URL(url).origin === baseUrl.origin);
  if (!urlList.length) return;

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: baseUrl.host,
        key,
        keyLocation: new URL(`/${key}.txt`, baseUrl).href,
        urlList,
      }),
    });
    if (!response.ok)
      console.error(`IndexNow rejected the update (${response.status}).`);
    else
      console.info(`IndexNow accepted ${urlList.length} URL(s) (${response.status}).`);
    return { status: response.status, urlList };
  } catch (error) {
    console.error("IndexNow submission failed.", error);
  }
}
