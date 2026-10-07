// IndexNow keys are 8–128 characters of letters, digits and dashes.
export function indexNowKey() {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}
