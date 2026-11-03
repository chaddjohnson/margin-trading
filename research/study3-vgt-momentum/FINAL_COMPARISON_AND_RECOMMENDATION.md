# Final comparison and recommendation — Study 3, Stage 1 (standalone VGT momentum)

## Verdict

**No demonstrated standalone edge** — the frozen rubric's label (`PROTOCOL.md` §11; sealed
`results/records/analysis.json`). The procedure frozen before any result — for each fold, M1 gates on the
development data, a Sobol search per family, neighbourhood-median champions, and the cross-family pick P\* — produced
picks whose next-year results were:

| Window | Selected on | P\* (family) | V (window increment) | Window minute DD | Principal exposure¹ |
|---|---|---|---:|---:|---:|
| 2020 | 2016–2019 | E06 calm advance | +$18,608 | $25,298 | 75% |
| 2021 | 2016–2020 | E04 CUSUM | +$14,577 | $24,808 | 100% |
| 2022 | 2016–2021 | E04 CUSUM | **−$57,578** | **$63,078** | 34% |
| 2023 | 2016–2022 | E06 calm advance | +$24,646 | $18,359 | 86% |
| **Σ** | | | **+$253** | Π: **$63,569** | |

¹ Borrowed-principal dollar-days ÷ ($100,000 × days). It does not see share-count drift: in 2022 the carried lot counts
as $100,000 of principal, although it held $236,944 of VGT at the boundary.

Test T fails on four of five conditions: Σ V = +$253 (needs ≥ $20,000); the 2022 window breaches the $35,000 drawdown
reference and the −$15,000 loss floor; the chained procedure path Π has a $63,569 minute drawdown. The
exposure-matched test E also fails: Σ (V − principal exposure × C-ALR) = −$52,820, and no window clears +$2,000. Robustness R
fails: the four fold stresses sum to −$579 (10 bps), −$8,591 (14%), −$199 (25 bps stop slippage) and +$693 (+1
minute), and D's pick fails the joint-perturbation test (69% < 75%). Comparison K: P\* exceeds **none** of the
conventional controls — C-SMA +$44,098, C-DON +$21,744, C-TSM +$21,503 over the same four windows. The four fold picks
came from 52,017 search evaluations (folds A–D); H's 14,349 produced only the in-sample pick.

**Evidence level.** Retrospective, chronology-respecting replays of a selection procedure frozen before any momentum
result, on 2016–2023 history that earlier studies had inspected and the designer broadly knew (`PROTOCOL.md` §1
design-bias register). No bar after 2023-12-29 entered any computation. This is not out-of-sample evidence in either
direction.

## Answers to the study's questions

**Can a simple, executable long rule recognise ongoing upward movement in VGT without a prior deep dip?** Yes. Every
family entered sustained advances without a deep-drawdown prerequisite (E05 and E12 need only a 2–12% pullback by
construction), including 2017, 2019, H2 2020, 2021 and 2023, when D1 was largely idle. In 2023 D1 primary opened no
lot, while the 2023 pick (E06) earned +$24,646 and the monthly re-sized always-long slot C-ALR earned +$32,931 (and
C-SMA +$25,980, both more than the pick). E06 exists in the panel partly because Study 2 found D1 idle in calm advances
that include 2023 (`PROTOCOL.md` §1(c)); its 2023 result carries that design knowledge; the 2023 pick captured 72% of the hindsight leg 2022-12-28 →
2023-07-18 (+48%) after a 17-session entry delay. Over 2017–2023 the in-sample pick H-P\* captured ≥ 75% of 6 of the 12
hindsight up-legs (capture can exceed 100% when a lot entered before the leg holds more than $100,000 of exposure), only
27% and 38% of the two post-crash rebounds (2019, 2020: entries 45–47 sessions after the trough) and none of the three
2022 bear-market rallies (`TREND_CAPTURE_AND_MISSED_OPPORTUNITIES.md`).

