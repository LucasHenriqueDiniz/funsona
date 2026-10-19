// Run the slice 4 gate on drafts without the review requirement, so a draft can be checked while
// it is still being written or reviewed. apply.mjs still refuses anything not marked reviewed.
//
// Usage: node scripts/adsense-core/rewrite/check.mjs <draft.json> [...]

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { gate, words } from "./lib.mjs";

let failed = 0;
for (const file of process.argv.slice(2)) {
  const draft = JSON.parse(readFileSync(file, "utf8"));
  const errors = gate({ ...draft, reviewed: true });
  const lengths = (draft.outcomes ?? []).map((o) => words(o.description));
  const summary = `${(draft.questions ?? []).length} questions, ${lengths.length} outcomes (${Math.min(...lengths)}-${Math.max(...lengths)} words), reviewed=${draft.reviewed === true}`;
  if (errors.length) {
    failed += 1;
    console.log(`FAIL  ${basename(file)}  ${summary}`);
    for (const e of errors) console.log(`  - ${e}`);
  } else {
    console.log(`ok    ${basename(file)}  ${summary}`);
  }
}
process.exit(failed ? 1 : 0);
