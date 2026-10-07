// Wikimedia only renders thumbnails at standard widths; anything else is refused.
export const WIKIMEDIA_THUMBNAIL_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840] as const;

type ThumbnailWidth = (typeof WIKIMEDIA_THUMBNAIL_WIDTHS)[number];

const RASTER = /\.(?:jpe?g|png|gif|webp)$/i;

/**
 * Points an upload.wikimedia.org image at a thumbnail no wider than `width`.
 * Originals and larger thumbnails are rewritten; other URLs are returned unchanged.
 */
export function wikimediaThumbnail(imageUrl: string, width: ThumbnailWidth) {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return imageUrl;
  }
  if (url.protocol !== "https:" || url.hostname !== "upload.wikimedia.org") return imageUrl;

  const thumb = /^(\/wikipedia\/[^/]+\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+)\/(\d+)px-([^/]+)$/.exec(url.pathname);
  if (thumb) {
    if (Number(thumb[2]) <= width) return imageUrl;
    url.pathname = `${thumb[1]}/${width}px-${thumb[3]}`;
    return url.toString();
  }

  const original = /^\/wikipedia\/([^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/.exec(url.pathname);
  if (!original || !RASTER.test(original[4])) return imageUrl;
  const [, project, a, ab, file] = original;
  url.pathname = `/wikipedia/${project}/thumb/${a}/${ab}/${file}/${width}px-${file}`;
  return url.toString();
}
