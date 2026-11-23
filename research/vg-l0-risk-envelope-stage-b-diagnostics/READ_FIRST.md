# READ FIRST — Stage B final diagnostics: search-archive census and profit-giveback decomposition (RES-BD 1.0.0)

**Status: COMPLETE.** These are the two report-only diagnostics that sealed Stage B deferred (its AMENDMENTS D1): the
complete search-archive census and the profit-giveback replay, for C19, C21 and C24. They are a **post hoc
supplement**, not official Stage B evidence.
- **No new genetic optimization or candidate search was performed.** There was no GPU evaluation, and the census and
  qualification replays made **zero new evaluations**.
- The only evaluations were bounded, non-official CPU reference replays of 199 fixed sealed subjects. Each equals the
  official GPU record to the cent and bit for bit.
- Stage B's sealed verdict (**P3 non-inferior and superior** on paired training profit at C21 / C24), its recommendation
  (**do not adopt P3**), every frozen strategy and the optimization method are **unchanged**.

## Headline findings

1. **P3's selections mostly give back more profit; they do not lose more capital, at the centre.**
   - **Size.** Their extra conventional marked DD is +$1.9k / +$1.6k / +$3.0k (C19 / C21 / C24, 32 paired lanes each).
   - **Composition.** 92 % / 78 % / 72 % of it is unbanked giveback of open profit. The rest is banked-profit erosion,
     with every interval including 0. Starting-capital loss is zero.
   - **Unchanged at the centre:** trade principal loss and banked-capital DD.
2. **But not at the neighbourhood, where P0 actually rejected them.**
   - **C21.** The confirmation p90 DD rose $4.6k, together with p90 banked-capital DD (+$2.3k) and p90 trade principal
     loss (+$3.2k); both 80 % intervals exclude 0. The 11 C21 selections that P0 would reject owe their extra centre
     DD to banked **erosion**, not giveback.
   - **Breaching draws.** P3's draws above $35k are 2–4 × as frequent, and only 10–32 % are provably
     giveback-dominated.
3. **The census (every centre visited: 72,595 / 82,868 / 88,377 profitable, funded centres).**

   | | C19 | C21 | C24 |
   |---|---:|---:|---:|
   | Pass P3 only | 2,256 | 5,918 | 7,534 |
   | Pass P0 only | 284 | 514 | 375 |
   | Pass both | 66,314 | 62,410 | 47,285 |
   | Pass neither | 3,741 | 14,026 | 33,183 |

   - **P3's extra gates.** Its PL and BD gates exclude about 27 % of the ($35k, $40k] band, but only early-stage,
     less profitable centres. So no finalist passes P0 and fails P3.
   - **The top.** The best centre is the same configuration under both policies. At C21 and C24 it was found by EXP-30
     lanes yet is P0-qualified, so the pooled gain is a search-path effect.
4. **Both arms' drawdowns are mostly profit giveback.** About 90 % at C19 / C21 and about 60 % at C24 is giveback by
   winning positions before Growth's trend exit or a trailing stop fires, often a gapped fill. Losses below principal
   come mainly from D1 lots held to maximum hold. This points to exit design (staged trailing stops), not to a looser
   ceiling.
5. **Interpretation.** The diagnostics refine Stage B; they do not change it.
   - They do **not** strengthen the case for P3.
   - They support a narrower hypothesis, for separately authorized future testing on new data: conventional DD in this
     family is largely open-profit giveback.

## Recommended next decision (DECISION_REGISTER.md; nothing adopted)

- Keep P0.
- Close the risk-envelope investigation.
- Proceed to **Priority 3, the D1 / Growth trailing-stop audit**, then Priority 4.
- Keep the Stage B job archives until review; compression after review is optional (R5).

## Limitations

- **Coverage of the exact partition.** The D3 partition is exact for the centres only: the 64 representatives, which
  include the pooled primaries, and 2 benchmarks per cutoff. The neighbourhood draws and the census population have a
  **lower bound** only, which can prove giveback but never prove erosion.
- **Scope of the evidence.**
  - One previously inspected market history (VGT / GDX 2016–2026) and two cells.
  - The cutoffs are nested and are never pooled.
  - Training doors only; Stage B's later intervals are quoted, not recomputed.
- **The original tools.** Stage B's original `census.ts` had two defects (D1, D2). They were fixed in this namespace's
  copies with regression tests; the originals are unchanged history.
- **The giveback run count.** One giveback run was repeated after an over-strict check of mine (D3), so there were 798
  CPU engine runs against 630 planned (O3).

## Reading order

1. `REPORT.md`: the executive answers (§0) and the separation of evidence (§4).
2. `GIVEBACK_REPORT.md` (definitions §1, parity §2, decomposition §3–§7) and `CENSUS_REPORT.md`.
3. `VERIFICATION.md`: archive hashes before and after, replay = sealed, zero evaluations, parity, tests.
4. `DECISION_REGISTER.md`; `AMENDMENTS.md` (D1–D4, O1–O3).
5. `results/analysis/TABLES.md` and `DATA_SCHEMAS.md`, then the machine-readable `results/census/`,
   `results/qualification/` and `results/giveback/`.
6. `PROTOCOL.md` (the plan, committed before execution), `STANDARD_ADOPTION.json`, `RESEARCH_RECOVERY.md`,
   `brief/BRIEF.md`, `tools/vg-l0-risk-envelope-stage-b-diagnostics/`, and `reference/` (in the ZIP: the unchanged inputs).

## Identity

| Item | Value |
|---|---|
| Branch | `research/vg-l0-risk-envelope-stage-b-diagnostics`, from Stage B's final `1c1f9e72` (unchanged); never merged. Final commit in `RESEARCH_RECOVERY.md` and the ZIP's `IDENTITY.txt` |
| Plan | `PROTOCOL.md` sha256 `90341d417dcbce6da31ad6d9358ddb6b11ededb2d306e9518a003974c3c61aab`, committed in `9e5c4767` before any tool ran on a real record |
| Standard | 3.0.0 `4e8244e6…`, scope diagnostic, non-official CPU (purpose `diagnostic`); preflight PASS |
| GPU acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc…`, VERIFIED, untouched |
| Stage B archives | `research/vg-l0-risk-envelope-stage-b/cache/jobs/*/archive.sqlite` (≈ 18 GB, git-ignored, on Apollo); sha256 before = after (`results/verification/`) |
| Brief | `brief/BRIEF.md` sha256 `b15e97463474d71bcc9f90cb7dc86ccca6b20938d2c2de872d3be73f63078fd0` |