**Does it earn its 11% financing and control downside across regimes?** Not demonstrably. Every family champion,
every TPL default and every trading control lost money in 2022 (only C-IDLE did not; D1, context, gained +$22,145); the
smallest 2022 losses were −$4,814 (E03 default), −$5,609 (E11 champion) and −$6,897 (E10). The selection procedure
rewarded exposure: the four picks had trailing stops of 19–25% and slow own-OUT exits, because the 2017–2021
development histories paid for staying in. More than half of the 2022 loss (−$33,954) came from a single lot still held from the COVID
crash (decided at the 2020-03-13 close, filled at the 2020-03-16 opening trade after a −12% gap, five sessions before the
2020-03-23 closing low): under the fixed-share convention its exposure had grown to $236,944 (2.37× the slot) when
2022 began. Long-held momentum lots lever themselves up as prices rise; the frozen template had no re-sizing to
prevent that. The pick entering 2022 (E04, whose CUSUM exit needs cumulated standardised down-moves, net of κ per
session, to reach h_out = 7.9) lost −$57,578. Against an always-long slot scaled to the same principal exposure, the picks added less than nothing
(E = −$52,820).

**Did search help (Study 1's question again)?** Within a family, usually; at the procedure level, not enough. On matched
windows the searched champion beat its untuned TPL default in 8 of 12 families (e.g. E06 +$42,874 vs +$16,107, E03
+$41,519 vs +$16,246), and lost in E01, E02, E05 and E10 (e.g. E02 −$22,694 vs +$6,751 over 2021–2023). The searched
procedure beat the protocol's no-search comparator by +$12,142 (P\* +$253 against P0 −$11,890, P0 being the best
untuned TPL default per fold); but both fail T, both trail every conventional control, and four windows cannot separate
them. P0 picked E09 three times (+$22,533, +$6,595, −$52,441), then E05 (+$11,424). The cross-family rule twice chose E04, the most aggressively exposed champion, and its 2022 loss decided the
outcome. Naming E06 or E03 now as "the families that worked" would be selection on the evaluation windows across
twelve families (`CHRONOLOGICAL_RESULTS.md` §4).

**Is the problem the first entry or re-entry?** Mostly neither. The decisive variable was exposure going into
2022. The fold picks almost never used their re-entry rule: their exits were own-OUT signals, after which a fresh
signal is required. Swapping the rule for R1/R2/R0 left 2020, 2021 and 2023 unchanged to the dollar. In 2022 it
changed the loss from −$57,578 to −$54,263 (R1, no re-entry), −$78,880 (R2 cool-down) and −$85,019 (R0 immediate):
re-entering after stops in a falling market compounded losses. On the full history, E02 with no re-entry (R1/R5)
skipped 2022 entirely (2022 change $0, 28% exposure) and netted +$34,875. Immediate re-entry (R0) made +$50,021, but
lost −$19,916 in 2022 (`REENTRY_AND_CAMPAIGN_ANALYSIS.md`).

**Exits?** In-sample on the full history (defaults on E02, descriptive), slow structural and trend exits (X3 floor
+$86,081, OX own exit +$85,240) beat tight price stops (CX1 +$31,017 with a $45,153 minute drawdown), at drawdowns of
$32–33k. The volatility-scaled trail X2 had the smallest drawdown ($19,320, +$37,730). Probation (X5b) whipsawed (65
lots, −$9,266). Time and stall exits lowered net (X6a +$18,724, X6b +$16,981), X6b at a lower drawdown ($26,336)
(`EXIT_MECHANISM_STUDY.md`).

## Standalone controls and context (same four windows, Σ V and the largest window minute drawdown)

