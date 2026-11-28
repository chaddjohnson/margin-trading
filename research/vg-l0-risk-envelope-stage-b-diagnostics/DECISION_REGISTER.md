# DECISION_REGISTER — RES-BD 1.0.0 (proposals only; nothing is decided or adopted here)

These are recommendations from post hoc, report-only diagnostics of one completed study on previously inspected
history.
- Stage B's sealed label (P3 non-inferior and superior on paired training profit at C21 and C24) and its recommendation
  (do not adopt P3) are unchanged.
- The original NL0 method (P0, marked DD ≤ 35 % of C0) remains authoritative.
- New L0 stays the official frozen reference, and N/original the preferred research challenger.
- No adoption, deployment, merge or broker action is authorized.

## 1. Findings

| ID | Finding | Evidence | Strength |
|---|---|---|---|
| F1 | P3's selected centres carry more conventional DD, +$1.9k / +$1.6k / +$3.0k. That increase is **mostly unbanked profit giveback**: 92 / 78 / 72 % of it. Banked erosion is small and uncertain, and there is **no starting-capital loss** | GIVEBACK_REPORT §4 | moderate: 32 pairs per cutoff; U's 80 % interval excludes 0 at C19 and C24 |
| F2 | At the **neighbourhood** level, where P0 actually rejected P3's selections, the extra DD is not shown to be giveback. At C21 the p90 banked-capital DD (+$2.3k) and the p90 trade principal loss (+$3.2k) rose with it. P3's breaching draws are 2–4 × as frequent, and only 10–32 % are provably giveback-dominated | GIVEBACK_REPORT §5; CENSUS_REPORT §8 | moderate (bound-based) |
| F3 | In the searched population, P3 admits the ($35k, $40k] band (2,256 / 5,918 / 7,534 centres). Its PL and BD gates exclude about 27 % of the band and 284 / 514 / 375 P0-plausible centres, but none beyond refinement, so they never bind among finalists | CENSUS_REPORT §3–§4 | strong (complete census, zero evaluations) |
| F4 | The best centre at every cutoff is the same configuration under both policies. At C21 and C24 it was found by EXP-30 lanes but is P0-qualified, so the pooled-level gain is a **search-path** effect | CENSUS_REPORT §5 | strong for these lanes |
| F5 | The conventional DD of **both** arms' selections is mostly giveback of winning open positions: about 90 % at C19 / C21, about 60 % at C24. It happens before Growth's trend exit or a trailing stop fires, including gapped fills. Loss below principal comes mostly from D1 lots held to maximum hold | GIVEBACK_REPORT §3, §6 | strong descriptively (199 exact replays) |
| F6 | The original `census.ts` would have failed on the real archives, on two counts (D1, D2). Both are fixed in the diagnostics tools with regression tests | AMENDMENTS D1 / D2 | fact |

## 2. Proposed decisions (for the user)

| ID | Decision | Recommendation | Why |
|---|---|---|---|
| R1 | Keep P0 (35 % marked DD) as the standard | **Keep P0.** Do not adopt P3 or any envelope | F2–F4 plus Stage B's unfavourable sealed intervals. P3's extra gates protect nothing P0 lacked (F3). Its centre-level giveback character (F1) does not extend to the neighbourhood (F2) |
| R2 | Reconsider a 40 % ceiling, or a profit-component-aware selector, later | **Not now.** At most, record it as a **hypothesis** for a future, separately authorized test on new data | F1 and F5 make it a plausible idea: much drawdown is open-profit giveback. But there is no evidence that admitting it improves later outcomes, F2 cuts against it, and these data have already been inspected. No threshold is proposed |
| R3 | Close the risk-envelope investigation | **Close it** | Both deferred diagnostics are done; neither changes the verdict |
| R4 | Proceed to Priority 3: audit the D1 / Growth trailing-stop capabilities; then Priority 4: staged trailing stops and a properly funded optimization | **Proceed** | F5 locates the drawdown in giveback before existing exits (trend exit, trailing stops, gapped fills) and in D1 maximum-hold losses: exactly the exit-side questions of Priorities 3–4 |
| R5 | The ≈ 18 GB of Stage B job archives (`research/vg-l0-risk-envelope-stage-b/cache/jobs/`) | **Keep them until the user's review.** Afterwards they may be compressed to `.sqlite.zst`, as for the L0 archives since 2026-11-21: hash before, compress, verify a restore test against the hash, keep the quarantine. The census and giveback intermediates (≈ 78 MB, `.cache/vg-l0-risk-envelope-stage-b-diagnostics/`) can go with them | Their hashes are recorded (`results/verification/archives-*.sha256`). Everything these diagnostics need from them is now summarized in committed records |
| R6 | Branches | Keep `research/vg-l0-risk-envelope-stage-b-diagnostics`, Stage B's, Stage A's and the pilot's branches **unmerged** until review | — |
| R7 | The optimization standard and NL0 1.0.0 | **No change** | — |
