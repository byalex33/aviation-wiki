import assert from "node:assert/strict";

import { socialCardImageUrl, wikimediaThumbnail } from "../src/lib/wikimedia-thumbnail";

const base = "https://upload.wikimedia.org/wikipedia/commons";
assert.equal(
  wikimediaThumbnail(`${base}/9/9f/9V-SKA_%28Airbus_A380%29.jpg`, 500),
  `${base}/thumb/9/9f/9V-SKA_%28Airbus_A380%29.jpg/500px-9V-SKA_%28Airbus_A380%29.jpg`,
  "originals become thumbnails",
);
assert.equal(
  wikimediaThumbnail(`${base}/thumb/8/8c/Airbus_A220-300.jpg/1920px-Airbus_A220-300.jpg`, 500),
  `${base}/thumb/8/8c/Airbus_A220-300.jpg/500px-Airbus_A220-300.jpg`,
  "large thumbnails shrink",
);
const small = `${base}/thumb/8/8c/Airbus_A220-300.jpg/330px-Airbus_A220-300.jpg`;
assert.equal(wikimediaThumbnail(small, 500), small, "smaller thumbnails are kept");
for (const unchanged of [
  `${base}/a/a1/Diagram.svg`,
  `${base}/b/b2/Scan.tif`,
  "https://cdn.jetphotos.com/full/1/photo.jpg",
  "http://upload.wikimedia.org/wikipedia/commons/9/9f/Photo.jpg",
  "/local/photo.jpg",
]) assert.equal(wikimediaThumbnail(unchanged, 500), unchanged);

assert.equal(
  socialCardImageUrl(`${base}/9/9f/9V-SKA_%28Airbus_A380%29.jpg`),
  `${base}/thumb/9/9f/9V-SKA_%28Airbus_A380%29.jpg/1280px-9V-SKA_%28Airbus_A380%29.jpg`,
  "social cards use a 1280px thumbnail",
);
assert.equal(
  socialCardImageUrl(`${base}/thumb/8/8c/Airbus_A220-300.jpg/1920px-Airbus_A220-300.jpg`),
  `${base}/thumb/8/8c/Airbus_A220-300.jpg/1280px-Airbus_A220-300.jpg`,
  "larger social-card thumbnails shrink to 1280",
);
assert.equal(
  socialCardImageUrl("https://cdn.jetphotos.com/full/1/photo.jpg"),
  "https://cdn.jetphotos.com/full/1/photo.jpg",
);

console.log("Wikimedia thumbnail tests passed");
