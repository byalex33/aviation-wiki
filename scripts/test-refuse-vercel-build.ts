import assert from "node:assert/strict";

import { runningOnVercel } from "./refuse-vercel-build";

assert.equal(runningOnVercel({ VERCEL: "1" }), true);
assert.equal(runningOnVercel({}), false);
assert.equal(runningOnVercel({ VERCEL: "0" }), false);

console.log("Vercel build guard tests passed");