| Run | Σ V 2020–2023 | Largest window minute DD | 2022 |
|---|---:|---:|---:|
| P\* (the procedure) | +$253 | $63,078 | −$57,578 |
| P0 (best untuned default, no search) | −$11,890 | $56,227 | −$52,441 |
| C-SMA (200-day average) | +$44,098 | $40,792 | −$38,850 |
| C-TSM/TPL (12-month momentum with the template stops) | +$32,180 | $21,037 | −$10,718 |
| C-SMA/TPL | +$28,645 | $28,901 | −$27,770 |
| C-DON (55/20 Donchian) | +$21,744 | $17,457 | −$16,501 |
| C-TSM (12-month momentum, monthly) | +$21,503 | $62,120 | −$47,798 |
| C-ALR (always long, $100k re-sized monthly) | +$36,702 | $50,995 | −$42,884 |
| C-AL (one lot held, exposure drifting to ~4×) | +$150,885 | $147,790 | −$124,029 |
| C-IDLE | $0 | $0 | $0 |
| VGT D1 primary (frozen engine; context only) | +$99,458 | $19,534 | +$22,145 |

Every row except D1 and C-IDLE is a fixed-slot price-only figure after 11% interest and 5 bps friction. D1's
selection benefited from knowledge of 2016–2026; it is context, not a comparator that momentum was trained on.

## What cannot be inferred

- **Nothing about B4/B5 or D1 complementarity.** The descriptive D1-idle overlap shows H-P\* gained +$55,129 in
  sessions when D1 was idle and +$64,967 when D1 was holding (`TREND_CAPTURE…` §4). That is timing coincidence on one
  ETF, not a shared-capital result. Stages 2–4 would have to measure refused entries, displaced trades, cascades,
  interest and pooled drawdown. Nothing here predicts their sign.
- **Nothing about 2024–2026.** The motivating 2023–2024 rally cannot be evaluated here. Only its 2023 half is in the
  data, where the 2023 pick captured 72% of the 2022-12-28 → 2023-07-18 leg after a 17-session entry delay.
- **No significance.** Four disjoint one-year windows (with nested development histories) on one ETF in one secular
  bull market are a screen, not an inference.

## Recommendation

1. **No deployment, registration or pooling** of any Study 3 candidate. Nothing was written to `config/`. The
   research-only register (`CANDIDATE_REGISTER.md`) records the in-sample H champions with their failed or passed
   checks; none is endorsed.
2. **Do not treat the in-sample H pick (E06 calm advance, +$120,096 over 2017–2023 with a $25,809 minute drawdown) as
   evidence.** It was selected on that same history, and the procedure that produced it scored +$253 in the
   chronological replay.
3. **Later gate (user decision required).** Stages 2–4 remain **not authorised and not started**. If the user wants
   them anyway, they should use the *procedure's* frozen output — H-P\* E06-4978efef20 as the frozen momentum book
   (`PROTOCOL.md` §11: "H's P\* is the candidate carried to any later stage") — knowing its standalone evidence is
   negative. The proposed order and design are in §"Later gate". A more conservative alternative is a new, separately
   frozen Stage 1b that first tests one pre-registered simple rule on untouched data. C-TSM/TPL looked the best
   risk-controlled control here, but naming it is itself a post-hoc choice among nine controls on these same windows, so
   it could be tested only on unexamined data. 2024–2026 would need explicit authorisation, and was partly inspected by earlier VGT
   programmes.

## Later gate — proposed plan for separately authorised combined studies (not started)

Each needs a new protocol and explicit approval, and none may re-tune the momentum book on pooled results:

1. **Frozen VGT D1 primary + frozen momentum book**, one shared $100,000 slot, the frozen engine's chronology
   (exits, fills, decisions, tie order), refused entries logged, idle-time gain, displaced D1 trades and cascades,
   after-interest net, minute drawdown ($ and % of the slot).
2. **Frozen B4 + frozen momentum book** in the canonical multi-ETF simulator, same measures plus the portfolio-mode
   drawdowns against the 30% preferred / 35% conditional references.
3. **Frozen B5 + frozen momentum book**, the same.

Study 1 COMPLETE; Study 2 COMPLETE; Study 3 Stage 1 COMPLETE; Study 3 Stages 2–4 NOT STARTED.
