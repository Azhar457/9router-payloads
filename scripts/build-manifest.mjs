// Generate manifest.json for the payload collections: sha256 + size +
// zero-width-char counts per file. Output: manifest.json (array of entries).
// Usage: node scripts/build-manifest.mjs   (from the payloads repo root)
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const FILES = [];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && !FILES.includes(p)) FILES.push(p);
  }
}
walk(ROOT);

// Skip script/manifest itself if run from scripts/
const entries = [];
for (const f of FILES) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (rel.startsWith(".git/") || rel === "manifest.json" || rel.startsWith("scripts/")) continue;
  const buf = readFileSync(f);
  // Zero-width chars: U+200B/200C/200D/2060 + BOM/FEFF + soft hyphen
  const text = buf.toString("utf8");
  const zw = (text.match(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g) || []).length;
  const count = (re) => (text.match(re) || []).length;
  entries.push({
    path: rel,
    bytes: statSync(f).size,
    sha256: createHash("sha256").update(buf).digest("hex"),
    zeroWidth: zw,
    lines: count(/\r?\n/g) + (text.length ? 1 : 0),
  });
}
entries.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(ROOT, "manifest.json"), JSON.stringify(entries, null, 2) + "\n");
const totalZw = entries.reduce((s, e) => s + e.zeroWidth, 0);
console.log(`${entries.length} files, ${(entries.reduce((s, e) => s + e.bytes, 0) / 1e6).toFixed(1)} MB, zero-width chars: ${totalZw}`);
