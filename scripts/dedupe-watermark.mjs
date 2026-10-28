// dedupe-watermark.mjs — compare collections against JailbreakHub and/or scan
// our own repo for watermark / junk differences. Two jobs in one script:
//
//   node scripts/dedupe-watermark.mjs                  # fetch JailbreakHub, report novel/identical/watermark-only
//   node scripts/dedupe-watermark.mjs --add            # copy the novel files into JailbreakHub-novel/
//   node scripts/dedupe-watermark.mjs --scan           # no fetch: list watermark/zero-width hits in this repo
//
// Byte-level sha256 after normalization, never name-based.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const HUB_TARBALL = "https://codeload.github.com/lalipa2003-arch/JailbreakHub/tar.gz/refs/heads/main";
const NOVEL_DIR = join(ROOT, "JailbreakHub-novel");

const decode = (b) => Buffer.from(b).toString("utf8");
const stripZW = (s) => s.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "");
const WATERMARK_RE = /(lali|jailbreakhub|github\.com\/[\w.-]+\/[\w.-]+|www\.youtube\.com\/|\.git\b)/i;
const stripWatermark = (s) => s.split(/\r?\n/).filter((l) => !WATERMARK_RE.test(l)).join("\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");

function walk(dir, base = "") {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base + e.name + "/"));
    else if (e.isFile() && /\.(md|txt)$/i.test(e.name) && base !== "scripts/") out.push({ path: base + e.name, file: p });
  }
  return out;
}

function buildLocalMaps() {
  const bySha = new Map();
  for (const f of walk(ROOT)) {
    const raw = decode(readFileSync(f.file));
    const s = sha(stripZW(raw));
    (bySha.get(s) || bySha.set(s, []).get(s)).push(f.path);
  }
  return bySha;
}

function fetchHub() {
  const tmp = join(tmpdir(), "9router-dedupe-hub");
  execSync(`rm -rf ${JSON.stringify(tmp)} && mkdir -p ${JSON.stringify(tmp)} && curl -sL ${HUB_TARBALL} | tar -xz -C ${JSON.stringify(tmp)} --strip-components=1`, { stdio: "pipe" });
  return tmp;
}

function dedupe() {
  const tmp = fetchHub();
  const localBySha = buildLocalMaps();
  const add = process.argv.includes("--add");
  const report = { hubFiles: 0, novel: [], identical: 0, watermarkOnly: [] };
  for (const h of walk(tmp)) {
    report.hubFiles++;
    const raw = decode(readFileSync(h.file));
    const s = sha(stripZW(raw));
    if (localBySha.has(s)) { report.identical++; continue; }
    if (localBySha.has(sha(stripWatermark(stripZW(raw))))) { report.watermarkOnly.push(h.path); continue; }
    report.novel.push(h);
  }
  if (add) {
    for (const h of report.novel) {
      mkdirSync(join(NOVEL_DIR, h.path.split("/").slice(0, -1).join("/")), { recursive: true });
      writeFileSync(join(NOVEL_DIR, h.path), readFileSync(h.file));
    }
    console.log(`copied ${report.novel.length} novel files → JailbreakHub-novel/`);
  }
  console.log(JSON.stringify({ hubFiles: report.hubFiles, novel: report.novel.length, identical: report.identical, watermarkOnly: report.watermarkOnly.length }));
  for (const p of report.novel.slice(0, 25)) console.log("  novel: " + p.path);
}

function scan() {
  const files = walk(ROOT);
  let zw = 0, wm = 0;
  for (const f of files) {
    const text = decode(readFileSync(f.file));
    const nZW = (text.match(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g) || []).length;
    const lines = text.split(/\r?\n/).filter((l) => WATERMARK_RE.test(l));
    if (nZW || lines.length) {
      console.log(`${f.path}: zero-width=${nZW} watermark-lines=${lines.length}${lines.length ? lines.slice(0, 3).map((l) => "\n    > " + l.trim().slice(0, 90)).join("") : ""}`);
      zw += !!nZW; wm += lines.length > 0;
    }
  }
  console.log(`scanned ${files.length} files; ${zw} with zero-width chars, ${wm} with watermark-like lines`);
}

if (process.argv.includes("--scan")) scan();
else dedupe();
