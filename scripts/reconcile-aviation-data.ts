import { resolveAviationConflict } from "../src/lib/aviation-data-reconciliation-db";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = {
  caseId: option("--case") ?? "",
  canonicalAssertionId: option("--canonical") ?? "",
  reviewer: option("--reviewer") ?? "",
  note: option("--note") ?? "",
};
if (Object.values(input).some((value) => !value.trim())) {
  throw new Error(
    "Usage: npm run data:reconcile -- --case <id> --canonical <assertion-id> --reviewer <id> --note <text> [--apply]",
  );
}

if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ dryRun: true, input }, null, 2));
  console.log("No data changed. Add --apply after reviewing the resolution.");
} else {
  console.log(JSON.stringify(await resolveAviationConflict(input), null, 2));
}
