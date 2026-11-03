# Review dispositions (before the protocol freeze)

Both reviews were made on the draft before any outcome of this study existed. Reports, verbatim:
`preregistration-review.md` (verdict: safe to freeze after fixing findings 1–5) and `engine-review.md` (verdict: no
material defect; safe for optimization after the parity gate). Every change below was made before the protocol
freeze; the tests named are in `src/d1-ranked-preemption/tests/` (engine 18, scenarios 14, leakage 2, pipeline 1 —
all passing at 17:37Z). A focused confirmatory review of these changes precedes the freeze (`confirmatory-review.md`).

## Preregistration review

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | MATERIAL | R1/R2 could get unequal Stage D budgets | **Fixed.** Materiality is one decision per window (any count of either ranking in B4, B5 or C_Rk ≥ threshold); both branches get the same share. `diagnostic.ts`; PROTOCOL §9; downscaled branches stay nominable, labelled. |
| 2 | MATERIAL | A superseded switch relied on an intrabar stop fill | **Fixed.** An own exit priced inside the sale bar (`stop level`, `trigger minute close`) no longer comes first: the sale at the bar's open is attempted first; only if it aborts does the own stop close the lot. Own exits at a minute's open or at the closing print still supersede. `engine.ts` (`closeVirtual`), `replay.ts`, the diagnostic's `holderExitsFirst`; PROTOCOL §5.3.5; tests "an own stop inside the sale bar …" (both branches). |
| 3 | MATERIAL | Same-auction switches cannot be executed | **Fixed.** If the replacement's fill would be the same print as the sale (or the incumbent's own exit) and that print is an auction (the closing print, or the opening trade of a session after the decision's), the switch aborts before anything is sold. The within-minute latency assumption for continuous trading is stated (§5.3.4). `sameAuctionPrint` in both implementations and the diagnostic; tests "weekend …" (abort, execute at a later fill, auction abort) and "an own exit at the sale bar supersedes …" (later fill / same auction). A separate P1-strict sensitivity was not added: the rule itself is the conservative one at auctions. |
| 4 | MATERIAL | No out-of-sample materiality or cost test | **Fixed.** F2 = V(X) − V(A) ≥ $5,000 at 5 bps **and** V(X) ≥ V(A) at 10 bps (`context.ts` `gates.fold.margin`, `walkforward.ts`); A's hindsight advantage is disclosed (§0, §13.3). |
| 5 | MATERIAL | Window chronology not enforced; CLI bypassed the doors | **Fixed.** `trainingUniverse('fold-b')` refuses until fold-a's sealed VALIDATION verifies; `'final'` until the sealed PROCEDURE_GATE. New `inspectionUniverse` for every CLI load of training data (chronology, audit check, end ≤ the window's allowed end); B4/B5/B1 unchanged via `benchmarkUniverse`, registered pools via `historicalUniverse`. The parity gate now uses fold-a's data. The benchmark's earlier final-window read (timings only) is the one disclosed exception (`beforeProtocolFreeze`, refused after the freeze). Pipeline test asserts both refusals. |
| 6 | minor | Portfolio P1 and windowed drawdowns unchecked on real data; (iii) text mismatch | **Fixed.** Parity (iii) runs P0, P0R, P1, P1-B250, P1-B500; (v) windowed daily DD and increment vs the engine's daily marks (20 runs); (vi) portfolio P1 = fixed P1 funded sequence when no margin test refuses (20 runs); deterministic coverage loop. |
| 7 | minor | V asymmetric | **Fixed.** The liquidation convention at both ends (`startExitFriction` in the replay's windowed record; `evaluate.ts`). |
| 8 | minor | Historical check replay-only | **Fixed.** The engine must reproduce the nominee's, B5's and B4's figures (`final.ts`). |
| 9 | minor | Fold budgets depend on contaminated B4/B5 vectors | **Disclosed** (§0(b)). Kept: the brief prescribes the B4/B5 diagnostic, and the share only sizes the search. |
| 10 | minor | N3 reused selection draws | **Fixed.** 64 fresh N1 draws (stage `nomination:final:<ranking>`) for B and D, computed in the final controls (`controls.ts`, `final.ts`). |
| 11 | minor | C not nominable / H2 not a gate | **Stated** (§13.4): C is a control; H2 is answered descriptively ("supported" only if V(D) > V(C) in both folds). |
| 12 | minor | Missing disclosures | **Added** to §0: hindsight of A/B in folds, B's weaker 2024–2026 check, multiple testing, the benchmark read. |
| 13 | minor | Trigger-minute-close exits | Covered by #2 (`trigger minute close` is an intrabar execution). |
| 14 | minor | Constants outside context.ts; stale comments; protocol structure | **Fixed:** `localSingleMoves`, `infeasibleOffset`, `nominationDraws`, `parity`, `benchmark` constants in `context.ts`; `incumbentMutants` asserted; unused `reserveMaxSurvivorsForIdle` removed; comments and section references corrected; §13.6 moved under §13; feasible-only promotion and "no pick → gates fail" stated (§11.4.1); refinement move size stated. Step units are the October 25 instrument's (stated in §6.2). |
| 15 | minor | Environment overrides could redirect the study | **Fixed.** `assertEnvironment`: overrides only inside the OS temporary directory, DATA only with ROOT; freezes refuse them; the result is recorded in every stage's guard (§17). |
| 16 | minor | Node version not enforced | **Fixed.** Every stage, freeze and parity run refuses a Node other than v24.21.0. |
| 17 | minor | Amendments to gate logic too easy | **Stated** (§17): outcome-defining files listed; their amendment needs a new independent review and never follows a sealed outcome of an affected stage; reporting amendments for report-only code. |
| 18 | minor | B250/B500 do not scale in portfolio mode | **Stated:** fixed pool only (§5.2). |
| 19 | minor | N4 inverts for negative productivity | **Fixed:** X ≥ A − 0.1 × |A| (`final.ts`, §14.2). |
| 20 | minor | No rank values in preemption records | **Fixed:** `sourceScore`/`targetScore` from the frozen ranking (engine and replay); reports use engine runs. |
| 21 | minor | Regime keys collide with R1/R2 | **Fixed:** G1–G13. |
| 22 | minor | §19 under-specifies the CLI/ledger | **Fixed:** §19 lists the ledger columns, exports, reconciliation, preemption and collision reports. |
| 23 | minor | Missing tests; weak mutation test | **Added:** stale signal, margin refusal, two-minute chain, intrabar stop, same-auction cases; every array mutated (`scenarios.test.ts`). |
| 24 | minor | Wording/provenance | **Fixed:** GDXJ/OIH ineligible under D1 (§4.2); phenotype JSONs record the universe record's hash; §16 states budgets are evaluation counts, never time limits. |

## Engine review

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | minor | `windowStarts = [startIndex]` silently produced no window | **Fixed:** the guard requires a start after the accounting start (throws); tested. |
| 2 | minor | A replacement can be preempted in the bar after it was bought | **Stated** (§5.3.6): allowed, bounded by the ranks and the need to clear both frictions; tested ("a two-minute chain"). |
| 3 | minor | Superseded records left fields at defaults | **Fixed:** `releasedPrincipal` set; field coverage per outcome documented (§5.3.8). |
| 4 | minor | Latent items (diagnostic `≥ 0`, hindsight slippage, B250/B500 scale, slot 0) | Documented: the diagnostic criterion is P1's $0 by definition; the study's stop slippage is 0; B250/B500 are fixed-pool only; one slot. |
| 5 | minor | Parity omitted P0/B500; coverage could seal a failure | **Fixed** (see preregistration #6). |
| 6 | minor | Test gaps | **Added** in `scenarios.test.ts`: the reviewer's S1–S4, a closing-print sale, an own exit in the decision minute, a friction-driven abort, the $250 boundary, `windowStarts`, `diagnose` equivalence, accounting/arming/end offsets in a seeded fuzz of all five policies, lots ordering, P0 with a fifth book, full-array mutation. |

## Confirmatory review (`confirmatory-review.md`; verdict: safe to freeze after resolving finding 1)

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | MATERIAL | B4 was never a gate comparator | **Fixed (option a):** every incumbent comparison uses the better of B5 and B4 — F2 (V at 5 bps with the $5,000 margin and at 10 bps), N2 (net at 5 and 10 bps; net − best lot), N3 (median draw net), N4 (productivity), and the historical check (≥ max − $10,000). `walkforward.ts`, `final.ts`; PROTOCOL §13.3, §14.2, §14.4. |
| 2 | minor | The same-minute latency assumption governs most switches | **Disclosed** (§0(f)); the controls record executed and same-minute switches per configuration (`controls.ts` engine record). No strict variant (it would break "funded lot = virtual trade"). |
| 3 | minor | Gate inputs were replay-only | **Fixed:** the validation stage recomputes V (5 and 10 bps), the windowed daily drawdown and the lots from the engine's daily marks and requires equality (`runs.ts` `windowFromEngine`); the historical check likewise. |
| 4 | minor | Controls could seal a fold without D_Rk | **Fixed:** `runControls` refuses unless both rankings' JOINT records verify. |
| 5 | minor | The historical door was not tied to the nominee | **Fixed:** members limited to the nominee ∪ B5 ∪ B4 ∪ VOOG/VGT; the check opens it once (`purpose: 'check'`), the CLI only after the sealed check. |
| 6 | minor | Wording | **Fixed** (§5.3.4, §5.3.5: the intrabar exception, "at an event at or before", the timestamp-only auction test, decision-session first bars are continuous). |
| 7 | minor | Stale comments | **Fixed** (`engine.ts`, `allocation.ts`, `context.ts`). |
| 8 | minor | Tests for the new rules | **Added** (`scenarios.test.ts` "auction prints at the close and at a later session's opening trade": own exit at the close with the replacement at the close / next morning; intrabar stop at a later opening trade with the replacement at the same print / at 9:35 / both at 9:32). Study tests 36/36. |
