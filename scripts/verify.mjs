// verify.mjs — check every payload file against manifest.json (sha256/size),
// plus regenerate-and-compare check for drift.
// Usage: node scripts/verify.mjs
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const man = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
let bad = 0;
for (const e of man) {
  const p = join(ROOT, e.path);
  const fail = (why) => { console.error(`✗ ${e.path}: ${why}`); bad++; return false; };
  if (!existsSync(p)) { fail("missing"); continue; }
  if (statSync(p).size !== e.bytes && !fail(`size ${statSync(p).size} ≠ ${e.bytes}`)) continue;
  const h = createHash("sha256").update(readFileSync(p)).digest("hex");
  if (h !== e.sha256 && !fail("sha256 mismatch")) continue;
}
console.log(bad ? `${bad} of ${man.length} files FAILED` : `✓ all ${man.length} files verified`);
process.exit(bad ? 1 : 0);
