/** Only allow a local destination after authentication. */
export function authDestination(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://aviation.wiki");
    if (url.origin !== "https://aviation.wiki" || /^\/(sign-in|sign-up|sso-callback)(\/|$)/.test(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

const emailTypos: Record<string, string> = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com", "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "outlok.com": "outlook.com",
  "outlook.con": "outlook.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "icloud.con": "icloud.com",
};
export function suggestEmail(value: string) {
  const parts = value.trim().split("@");
  if (parts.length !== 2 || !parts[0]) return null;
  const correction = emailTypos[parts[1].toLowerCase()];
  return correction ? `${parts[0]}@${correction}` : null;
}

export function authError(error: unknown) {
  if (error && typeof error === "object") {
    if ("errors" in error && Array.isArray(error.errors)) {
      return error.errors.map((item) => item.longMessage || item.message).filter(Boolean).join(" ") || "Something went wrong. Please try again.";
    }
    if ("longMessage" in error && typeof error.longMessage === "string") return error.longMessage;
    if ("message" in error && typeof error.message === "string") return error.message;
  }
  return "Something went wrong. Please try again.";
}

export async function checked<T extends { error: unknown }>(result: Promise<T>) {
  const response = await result;
  if (response.error) throw response.error;
  return response;
}
