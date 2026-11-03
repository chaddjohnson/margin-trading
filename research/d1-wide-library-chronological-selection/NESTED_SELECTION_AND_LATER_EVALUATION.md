# Nested selection (A4) and later evaluation

**Evidence level: retrospective, period-correct nested replay (inspected history).** A4 chose each ETF's nominee from
its frozen A2(K) library using only the sealed selection-window evaluation; the choice was sealed
(`results/nested/<T>/SELECTION.json`) before the calendar door could open any later bar; the later window never chose
anything. **A nested result judged on its own selection window is never called validation.** T1 uses only this study's
new fold-A candidates (archived fold-a vectors are barred after 2021-12-31); T2 is secondary, overlaps T1's later
window and is never counted as a replication.

| Triple | Library trained through | Selection window (A4 chooses) | Later window (assessed) | Pools |
|---|---|---|---|---|
| **T1** (primary) | 2020-06-30 | 2020-07-01 → 2021-12-31 | 2022-01-03 → 2023-12-29 | **NEW** (primary), NEW-S |
| T2 (secondary) | 2021-12-31 | 2022-01-03 → 2022-12-30 | 2023-01-03 → 2023-12-29 | ARCH, NEW, NEW-S, ALL |

Rule (frozen): among the A2(K) library members with ≥ 1 lot entered in the selection window and a windowed minute DD ≤
$35,000, the largest selection-window V, iff V > 0 (ties T_nb, key). Compared on the later window with A2(K) (the same
library, chosen on training) and with the pool's baseline (A0r).

## Verdict (PROTOCOL §9.3; reported beside the study outcome)

**Validation selection is worse.** The primary cell T1/NEW is "worse": A4 is unfavourable against A2(K) at every K and
unfavourable and risk-incompatible against A0r at every K. T1/NEW-S: no evidence of an advantage. T2 (secondary): ARCH
worse, NEW no evidence, NEW-S worse, ALL no evidence. Nested across-ETF: T1 NEW mixed, NEW-S mixed; T2 ARCH, NEW-S, ALL
worse, NEW mixed.

## The price of selection (K = 16)

| Cell | Pool | A4 picks | Mean selection-window V of the picks | Mean later V of the picks | Picks with later V > 0 | Picks on a single selection-window lot | Median per-ETF ρ(selection V, later V) over the library | Σ later V: A4 / A2(K) / baseline | Mean ΔV vs A2 / vs baseline (W / L vs baseline) |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| T1 | **NEW** | 51 | **+$25,416** | **−$5,512** | 15 | 16 | **−0.13** | −$281,110 / −$129,913 / −$163,595 | −$2,479 / −$1,926 (23 / 27) |
| T1 | NEW-S | 50 | +$24,279 | −$4,736 | 13 | 12 | −0.13 | −$236,776 / −$278,683 / −$114,917 | +$687 / −$1,998 (25 / 25) |
| T2 | ARCH | 48 | +$11,275 | −$365 | 11 | 4 | −0.04 | −$17,519 / +$155,146 / +$133,546 | −$2,831 / −$2,476 (9 / 36) |
| T2 | NEW | 45 | +$11,720 | +$1,309 | 14 | 2 | +0.04 | +$58,924 / +$112,932 / +$38,190 | −$885 / +$340 (19 / 21) |
| T2 | NEW-S | 47 | +$11,384 | +$892 | 15 | 2 | −0.06 | +$41,945 / +$127,719 / +$136,308 | −$1,406 / −$1,547 (15 / 24) |
| T2 | ALL | 46 | +$11,331 | +$830 | 16 | 2 | +0.04 | +$38,159 / +$155,813 / +$152,331 | −$1,929 / −$1,872 (15 / 29) |

- **Validation winners did not persist.** T1's picks earned +$25k each on average in 2020–21 and lost −$5.5k each in
  2022–23; within each ETF's library, the ranking by 2020–21 V was, if anything, slightly inversely related to the
  2022–23 ranking (median ρ −0.13). Selecting the best 2022 performer (T2) gave picks that were roughly flat in 2023,
  while the training-only A2 choice on the same libraries earned more.
- **Thin evidence:** in T1, 16 of 51 picks (NEW) rested on a single selection-window lot.
- **More selection degrees of freedom made it worse:** A4 picks the maximum over up to K library members per ETF
  using 18 months of data; the winner's curse of that maximum is visible directly in the selection-vs-later gap.

## What the nested design can and cannot say

- It answers the brief's question (§6B) with a separated later window for both triples, using only legally executable
  candidates (T1: new fold-A candidates; T2: archived fold-b vectors within their door and new fold-B candidates).
- T2-later has no event attribution: it is window 1 of phase B, whose captures start at 2021-12-31 and are not split
  at T2's 2022-12-30 boundary. Its event-count floor uses its own catalog (79 families, 23 major); every capture and
  event figure for the nested design (`DIP_EVENT_CAPTURE_AND_TAIL_RISK.md`) is for T1-later only.
- It cannot be called independent evidence: 2020–2023 were inspected by earlier studies; T2 overlaps T1's later window;
  the libraries and rule were designed knowing the history. It is still informative that a simple validation-max rule,
  frozen in advance, picked worse than both the training-only choice and the narrow baseline in the primary cell.
