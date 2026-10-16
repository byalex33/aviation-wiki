/**
 * Publication has already committed. Notification and audit failures must be
 * logged, then the caller still revalidates and redirects. Swallowing them
 * inside the form-action catch leaves the public page stale and shows a
 * generic error for a revision that is already live.
 */
export async function runPublishedFollowUp(
  label: string,
  work: () => Promise<void>,
) {
  try {
    await work();
  } catch (error) {
    console.error(label, error);
  }
}
