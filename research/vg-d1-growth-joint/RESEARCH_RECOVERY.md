# RESEARCH RECOVERY — Priority 3: VGT + GDX, D1 + Growth in one shared $100,000 pool

## Top screen

- **Updated:** 2026-11-08T23:10Z (UTC, from the clock). **Status: INCOMPLETE — stage 1 (engine written; dry parity
  495/495 on D19/D21/D24; control manifest SEALED and committed; protocol not yet written).**
- **Brief:** `research/vg-d1-growth-joint/brief/BRIEF.md`, sha256
  `4554b859e71eda0cbb66ba8dc2c085ab38c208c6facff9fd8fb7c2a03513aac7` (the user's attachment, read in full: 210 lines,
  through Appendix A). The brief authorizes implementation, research, the CLAUDE.md delivery instruction, commit and
  push of the task branch without routine confirmation (no merge, no deploy, no force-push).
- **Branch:** `research/vg-d1-growth-joint`, created 2026-11-08T22:50Z in the main checkout from
  `research/vgt-d1-growth-separate-pooled` at `d61e6bea01a9b3f9fc38505256d6282fcd425d11`. Every prior research branch
  the brief names (Study 8, growth140-vgt-stable, growth-vgt-study8, vg-balanced-entry-eligibility, vgt-d1-growth-joint,
  separate-pooled) is an ancestor of that commit; nothing had to be merged.
- **Running processes:** none.
- **Sealed so far:** `CONTROL_MANIFEST.json` sha256 `0f40efd76aec8ec10a504fb2cf508891a572061df51db065363a910fb68adaa1`
  (2026-11-08T23:09:00Z; fixtures `fixtures/controls.json` sha256 `6659569e…dffa`). Frozen before any pooled result of
  a combined control existed. Appendix A identity `07cac3329fc7a520` (transcription mapping).
- **Engine status:** `src/vg-d1-growth-joint/` books/pool/evaluate/space/controls/parity/reference written; dry parity
  (cache `.cache/vg-d1-growth-joint/parity-dry/dry1-*.json`, not a study record) 495 checks, 0 failed, 65 s: VG #2
  native D24 = $260,223.13 / $17,280.74 / 36 lots (= Study 8 sealed); harmonized $268,487.02 / $20,801.07 / 45 lots
  (first entry 2016-12-19); Priority 2 sealed VGT combos reproduced to the cent. Synthetic tests 11/11.
- **Next step:** search/qualify/stages/post/main, protocol draft, adoption manifest, preflight, pilot (bench and
  interruption tests), then the protocol freeze commit.

## Environment

- Host apollo (AMD Ryzen 7 9800X3D, 8 cores / 16 threads, 59 GiB RAM visible, swap full from other workloads).
- Node v24.21.0 (`.node-version`).
- Canonical data (git-ignored): `data/VGT/data.csv` sha256 `2ee06310…412e` (= Priority 2's pin), `data/GDX/data.csv`
  sha256 `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049`. Both dataset reports: 2,723 sessions
  2016-01-04 → 2026-10-30, no missing session, last row 2026-10-30T23:59Z (after the close). No GDX split in
  `config/market-events/splits.json`; VGT 8:1 on 2026-04-21 (after development).

## Facts established so far (verified from files)

- VG #2 Balanced = `S8-VG-F24-3` (`config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`), books VGT
  `d1-bd80e32ee4` (23.5/0.9/7.4/15/78/4.4/11.0/55) and GDX `d1-7b99d2833d` (27.6/0.1/5.7/12/243/2.9/15.2/12); native
  F24 training centre (Study 8 `results/qualify/VG/F24/qualification.json` candidates[2]): net $260,223.13,
  DD $17,280.736920916825, 36 lots (GDX 32, VGT 4), 14 refusals, interest $30,860.27, costs $3,745.62, 25 wins;
  native arming 2017-06-15, same-minute ties alphabetical (GDX before VGT).
- Appendix A (GDX Growth, preview PV-3a29…/R-000040): no backend archive exists (no repository record; the Strategy
  Lab run folder R-000040 is absent and the trash is empty; the preview cache and the SQLite DB were NOT opened).
  It is mapped from the transcription to the Growth 1.4.0 schema; its known full-history target is compared only at
  the final validation stage (brief §3).

## Disclosures

- None yet.
