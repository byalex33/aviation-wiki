import "server-only";

import {
  describeDatabaseError,
  isDatabaseConnectionError,
  isProductionBuild,
  recordDeferredPrerender,
  routeFromDynamicBailout,
} from "@/lib/build-database";

// Runs the query. When `next build` cannot reach Postgres, opt this route out
// of prerendering instead of failing the export. A partial response is not
// returned: that would be cached for the revalidate window. On-demand
// rendering tries again per request. A healthy build never calls `connection()`,
// so the route stays on ISR.
export async function queryForPrerender<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!isProductionBuild() || !isDatabaseConnectionError(error)) throw error;
    console.error(
      `Database unavailable during production prerender (${describeDatabaseError(error)}). This route will render on demand.`,
    );
    await deferPrerenderToRequest();
    throw error;
  }
}

async function deferPrerenderToRequest() {
  let connection: () => Promise<unknown>;
  try {
    ({ connection } = await import("next/server"));
  } catch (error) {
    console.error("Could not opt the route out of prerendering.", error);
    return;
  }
  try {
    await connection();
  } catch (bailout) {
    recordDeferredPrerender(routeFromDynamicBailout(bailout) ?? "unscoped");
    throw bailout;
  }
  recordDeferredPrerender("unscoped");
}
