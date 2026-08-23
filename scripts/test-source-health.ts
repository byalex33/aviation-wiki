import assert from "node:assert/strict";

import {
  classifySourceStatus,
  isPrivateAddress,
} from "../src/lib/source-health";

assert.equal(isPrivateAddress("127.0.0.1"), true);
assert.equal(isPrivateAddress("10.0.0.1"), true);
assert.equal(isPrivateAddress("192.168.1.1"), true);
assert.equal(isPrivateAddress("8.8.8.8"), false);
assert.equal(isPrivateAddress("::1"), true);
assert.equal(classifySourceStatus(200), "ok");
assert.equal(classifySourceStatus(301), "ok");
assert.equal(classifySourceStatus(404), "broken");
assert.equal(classifySourceStatus(410), "broken");
assert.equal(classifySourceStatus(429), "unchecked");

console.log("Source health tests passed");
