export const ARTICLE_IMAGE_HOSTS = ["img.clerk.com", "airhex.com", "images.kiwi.com", "flagcdn.com", "upload.wikimedia.org", "cdn.jetphotos.com"] as const;
export const ARTICLE_IMAGE_GUIDANCE = `Use a local /path or an HTTPS image from ${ARTICLE_IMAGE_HOSTS.join(", ")}.`;

export function isAllowedArticleImage(value: string) {
  const trimmed = value.trim();
  if (/[\\\u0000-\u0020]/.test(trimmed)) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ARTICLE_IMAGE_HOSTS.some((host) => host === url.hostname);
  } catch { return false; }
}
