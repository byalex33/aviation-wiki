import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { EditAndApproveLink } from "../src/components/edit-and-approve-link";
import { canModerateRevision, revisionTransitions } from "../src/lib/revision-transitions";

const admin = renderToStaticMarkup(<EditAndApproveLink revisionId="4793800e-c7fe-4abd-a3f2-71df9d2e0283" area="admin" />);
assert.match(admin, /href="\/admin\/moderation\/4793800e-c7fe-4abd-a3f2-71df9d2e0283\/edit"/);
assert.match(admin, />Edit and approve</);
const pub = renderToStaticMarkup(<EditAndApproveLink revisionId="c186aa56-cf11-4917-a3d8-fdec6238ecca" area="public" />);
assert.match(pub, /href="\/moderation\/c186aa56-cf11-4917-a3d8-fdec6238ecca\/edit"/);
assert.equal(canModerateRevision("changes_requested", "reject"), true);
assert.equal(canModerateRevision("changes_requested", "approve"), false);
assert.equal(canModerateRevision("pending_review", "approve"), true);
assert.ok(revisionTransitions.changes_requested.includes("rejected"));
assert.equal(revisionTransitions.changes_requested.includes("approved"), false);
console.log("Moderation link and decision rules passed.");
