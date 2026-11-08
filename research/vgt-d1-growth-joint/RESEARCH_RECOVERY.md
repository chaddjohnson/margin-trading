# RESEARCH_RECOVERY — vgt-d1-growth-joint (Priority 2: joint D1 + Growth, VGT, one shared pool)

## Top screen

- **Updated:** 2026-11-08T13:14Z (UTC, from `date -u`)
- **Status: COMPLETE.**
  - Every stage is sealed and committed, including the one-time validation, the report and the tests.
  - The follow-up gate is the user's (and ChatGPT's) **Priority 2 review** (`REPORT.md`, last section).
  - **Priority 3 (VGT + GDX) is not started** and needs approval.
- **Authority:**
  - `PROTOCOL.md` **frozen**: sha256 `7a680692…cc74` (`results/protocol-freeze.json` `d19bbe07…`); evaluation digest
    `c936f691…`; closure digest `65de4cc4…` (217 files).
  - `AMENDMENTS.md` head **R5** (all before the freeze).
  - Brief sha256 `b6dc8758…a2a88fb`.
- **Running:** nothing. The chain unit ended `CHAIN-DONE` 13:02:30Z, the validation at 13:03Z, the test unit at
  about 13:10Z.
- **Next command:** none. Await the review. Do not rerun anything.
- **Verification at closing:** every sealed record's sha256 was recomputed against `results/seals.jsonl`
  (0 mismatches).

## Sealed records (sha256 recomputed at closing)

| Record | sha256 | Committed |
|---|---|---|
| `results/parity/parity-3.json` (frozen code's parity, 341/341) | `c61415c96db0…` | `3bc7856` |
| C19 search / selection / evaluation | `bce8c7bf9f04…` / `9d6a4d1ffe34…` / `2bdd6cc7f20f…` | `a5ad22ad` (selection before its slice) |
| C21 search / selection / evaluation | `e716ad446187…` / `217effeb93de…` / `f9eaf98f1f23…` | `eda1578a` |
| C23 search / selection / evaluation | `70bb81af58de…` / `5fa09d0ba093…` / `7249f2dbd2f6…` | `72c13b56` |
| `results/folds/sequential.json` | `d86d362d2cca…` | `ad6edb44` |
| C24 search / selection / `results/diagnostics/D24/diagnostics.json` | `7d3d081c5bac…` / `d04570f65dad…` / `813c09d76a23…` | `00be6975` |
| `FROZEN_SELECTION.json` | `e677e8947383…` | `3ed30ff0` (before validation) |
| `results/validation/validation.json` | `573c84a30e45…` | the final commit |

## Results (details in REPORT.md)

- **C24 primary:** `C24/informed#1 top` (A, D1-first; D1 242/6/80/15/72/44/109/55; Growth trend breakout + ATR stop +
  classic_d1 continuation).
  - **Development:** $169,722.07 / DD $23,023.18.
  - **Validation:** +$22,251.64 / DD $27,145.72.
  - **Whole run:** $191,973.71 / DD $27,941.87.
  - **Tests:** V1–V3 pass.
- **Chronology:** the joint procedure 2020–2024 made −$1,691.64 with a sequential DD of $64,570.38 → **chronologically
  unsupported**.
- **Best fixed combination** (D1 primary + #4 · A):
  - development $204,940.21 / $19,534.41;
  - validation +$66,585.12;
  - whole run $271,525.33 / $19,534.41.
- **Full `npm test`:** 1,274 tests, 1,263 pass, the 7 known failures, 4 skipped. **Study tests:** 19/19. **tsc:**
  clean. **ESLint:** 0 errors.

## Environment

- **Checkout:** the main checkout, branch `research/vgt-d1-growth-joint` (from `846594c`); no extra worktree.
- **Working tree:** this study's files plus the `package.json` script line `vgt-joint`.
- **Runtime:** Node v24.21.0. Data: `data/VGT/data.csv` sha256 `2ee06310…412e`.
- **Containment:** `vgtjoint.slice` with MemoryHigh 44 GiB, MemoryMax 48 GiB, swap 0.
- **Job archives** (regenerable, git-ignored): `.cache/vgt-d1-growth-joint/` (≈ 3.5 GB).

## Guards

- **Do not rerun:** every stage refuses once sealed. The validation opened FULL once. Never edit a sealed record or
  the frozen protocol.
- **Push (done):** asked once at the end; the user chose commit and push. Branch `research/vgt-d1-growth-joint` was
  pushed to origin at `0d1dfb71` (2026-11-08, confirmed with `git ls-remote`); no merge into main. This record is a
  follow-up commit, pushed the same way.

## Disclosures (also in REPORT.md §9)

- Before the freeze:
  - R1/R5: parity was re-sealed twice (engine speed-up, formatting).
  - R2: the island budget was set from the pilot bench (768 proposals).
  - R3: a debug dry run hit an engine guard.
  - R4: the pilot's validation path.
- The pilot printed pilot-budget fold figures; no rule changed because of them.
- The FULL door opened before the freeze only for the Growth controls' known targets.
- The informed seeds carry known 2025–2026 outcomes, and the C24 primary is from that lane.
