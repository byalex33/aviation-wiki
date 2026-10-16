import assert from "node:assert/strict";

import { formActionError } from "../src/lib/form-action-state";
import { emptyIfUndefinedTable, isPostgresUndefinedTable } from "../src/lib/postgres-errors";
import { runPublishedFollowUp } from "../src/lib/published-follow-up";
import { UserFacingError } from "../src/lib/user-facing-error";

const originalError = console.error;
const originalWarn = console.warn;
const errors: unknown[][] = [];
const warnings: unknown[][] = [];
console.error = (...args: unknown[]) => {
  errors.push(args);
};
console.warn = (...args: unknown[]) => {
  warnings.push(args);
};

async function main() {
  const unexpected = new Error("relation \"article_watch_alerts\" does not exist");
  assert.deepEqual(formActionError(unexpected), {
    error: "The request could not be completed. Please try again.",
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], "Form action failed");
  assert.equal(errors[0][1], unexpected);

  errors.length = 0;
  assert.deepEqual(formActionError(new UserFacingError("Too many submission attempts. Wait a few minutes and try again.")), {
    error: "Too many submission attempts. Wait a few minutes and try again.",
  });
  assert.equal(errors.length, 0);

  let ran = false;
  await runPublishedFollowUp("follow-up failed", async () => {
    ran = true;
  });
  assert.equal(ran, true);
  assert.equal(errors.length, 0);

  const followUpError = new Error("watch alerts unavailable");
  await runPublishedFollowUp("Staff publish notification failed after the revision was published", async () => {
    throw followUpError;
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], "Staff publish notification failed after the revision was published");
  assert.equal(errors[0][1], followUpError);

  const missingTable = Object.assign(new Error("relation does not exist"), { code: "42P01" });
  assert.equal(isPostgresUndefinedTable(missingTable), true);
  assert.equal(isPostgresUndefinedTable(new Error("other")), false);
  assert.deepEqual(await emptyIfUndefinedTable(async () => [{ user_id: "watcher" }], "missing"), [{ user_id: "watcher" }]);
  assert.equal(warnings.length, 0);
  assert.deepEqual(
    await emptyIfUndefinedTable(async () => {
      throw missingTable;
    }, "article_watch_alerts is not present"),
    [],
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "article_watch_alerts is not present");
  await assert.rejects(
    emptyIfUndefinedTable(async () => {
      throw new Error("connection refused");
    }, "missing"),
    /connection refused/,
  );
}

void main()
  .catch((error) => {
    process.exitCode = 1;
    originalError(error);
  })
  .finally(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
