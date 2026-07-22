import assert from "node:assert/strict";

import { isCompatibleCommonsLicense, getCommonsImages } from "../src/lib/import-providers/wikimedia-commons";
import { WikidataImportProvider } from "../src/lib/import-providers/wikidata";

async function main() {

assert.equal(isCompatibleCommonsLicense("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"), true);
assert.equal(isCompatibleCommonsLicense("All rights reserved", "https://example.com/license"), false);

const commonsFetch = async () => new Response(JSON.stringify({ query: { pages: [{ title: "File:Test.jpg", imageinfo: [{ url: "https://upload.wikimedia.org/test.jpg", thumburl: "https://upload.wikimedia.org/thumb.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Test.jpg", extmetadata: { Artist: { value: "Test Creator" }, LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" }, Attribution: { value: "Test Creator / CC BY-SA 4.0" } } }] }] } }), { status: 200 });
const images = await getCommonsImages(["Test.jpg"], commonsFetch as typeof fetch);
assert.equal(images[0]?.compatible, true);
assert.equal(images[0]?.creator, "Test Creator");

const calls: string[] = [];
const providerFetch = async (input: string | URL | Request) => {
  const url = String(input); calls.push(url);
  const params = new URL(url).searchParams;
  if (params.get("action") === "wbsearchentities") return new Response(JSON.stringify({ search: [{ id: "Q1", label: "Test Airline", description: "airline", concepturi: "https://www.wikidata.org/wiki/Q1" }] }));
  if (url.includes("commons.wikimedia.org")) return commonsFetch();
  if (params.get("props") === "labels" && params.get("ids") !== "Q1") return new Response(JSON.stringify({ entities: { Q6256: { id: "Q6256", labels: { en: { value: "Test Country" } } } } }));
  return new Response(JSON.stringify({ entities: { Q1: { id: "Q1", labels: { en: { value: "Test Airline" } }, descriptions: { en: { value: "airline" } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q46970" } } } }], P229: [{ mainsnak: { datavalue: { value: "TA" } }, references: [{ snaks: { P854: [{ datavalue: { value: "https://example.com/register" } }] } }] }], P17: [{ mainsnak: { datavalue: { value: { id: "Q6256" } } } }], P18: [{ mainsnak: { datavalue: { value: "Test.jpg" } } }] } } } }));
};
const provider = new WikidataImportProvider(providerFetch as typeof fetch);
const search = await provider.search("Test", "airline");
assert.equal(search[0]?.sourceId, "Q1");
const preview = await provider.preview("Q1", "airline");
assert.equal(preview.title, "Test Airline");
assert.equal(preview.typeVerified, true);
assert.equal(preview.fields.find((field) => field.key === "IATA code")?.value, "TA");
assert.ok(preview.fields.find((field) => field.key === "IATA code")?.sourceUrls.includes("https://example.com/register"));
assert.equal(preview.images[0]?.compatible, true);
assert.ok(calls.some((url) => url.includes("wbsearchentities")));

await assert.rejects(() => provider.preview("invalid", "airline"), /Invalid Wikidata/);
console.log("Importer provider and licence tests passed");
}

void main();
