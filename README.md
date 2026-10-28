# 9router-payloads

Jailbreak payload collections for [9router](https://github.com/decolua/9router) / Plinian fork — kept out of the app repo so it stays lean.

## Contents
- `AI-Jailbreaks/` — curated multi-AI jailbreak frameworks (NYX V4, Cronus, Bladwin 67, Potato, PERMABANXD Opus 4.8…)
- `BlackFriday-GPTs-Prompts/` — large GPT system-prompt collection (upstream bloom, kept for provenance)
- `JailbreakHub-novel/` — files fetched from [JailbreakHub](https://github.com/lalipa2003-arch/JailbreakHub) that were **byte-level novel** vs our collections (sha256 after zero-width-char strip; watermark-only variants skipped)
- `manifest.json` — sha256 + size + zero-width-char count per file; authoritative for `payloads:sync`
- `scripts/build-manifest.mjs` — regenerate the manifest after editing collections

## How the app consumes this
`9router` resolves payloads in this order (see `open-sse/payload/jailbreakPayloads.js`):
1. `9ROUTER_JAILBREAK_DIR` env override
2. `<dataDir>/payloads` when marked by `payloads:sync` (marker `.9router-jailbreak-dir`)
3. in-repo copy (npm tarball) / bundled fallback
4. sibling checkout: `git clone` this repo as a sibling folder of `9router` (`special/9router-payloads`)

Run inside the 9router app repo:
```
npm run payloads:sync   # verifies + installs into ~/.9router/payloads (offline-first, fail-open)
```

## Sync / update
1. Add or edit payload files here.
2. `node scripts/build-manifest.mjs`
3. Commit + push. App-side `payloads:sync` picks it up on next run.

Unlicense / red-team research collections; do not use for anything you wouldn't be able to explain to a judge.
