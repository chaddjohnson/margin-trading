# Audit: research date boundaries and continuously updated canonical data (2026-11-27, before any change)

Read-only audit of branch `research/gdx-d1-growth` at `03f3500c` (the task branch `feature/research-date-boundaries`
starts there). Every figure was read from the files named; hashes were recomputed with `sha256sum` on 2026-11-27.

## 1. Actual pre-update coverage

| Symbol | File | Bytes | Rows | sha256 | First row (UTC) | Last row (UTC) | Last complete session |
|---|---|---:|---:|---|---|---|---|
| VGT | `data/VGT/data.csv` | 53,395,054 | 935,608 | `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` | 2016-01-04T13:00Z | 2026-10-30T23:59Z | **2026-10-30** |
| GDX | `data/GDX/data.csv` | 80,036,100 | 1,490,494 | `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049` | 2016-01-04T11:15Z | 2026-10-30T23:59Z | **2026-10-30** |

- Both equal their `data/<SYMBOL>/dataset-report.json` (`verify`, 2026-11-02): 2,723 sessions 2016-01-04 → 2026-10-30,
  0 missing sessions, 0 malformed / out-of-order / duplicate rows. VGT's file mtime is 2026-11-06, but its bytes are
  unchanged.
- **The data end on 2026-10-30, not 2026-10-23.** 2026-10-23 is the entry date of N/original's (and New L0's) last D1·GDX
  lot, which is still open at 2026-10-30. That is probably where the earlier date came from.
