export function isPostgresUndefinedTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}

/** A missing additive table should degrade to an empty result, not fail the caller. */
export async function emptyIfUndefinedTable<T>(
  query: () => Promise<T[]>,
  warning: string,
): Promise<T[]> {
  try {
    return await query();
  } catch (error) {
    if (!isPostgresUndefinedTable(error)) throw error;
    console.warn(warning);
    return [];
  }
}
