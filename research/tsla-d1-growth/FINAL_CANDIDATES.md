# FINAL_CANDIDATES: the C24 finalists and the determination (PROTOCOL §12)

**Determination: NO QUALIFYING TSLA CANDIDATE.** No arm primary is development-qualified (a), chronologically supported
(b) and V1–V3-passing (c) at once. Criterion (b) fails for every arm (`results/sequential.json`).

**Development-qualified without chronological support** (an arm primary meeting (a) and (c) but not (b); "not a
deployment-qualified candidate without an explicit user decision"):
- G: `C24/G/refine/G.h2.s1/R101#1 profit`
- C: `C24/C/pair DF1×GF3`

The sealed `results/outcome.json` (`a414631e…`) shows an empty development-only list and `validation: null` for every
finalist. That is a join defect in `outcome.ts` (`AMENDMENTS.md` D1). The list above is the frozen rule applied to the
sealed validation rows by finalist id: `tools/tsla-d1-growth/outcome-join.py` → `reports/tables/outcome-join.json`.
The candidate list (empty) is the same either way.

**Nothing is adopted, deployed or promoted.** A finalist that fails the binding chronological gate is not promoted
without the user's separate decision (brief §7).

## The finalists

Sources: `FROZEN_SELECTION.json` `0ebb6b62…`, sealed before FULL opened; validation `b0f65400…`.
- (a) = Q1–Q6 at C24.
- (b) = arm primary with a supported chronological verdict.
- (c) = V1 validation P&L > 0, V2 reset validation DD ≤ $35,000, V3 whole-run DD ≤ $35,000.

| Arm | Finalist | Role(s) | Dev net / DD | (a) | (b) | Validation P&L / reset DD / whole DD | V1 V2 V3 | Status |
|---|---|---|---:|---|---|---:|---|---|
| D | `C24/D/refine/D.B1/R103#1 profit` | primary | $319,654 / $25,587 | ✓ | ✗ | −$8,979 / $13,924 / $27,742 | ✗ ✓ ✓ | not a candidate |
| D | `C24/D/refine/D.C1/R103#2 robust` | robust-profit | $200,866 / $26,049 | ✓ | — | −$16,974 / $27,237 / $27,237 | ✗ ✓ ✓ | role holder |
| D | `C24/D/refine/D.C1/R102#2 robust` | balanced | $191,135 / $22,652 | ✓ | — | −$15,884 / $25,830 / $25,830 | ✗ ✓ ✓ | role holder |
| D | `C24/D/refine/D.B1/R101#6 profit order` | lower-drawdown | $77,732 / $13,189 | ✓ | — | −$6,544 / $6,624 / $13,189 | ✗ ✓ ✓ | role holder |
| G | `C24/G/refine/G.h2.s1/R101#1 profit` | primary | $340,913 / $28,655 | ✓ | ✗ | +$10,703 / $18,255 / $28,655 | ✓ ✓ ✓ | **development-qualified, no chronological support** |
| G | `C24/G/refine/G.h2.s1/R102#2 robust` | robust-profit | $309,869 / $28,655 | ✓ | — | +$8,445 / $19,499 / $28,655 | ✓ ✓ ✓ | role holder |
| G | `C24/G/refine/G.h2.s1/R101#3 balanced` | balanced | $311,583 / $28,655 | ✓ | — | +$9,050 / $19,908 / $28,655 | ✓ ✓ ✓ | role holder |
| G | `C24/G/refine/G.h0.s1/R103#6 profit order` | lower-drawdown | $234,646 / $25,375 | ✓ | — | +$3,669 / $15,814 / $25,375 | ✓ ✓ ✓ | role holder |
| C | `C24/C/pair DF1×GF3` | primary and every role | $498,120 / $26,288 | ✓ | ✗ | +$71 / $25,953 / $26,288 | ✓ ✓ ✓ | **development-qualified, no chronological support** |
| J | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | primary | $435,551 / $27,882 | ✓ | ✗ | −$10,751 / $29,253 / $29,253 | ✗ ✓ ✓ | not a candidate |
| J | `C24/J/refine/J.B1.h2.s1/R103#2 robust` | robust-profit | $378,636 / $26,868 | ✓ | — | −$25,035 / $28,923 / $42,923 | ✗ ✓ ✗ | role holder |
| J | `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | balanced | $378,031 / $29,746 | ✓ | — | −$915 / $22,765 / $29,746 | ✗ ✓ ✓ | role holder |
| J | `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | lower-drawdown | $202,289 / $17,335 | ✓ | — | −$3,902 / $13,260 / $17,335 | ✗ ✓ ✓ | role holder |
| S | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | primary | $540,641 / $26,288 | ✓ | ✗ | −$2,412 / $26,869 / $26,869 | ✗ ✓ ✓ | not a candidate |
| S | `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | robust-profit | $391,774 / $28,466 | ✓ | — | −$4,418 / $26,438 / $28,466 | ✗ ✓ ✓ | role holder |
| S | `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | balanced | $374,505 / $21,031 | ✓ | — | −$2,049 / $15,996 / $21,031 | ✗ ✓ ✓ | role holder |
| S | `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | lower-drawdown | $263,271 / $19,113 | ✓ | — | −$19,940 / $29,886 / $29,886 | ✗ ✓ ✓ | role holder |

Role holders are descriptive and never nominees ("—" in (b): only an arm primary can meet it).

**Report-only sub-population primaries.** These never nominate:

| Sub-population | Primary | Validation P&L / reset DD | V1 V2 V3 |
|---|---|---:|---|
| G-U (unrestricted Growth) | `C24/G/refine/G.h0.s0/R101#1 profit` | −$9,830 / $54,344 | ✗ ✗ ✗ |
| J-U | `C24/J/refine/J.D1.h0.s0/R102#1 profit` | −$5,509 / $27,741 | ✗ ✓ ✓ |
| S-U | `C24/S/broad/S.C24F1.h0.s0/R103#1 profit` | +$3,824 / $9,328 | ✓ ✓ ✓ |
| D-A | none qualified at C24 | — | — |

G-P, J-P and S-P equal the arm primaries.

## Parameter vectors of the five primaries (as sealed; engine units, `FUNCTIONALITY_AUDIT.md`)

The VGT-slot books carry TSLA (`FUNCTIONALITY_AUDIT.md`; PROTOCOL AD1). In the D1 `controls`:
- `d` is the protective-stop distance in tenths of a percent;
- `k`, `r` and `c` are the decline gate's losses, recovery (tenths of a percent) and maximum block (sessions).

Role vectors are in the arm reports, §E "Parameter vectors".

- **D** `C24/D/refine/D.B1/R103#1 profit`, cell `D.B1`.
  - D1·TSLA: targetPercentChange 285, trailingBuyPercentage 12, trailingStopPercentage 70, maximumHoldDays 11,
    tickWindowSize 59, intradayLossBuffer 40, pullback 39, continuationWindow 166.
  - Controls `{"d":58,"k":1,"r":500,"c":214}`; D1 arming from the first day: false.
- **G** `C24/G/refine/G.h2.s1/R101#1 profit`, cell `G.h2.s1`.
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 10, breakoutSlopeComparisonSessions 96,
    breakoutPriorHighSessions 50, trendFilterEnabled false, drawdownRecoveryGateEnabled false, trailingStopPercent 5.9,
    maximumHoldEnabled true, maximumHoldDays 23, intradayLossBufferEnabled true, intradayLossBufferPercent 5,
    initialStopEnabled true, initialStopAtrSessions 26, initialStopAtrMultiple 1.3, retentionEnabled false,
    continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 132, uptrendSmaBars 109,
    uptrendSlopeBars 6, uptrendMinimumRisePercent 1.15, pullbackMinimumPercent 1.3, pullbackMaximumPercent 10.5,
    recoveryPercent 2.64.
- **C** `C24/C/pair DF1×GF3`, cell `C.B1.h2.s1`.
  - D1·TSLA: the D primary's vector above.
  - Growth·TSLA: G's balanced role `G.h2.s1/R101#3` — entryMethod trend_breakout, breakoutSmaSessions 10,
    breakoutSlopeComparisonSessions 100, breakoutPriorHighSessions 82, trendFilterEnabled false,
    drawdownRecoveryGateEnabled false, trailingStopPercent 5.9, maximumHoldEnabled true, maximumHoldDays 27,
    intradayLossBufferEnabled true, intradayLossBufferPercent 1.7, initialStopEnabled true, initialStopAtrSessions 23,
    initialStopAtrMultiple 1.5, retentionEnabled false, continuationEnabled true, continuationMethod shallow_pullback,
    continuationWindowSessions 49, uptrendSmaBars 96, uptrendSlopeBars 7, uptrendMinimumRisePercent 1,
    pullbackMinimumPercent 1.2, pullbackMaximumPercent 10.6, recoveryPercent 2.6.
- **J** `C24/J/refine/J.B1.h2.s1/R104#1 profit`, cell `J.B1.h2.s1`.
  - D1·TSLA: targetPercentChange 277, trailingBuyPercentage 23, trailingStopPercentage 77, maximumHoldDays 9,
    tickWindowSize 69, intradayLossBuffer 48, pullback 193, continuationWindow 10.
  - Controls `{"d":71,"k":1,"r":620,"c":165}`; D1 arming from the first day: true.
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 191, breakoutSlopeComparisonSessions 57,
    breakoutPriorHighSessions 79, trendFilterEnabled false, drawdownRecoveryGateEnabled false, trailingStopPercent 6.3,
    maximumHoldEnabled true, maximumHoldDays 26, intradayLossBufferEnabled true, intradayLossBufferPercent 3.6,
    initialStopEnabled true, initialStopAtrSessions 54, initialStopAtrMultiple 1.9, retentionEnabled false,
    continuationEnabled true, continuationMethod shallow_pullback, continuationWindowSessions 70, uptrendSmaBars 184,
    uptrendSlopeBars 22, uptrendMinimumRisePercent 3.7, pullbackMinimumPercent 2.5, pullbackMaximumPercent 10.7,
    recoveryPercent 3.89.
- **S** `C24/S/refine/S.C24F1.h1.s1/R101#1 profit`, cell `S.C24F1.h1.s1`.
  - D1·TSLA: frozen C24F1 = the D primary's vector above.
  - Growth·TSLA: entryMethod trend_breakout, breakoutSmaSessions 10, breakoutSlopeComparisonSessions 21,
    breakoutPriorHighSessions 94, trendFilterEnabled false, drawdownRecoveryGateEnabled false, trailingStopPercent 6,
    maximumHoldEnabled true, maximumHoldDays 18, intradayLossBufferEnabled false, initialStopEnabled true,
    initialStopAtrSessions 26, initialStopAtrMultiple 1.6, retentionEnabled false, continuationEnabled true,
    continuationMethod shallow_pullback, continuationWindowSessions 147, uptrendSmaBars 128, uptrendSlopeBars 16,
    uptrendMinimumRisePercent 0, pullbackMinimumPercent 1.1, pullbackMaximumPercent 10, recoveryPercent 0.41.

## What would change this determination

Only the user's separate decision can. The study's rule would not change, and no further search would run (see
`DECISION_REGISTER.md` U5). The fold evidence says the procedure that produced G's and C's primaries chose, at three
earlier cutoffs, vectors whose next-period drawdowns exceeded the limit.