- History of the files: the 2026-10-24 migration (end 2026-10-13); a 2026-10-30 append of the B5 five (VGT/GDX through
  2026-10-29, Study 8's pins); Study 9's refresh on 2026-11-02 (`npm run datasets -- append`, one session, 2026-10-30;
  increments and run records in `data/vintages/study9-refresh-2026-11-02/`). Each step was a pure append: Study 9 verified
  that every prior-length prefix hashes to the prior file.
- Alpaca reads a date-only `end` as 00:00Z of that date (Study 9's `DATA_MANIFEST.md`). In EST, 2026-11-25's extended
  session ends at 01:00Z on 2026-11-26, so a download through that session needs `end = 2026-11-27`. Thanksgiving
  (2026-11-26) has no bars, and 2026-11-27's pre-market starts at 09:00Z. 2026-11-26 is a holiday and 2026-11-27 an early
  close in `src/lib/calendar.ts`, whose coverage ends 2026-12-31.

## 2. Existing optimization and validation date ranges

| Source | Development | Validation | Endpoint | How it is fixed |
|---|---|---|---|---|
| Standard 3.0.0 §0.3/§1 | 2016-01-04 → 2024-12-31 | 2025-01-01 → "the study's **common complete endpoint**" | defined as the latest date with a complete session in every traded file (verified "from the files, never assumed") | text only; the preflight checks `validation.to === commonCompleteEndpoint` (declared strings) and the fixed `rules.developmentEndMax 2024-12-31` / `validationStartMin 2025-01-01` |
| All 31 `research/*/STANDARD_ADOPTION.json` | 2016-01-04 → 2024-12-31 | 2025-01-01 → 2026-10-30 | 2026-10-30 | declared per study |
| Priority 3's shared doors (`src/vg-d1-growth-joint/context.ts`), used by every VG/L0 study, the GPU path and Strategy Lab | D19/D21/D23/D24 byte-prefix copies | FULL 2016-01-04 → `validationEnd: '2026-10-30'` | constant | constant + whole-file sha256 pin |
| N/original's study (`research/vg-l0-full-joint/PROTOCOL.md` §102–113) | 2016-01-04 → 2024-12-31 (folds C19/C21/C23/C24) | 2025-01-02 → 2026-10-30 | 2026-10-30 | constant (`src/vg-l0-full-joint/context.ts`) |
| `data/partitions.json` (legacy partitions, older strategy runners) | `training` 2016-01-01 → 2023-12-31 (the only partition `access: 'optimization'` accepts) | `holdout` 2024-01-01 → 2025-10-16 | `final` 2025-10-17 → **null (the last row)**; `all` unbounded | file |

The brief's provisional ranges (optimization 2016-01-04 → 2024-12-31, validation 2025-01-02 → 2026-10-30) agree with the
standard and every adopting study. 2025-01-01 is a holiday, so "from 2025-01-01" and "from 2025-01-02" select the same
sessions. **There is no discrepancy, and 2026-10-30 is the established, examined validation endpoint.**

## 3. Is formal validation explicitly bounded? Dynamic endpoints found

- **Formal validation is bounded per study, not centrally.** Each study hard-codes its endpoint (2026-10-30), and its
  validation door loads with that end date. There is no shared, authoritative definition, and the standard's own
  definition is dynamic: a new study adopted after an append would, by §0.3, take the newer file end as its endpoint.
- Endpoints derived from the data:
  - `partitions.json` `final.end = null` and `all`: a `final`/`all` run without an end date extends to the new last
    row. This is intended for manual runs.
  - The multi-symbol runners:
    - Study 8/9b: the latest common **complete** session (`src/study8-runners/data.ts` `tailStatus`/`latestCommonSession`).
    - Study 7: the earliest last bar date, with no completeness check.
    - The N-book universe, pools `--dataset all` and the allocator `--dataset all`: the file ends, aligned calendars
      required.
  - Calendar-year buckets (`${year}-12-31`) in several reports grow on unbounded runs.
- No formal validation workflow derives its end from the file end; all use a fixed constant. Fixed constants with
  appended data fail closed rather than silently extend (below).

## 4. What an append would do today (without changes)

**Fail (throw) — whole-file sha256 pins:**

- **Priority 3's FULL door** (`src/vg-d1-growth-joint/data.ts` `openFullDoor` and `buildDoors`). It is the validation
  door of every VG/L0 study and the GPU path (`src/gpu-backend/doors.ts` `openStudyDoor('FULL')`, the official
  preflight). It also serves N/original's replay tools (`tools/vg-l0-risk-metrics/baseline.ts`, `vg-l0ns-diag`) and
  Strategy Lab's Portfolios tab (`apps/strategy-lab/runner/portfolio-run.ts`) with its parity test
  (`apps/strategy-lab/tests/portfolio-parity.test.ts`, a hard failure).
- npm tests that open FULL: `tsla-d1-growth`, `vg-l0-n-successor`, `vgt-d1-growth-separate-pooled` followup,
  `vg-l0-risk-envelope-stage-b`, `gdx-d1-growth`, `vg-l0-risk-envelope-pilot`.
- Completed studies with their own whole-file pins: `vgt-d1-growth-joint` (FULL and door builder), `growth140-vgt-s8m`
  / `-stable`, `vg-balanced-entry-eligibility`, `intraday-d1` (validation door), `growth-etf-screening` (door builder and
  inventory rules), `tools/gdx-d1-growth/data.ts pins`.
- `src/growth-etf-screening/universe.ts` rule D2 requires `dataset-report.json` status `verified`. An append writes
  `appended`, so a later `datasets verify` restores it.

**Skip silently (coverage lost, no failure):** `src/growth-trading/tests/offParity*.test.ts` skip when the file's
whole-file hash differs from the fixture's, although every case has an explicit end ≤ 2026-10-30.

**Already stale before this append (unchanged by it):**

- B5/pools anchors and the B4/B5 regression tests (pins of the 2026-10-13 files).
- The Study 7 runner test (its sealed end is 2026-10-29; it has failed since 2026-11-02).
- The `lastCommonSession '2026-10-13'` checks of d1-robust, d1-diverse and portfolio-aware-d1.

**Keep passing — byte-prefix / bounded mechanisms already in the repository:**

- Priority 3's D19–D24 copies, verified by size, sha256 and last row.
- `gdx-d1-growth` (FULL is a physical prefix copy, `capUtc 2026-10-31T04:00Z`) and the `intraday-d1` development door.
- `growth140-vgt-s8m` `sha256Prefix`; Study 9/9b `prefixHash` ("appending later bars changes no id and no cache key").
- Study 8 runners: `study8PinnedBytes` / "appended" status.
- Study 6/7 prefix-versus-pin checks; Study 4 and Study 3-1c stop the read at the bound before tokenizing.

No shared byte-prefix verifier exists: each study re-implements one.

**Recorded hashes change silently:** `loadDatasetSessions` records the whole-file sha256 as `report.dataSha256`, even when
an end date bounds the window. It feeds `ds.id`/`ds.dataHash` in several loaders, Priority 3's FULL door, the GPU
dataset-cache sidecar (`DATASET_CACHE_CONFLICT` on a different hash) and the host door digest. So FULL must keep its
historical hash for GPU-cache and identity compatibility.

## 5. Reproducibility of existing research after an append

- Sealed records and archives are not read from `data/` and do not change.
- The legacy archive (`data/archive/legacy-research-inputs/`), the vintages under `data/vintages/` and every prefix-door
  copy are separate files and do not change.
- **Every historical input is recoverable exactly:** an append leaves the old file as a byte prefix of the new one, so the
  first N bytes reproduce it and hash to its pin.
- What breaks is the *verification method* of the whole-file pins (§4), not the inputs.

## 6. GPU acceptance and integrity records

- `config/gpu-backend/acceptance.json` (ACCEPTED 2026-11-22) and the compatibility manifest hash **no data file**, so an
  append alone does not make the acceptance stale.
- But FULL refuses after an append, so official GPU validation on FULL and any parity mini-set on FULL are blocked.
  They fail closed.
- The CPU closure of the evaluation digest includes `src/lib/{csv,dataset,evaluation,partitions,calendar,session,...}.ts`
  and `src/vg-d1-growth-joint/{data,context}.ts`. `src/vg-d1-growth-joint/` is also a registered legacy runner whose
  directory digest the entrypoint audit enforces (`config/gpu-backend/entrypoints.json`). The research preflight is in
  the policy group.
- **Any repair of the FULL door's verification, or any change to the shared loaders, makes the acceptance STALE.** It
  needs a §2 re-acceptance on Apollo (new binary, because the digest is compiled in, plus the parity campaign) before it
  is merged or used for official research.
- The binary's digest is enforced only by the official gate, so non-official parity tests can still run on the accepted
  binary.

## 7. Strategy Lab

- **Stale cache: none.**
  - Chart prices reload on a size/mtime change.
  - Preview cache keys hash every file under `data/<SYMBOL>/`, `splits.json`, `partitions.json` and the code.
  - Saved runs are never reused.
  - Portfolio replay identities include data fingerprints, the window and the code fingerprint.
  - `GET /api/portfolio-replays/PR-…` serves a replay by its content-addressed id (by construction the result of that
    identity).
- **Single-symbol manual runs** (Run Test, Interactive Preview) already support custom start/end dates and presets
  (Training/Holdout/Final/**All**). "All" ends at the latest last session of the selected symbols. Runners use partition
  `all` with the chosen end, and the effective first/last session is recorded in each run's provenance. Multi-symbol
  Growth runs are independent per symbol (no shared capital, so no stale-price cross-simulation), each ending at its own
  file end.
- **The UI shows the requested window**, not the effective one (which is in the provenance).
- A run whose requested end lay beyond the file end at the time would chart appended prices beyond the dates it
  evaluated.
- **Portfolios tab:** fixed benchmark window 2016-01-04 → 2026-10-30 through Priority 3's FULL door (documented as fixed;
  "if the canonical VGT or GDX file changes, the FULL door refuses"). There is no full-data or custom range for pooled
  portfolios, and N/original is not in its catalog.

## 8. N/original

- Defined only in Assignment 3's sealed `research/vg-l0-full-joint/FROZEN_SELECTION.json` (`4080d4b1…`).
  - Label `C24/informed/GD.VB/R2#1 profit`, id `rc1-f1a8b57cb02455c3`, cell GD1.VB0.
  - Book pair: D1·GDX and D1·VGT with RC 2 controls, plus Growth·VGT. Growth·GDX is off.
  - Shadow eligibility off.
- Loaded with its identity checked by `src/vg-l0-n-successor/incumbents.ts` `references().NORIG`.
- Evaluated by the risk-metrics replay (`src/vg-l0-risk-metrics/engine.ts` `replay`/`toLedger`) on Priority 3's
  doors.
- Execution assumptions: one exclusive $100,000 slot; same-instant D1 first, then GDX before VGT; 5 bps per side in the
  fills; 11% simple interest by calendar day (365-day year); stops fill at the stop or a gapped open; fractional
  shares; the strict minute drawdown tracker of marked net.
- Sealed figures on FULL (2016-01-04 → 2026-10-30):
  - net $482,700.73, DD $20,385.99, 44 lots;
  - development $388,031.02 / $19,459.83 / 32 lots;
  - 2025–2026 $94,669.70 (reset DD $20,385.99);
  - realized $488,265.48, unrealized −$5,564.76 (the open D1·GDX lot of 2026-10-23);
  - interest $72,509.59, costs $4,630.40.
- Reproduced in `vg-l0-risk-metrics` (G0), `vg-l0-n-successor` (GPU) and `gdx-d1-growth` (GPU = CPU).
- **It cannot be run past 2026-10-30 by any existing command.**

## 9. CPU and GPU paths

- The GPU evaluator receives the `Door` arrays built by the same CPU loader (`openPrefixDoor`/`openFullDoor` →
  `exportDataset`), so the data boundary is identical by construction.
- The CPU reference and the GPU both read FULL through `openFullDoor`.
- No separate GPU data loader exists.

## 10. Conclusions that shape the implementation

1. The endpoints are fixed in practice. They are not shared, and the standard defines the endpoint dynamically. Two
   gaps need closing: a single authoritative definition of the research ranges, and a standard rule that appended data
   never move them.
2. The only real breakage of an append is the whole-file verification of FULL, which every current consumer shares. The
   smallest robust fix verifies FULL as a pinned byte prefix and reads only those bytes, keeping its recorded hash
   (and so every id, cache key and GPU dataset identity) unchanged. That is one place in Priority 3's loader plus an
   opt-in byte bound in the shared CSV loader.
3. The GPU acceptance consequence of (2) is unavoidable and must be disclosed. Without it, FULL is unusable on both
   paths after the append.
4. Completed studies with their own whole-file pins are frozen. They fail closed and stay exactly reproducible from the
   verified byte prefix: a verification tool and the recorded vintages, not code changes.
5. N/original needs a manual, non-official full-history replay on a door that ends at the latest common complete
   session, reporting the research window and the post-validation period separately.
