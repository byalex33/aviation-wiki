import assert from "node:assert/strict";

import {
  classifySourceStatus,
  isPrivateAddress,
  requestSourceHeaders,
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



for (const address of ["::ffff:7f00:1", "::ffff:a9fe:a9fe", "::ffff:192.168.1.1", "100.64.0.1", "fec0::1", "100:0:0:1::1", "2001:2::1", "3fff::1", "5f00::1", "64:ff9b:1::a00:1", "not-an-ip"]) {
  assert.equal(isPrivateAddress(address), true, `block non-public address ${address}`);
}
assert.equal(isPrivateAddress("::ffff:808:808"), false);

async function testRequests() {
  let resolutions = 0;
  await requestSourceHeaders("https://source.example/article", "HEAD", {
    resolve: async () => { resolutions++; return [{ address: "8.8.8.8", family: 4 }]; },
    request: async (url, options) => {
      assert.equal(url.hostname, "source.example");
      assert.equal(options.method, "HEAD");
      assert.ok(options.lookup);
      options.lookup(url.hostname, { all: true }, (error, addresses) => {
        assert.equal(error, null);
        assert.deepEqual(addresses, [{ address: "8.8.8.8", family: 4 }]);
      });
      return { status: 200 };
    },
  });
  assert.equal(resolutions, 1, "transport reuses validated DNS addresses");
  let requests = 0;
  await assert.rejects(requestSourceHeaders("https://source.example", "HEAD", {
    resolve: async (host) => [{ address: host === "source.example" ? "8.8.8.8" : "::ffff:7f00:1", family: 6 }],
    request: async () => { requests++; return { status: 302, location: "http://private.example" }; },
  }), /public address/);
  assert.equal(requests, 1, "private redirect target is blocked before connection");
  await assert.rejects(requestSourceHeaders("https://source.example", "GET", {
    resolve: async () => [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }],
    request: async () => { throw new Error("must not connect"); },
  }), /public address/);
  console.log("Source health tests passed");
}
void testRequests().catch((error) => { console.error(error); process.exitCode = 1; });
