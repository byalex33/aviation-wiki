const defaultSiteUrl = "https://www.aviation.wiki";
const indexNowKey = "84c952f7e2f5b690182b237bc707cb14";
const siteUrl = new URL(process.env.SITE_URL || defaultSiteUrl);
const sitemapUrl = new URL("/sitemap.xml", siteUrl);
const keyLocation = new URL(`/${indexNowKey}.txt`, siteUrl);

async function responseText(response) {
  const text = await response.text();
  return text.trim() || response.statusText;
}

const sitemapResponse = await fetch(sitemapUrl, {
  headers: { "user-agent": "aviation.wiki IndexNow submitter" },
});
if (!sitemapResponse.ok) {
  throw new Error(
    `Could not read ${sitemapUrl}: ${sitemapResponse.status} ${await responseText(sitemapResponse)}`,
  );
}

const sitemap = await sitemapResponse.text();
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">"),
);
const urlList = [...new Set(locations)].filter((location) => {
  try {
    return new URL(location).host === siteUrl.host;
  } catch {
    return false;
  }
});

if (!urlList.length) {
  throw new Error(`No same-host URLs were found in ${sitemapUrl}.`);
}

const keyResponse = await fetch(keyLocation);
const publishedKey = (await keyResponse.text()).trim();
if (!keyResponse.ok || publishedKey !== indexNowKey) {
  throw new Error(
    `IndexNow key verification failed at ${keyLocation} (${keyResponse.status}).`,
  );
}

for (let index = 0; index < urlList.length; index += 10_000) {
  const batch = urlList.slice(index, index + 10_000);
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: siteUrl.host,
      key: indexNowKey,
      keyLocation: keyLocation.toString(),
      urlList: batch,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `IndexNow rejected a batch: ${response.status} ${await responseText(response)}`,
    );
  }
}

console.log(
  `Submitted ${urlList.length} URLs from ${sitemapUrl} to IndexNow.`,
);
