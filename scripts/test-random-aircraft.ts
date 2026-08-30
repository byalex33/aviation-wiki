import assert from "node:assert/strict";

import { pickRandomAircraft } from "../src/lib/random-aircraft";
import type { SearchDocument } from "../src/lib/search-types";

const document = (
  id: string,
  contentType: SearchDocument["contentType"],
): SearchDocument => ({
  id,
  title: id,
  slug: id,
  contentType,
  href: `/${contentType}/${id}`,
  description: "",
  countries: [],
  terms: [],
});

const documents = [
  document("airline", "airline"),
  document("first-aircraft", "aircraft"),
  document("second-aircraft", "aircraft"),
];

assert.equal(pickRandomAircraft(documents, () => 0)?.id, "first-aircraft");
assert.equal(pickRandomAircraft(documents, () => 0.999)?.id, "second-aircraft");
assert.equal(pickRandomAircraft([document("airport", "airport")]), null);

console.log("Random aircraft tests passed");
