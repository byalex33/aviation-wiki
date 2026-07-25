import assert from "node:assert/strict";

import { isStaffRole } from "../src/lib/wiki-roles";

assert.equal(isStaffRole("contributor"), false);
assert.equal(isStaffRole("trusted_contributor"), false);
assert.equal(isStaffRole("moderator"), true);
assert.equal(isStaffRole("admin"), true);

console.log("Staff role tests passed");
