import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

async function main() {

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "aviation-wiki-import-test-"));
process.env.AVIATION_WIKI_DB_PATH = path.join(temporaryDirectory, "test.db");
const { createImportedDraft, getArticleById } = await import("../src/lib/wiki-db");

const field = { id: "P229", key: "IATA code", value: "ZZ", verified: true, sourceUrls: ["https://www.wikidata.org/wiki/Q900001"], sourceLabel: "Wikidata Q900001, P229" };
const first = createImportedDraft({ provider: "wikidata", sourceIdentifier: "Q900001", title: "Importer Collision Test Airline", contentType: "airline", fields: [field], images: [], actorId: "admin-test", actorName: "Admin Test" });
assert.equal(first.status, "draft", "imports must remain normal private drafts");
assert.equal(getArticleById(first.articleId)?.liveRevisionId, null, "an imported draft must never become live automatically");

assert.throws(() => createImportedDraft({ provider: "wikidata", sourceIdentifier: "Q900001", title: "Different Entity", contentType: "airline", fields: [field], images: [], actorId: "admin-test", actorName: "Admin Test" }), /already linked/);
assert.throws(() => createImportedDraft({ provider: "wikidata", sourceIdentifier: "Q900002", title: "Importer Duplicate Identifier Airline", contentType: "airline", fields: [{ ...field, sourceUrls: ["https://www.wikidata.org/wiki/Q900002"] }], images: [], actorId: "admin-test", actorName: "Admin Test" }), /already belongs/);
assert.throws(() => createImportedDraft({ provider: "wikidata", sourceIdentifier: "Q900003", title: "Importer Collision Test Airline", contentType: "airline", fields: [{ ...field, value: "ZY", sourceUrls: ["https://www.wikidata.org/wiki/Q900003"] }], images: [], actorId: "admin-test", actorName: "Admin Test" }), /matching article already exists/);

console.log("Import duplicate, identifier collision, and draft-only tests passed");
}

void main();
