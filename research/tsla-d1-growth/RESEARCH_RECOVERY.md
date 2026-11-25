# RESEARCH_RECOVERY — Priority 6: TSLA D1 + Growth (study `research/tsla-d1-growth/`)

## Top screen

- **Updated:** 2026-11-25T11:20Z (clock, UTC). **Status: INCOMPLETE — Phase 0A and the TSLA data are complete; the
  engineering gates and the pilot are next (pre-freeze).**
- **Brief:** `brief/BRIEF.md` sha256 `65c59cf0ae4a4a79f62bb966ebe8304e1a91dec3c7f8946c1ae9eab46069dceb` (read in full).
- **Protocol:** not yet written/frozen. No official optimization has run.
- **Running:** nothing.
- **Next:** debug the GPU path with the engineering tool on small sets; then run gates E1–E9 under the final code; write
  PROTOCOL.md / STANDARD_ADOPTION.json; preflight; freeze; chain.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/tsla-d1-growth`** (from `dc023c3b`, Priority 5's
  final commit). Latest commit `9bfcafad`. `main` untouched. `.git/info/exclude` hides `research/gpu-phase8/`,
  `research/vg-l0-staged-stop/` (never stage).
- GPU acceptance `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` VERIFIED 10:23Z (rebuild + device).
- Node 24, `--no-maglev`. Alpaca credentials: git-ignored `.env` (never printed).
- Study cache `research/tsla-d1-growth/cache/` and `logs/` are git-ignored (`research/tsla-d1-growth/.gitignore`).

## Stages

| Stage | Status | Record |
|---|---|---|
| 0 Recovery + inventory | complete 10:27Z | `storage/INVENTORY.json` (commit `3be39b65`) |
| 0A P5 archive compression | **complete** 11:07Z | `storage/ACTIONS.jsonl`, `storage/POST_VERIFY.json` (29/29 OK; 195,953,471,488 → 16,148,379,429 B; 179.8 GB recovered). One conservative blocker (C24-qualify-informed: copied incumbent rows) fixed in the tool (exclude `stage: incumbent` copies) and rerun — disclosed |
| 0A other-cache audit | not started | — |
| 2 TSLA data | **complete** 11:19Z | `data/TSLA/data.csv` sha256 `8ed7f7d0…` (1,975,254 rows, 2016-01-04T09:00Z → 2026-10-30T23:59Z); `data/DOOR_PINS.json` `193fc206…`; `data/TSLA-splits.json` `e96d6236…`; `TSLA_DATA_AUDIT.json` (no blockers); `reports/data/SUITABILITY.json` (D24 only) |
| 3 Functionality audit | not written | (findings: open-ended Growth = exits hold_off + istop off has no loss exit; S1 absent; session hold, swing, breakeven refused) |
| 4 Protocol freeze | not started | — |
| 5 Engineering gates | not started | tools `tools/tsla-d1-growth/engineering.ts` |
| 6 Stages A–F | not started | chain to be written |

## Key design (on disk in code; to be written into PROTOCOL.md)

- Slot binding: both engine slots = one TSLA SymDoor; D1·VGT = D1·TSLA, G:VGT = Growth·TSLA; GDX books disabled. No
  evaluation-manifest file changed → acceptance valid.
- Arms D/G/C/J/S; cells D 8, G 6 (exits × istop), J 48, S frozen-D1 × 6; lane derived from P5's (`src/tsla-d1-growth/derive.ts`).
- TSLA split ledger kept in the study (central `config/market-events/splits.json` is sha-pinned by frozen studies) —
  a user decision to record.

## Guards

- Priority 5 sealed: never edit tracked files or rerun. Its `.zst` archives + `storage/ACTIONS.jsonl` are the restore
  source (`zstd -d -q <arc>.zst -o <arc>`, sha256 in ACTIONS).
- Other P5 caches (≈ 22.6 GB): audit only, no deletion.
- No broker, deployment, merge into `main`, MSFT.
