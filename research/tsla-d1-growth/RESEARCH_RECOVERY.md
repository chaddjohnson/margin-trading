# RESEARCH_RECOVERY — Priority 6: TSLA D1 + Growth (study `research/tsla-d1-growth/`)

## Top screen

- **Updated:** 2026-11-25T10:28Z (clock, UTC). **Status: INCOMPLETE — Phase 0A (Priority 5 archive preservation)
  starting.**
- **Brief:** `brief/BRIEF.md` sha256 `65c59cf0ae4a4a79f62bb966ebe8304e1a91dec3c7f8946c1ae9eab46069dceb` (270 newline-
  terminated lines + the final line; read in full, final section included).
- **Protocol:** not yet written (Phase 4). No optimization has run. No TSLA data imported.
- **Running:** nothing yet (the compression unit `tsla-p5-zstd` is the next step).
- **Next command:** launch `storage/tools/p5zstd.py compress` in a systemd user unit (see §Stages, 0A).

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree). Branch **`research/tsla-d1-growth`**, created
  2026-11-25T10:24Z from `dc023c3b78614d59ea951b9b87a019d7a72fa758` (Priority 5's final commit on
  `research/vg-l0-n-original-successor`; clean tree). `main` untouched.
- `.git/info/exclude` (local) hides `research/gpu-phase8/` and `research/vg-l0-staged-stop/` (Priority 4 branch
  caches). Never stage them.
- GPU acceptance at the base: `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`
  (gpu-phase7, binary `research/gpu-phase7/build/gb7` `cb2ff30b…`, device `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`);
  `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` **VERIFIED** 2026-11-25T10:23Z.
- Node 24 with `--no-maglev` (mandatory). Alpaca credentials: the git-ignored `.env` (variable names ALPACA_API_KEY,
  ALPACA_SECRET_KEY); never printed or logged.

## Stages

| Stage | Status | Record |
|---|---|---|
| 0 Recovery + inventory | complete 10:27Z | `storage/INVENTORY.json` (29 archives, 195,953,471,488 B, all complete, no sidecars/openers) |
| 0A P5 archive compression | not started | `storage/ACTIONS.jsonl`, tool `storage/tools/p5zstd.py` |
| 0A other-cache audit | not started | — |
| 2 TSLA data | not started | — |
| 3 Functionality audit | not started | — |
| 4 Protocol freeze | not started | — |
| 5 Engineering gates | not started | — |
| 6 Stages A–F | not started | — |

## Guards

- Priority 5 (`research/vg-l0-n-successor/`) is sealed: never edit its tracked files or rerun its stages. Only its
  git-ignored `cache/jobs/*/archive.sqlite` may be replaced by verified `.zst` copies (brief §0A).
- The other ≈ 22.6 GB of P5 caches are audited only; nothing there is deleted (brief §0A.7).
- No broker access, no deployment, no merge into `main`, no MSFT study.
