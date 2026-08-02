export const SITE_NAME = "aviation.wiki";
export const SITE_URL = "https://www.aviation.wiki";
export const SITE_DESCRIPTION =
  "The free encyclopedia of aircraft, airlines, engines, airports, and aviation history.";

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, SITE_URL).toString();
}
