import assert from "node:assert/strict";

import { computeAviationDataEnabled } from "../src/lib/aviation-data-flags";

// Explicit env var always wins.
assert.equal(computeAviationDataEnabled({ AVIATION_DATA_ENABLED: "true", NODE_ENV: "production" }), true);
assert.equal(computeAviationDataEnabled({ AVIATION_DATA_ENABLED: "false", NODE_ENV: "development" }), false);
assert.equal(computeAviationDataEnabled({ AVIATION_DATA_ENABLED: "1", NODE_ENV: "development" }), false, "only \"true\" enables it");

// Unset: on outside production, off in production.
assert.equal(computeAviationDataEnabled({ NODE_ENV: "development" }), true);
assert.equal(computeAviationDataEnabled({ NODE_ENV: "test" }), true);
assert.equal(computeAviationDataEnabled({ NODE_ENV: "production" }), false);

console.log("Aviation data flag tests passed");
