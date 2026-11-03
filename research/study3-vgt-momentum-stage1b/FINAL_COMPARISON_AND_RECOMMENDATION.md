# Final comparison and recommendation — Study 3, Stage 1b

**Verdict (frozen rubric, `results/records/analysis.json`): risk-incompatible.** No candidate is nominated for a later
test. Nothing was registered, promoted or deployed; VGT D1, B4, B5, allocator defaults, config and data are unchanged.

All figures: one VGT slot, $100,000 of cost per entry, net-debit financing at 11% simple interest, 5 bps per side,
price-only, liquidation-marked window increments W, minute-close drawdowns. Evidence level: retrospective,
chronology-respecting replays of a protocol frozen before any Stage 1b mechanism touched market data, on 2016–2023
history that earlier studies inspected and the designer knew. No bar after 2023-12-29 entered any computation.

## 1. The verdict object: Π1, the executable S1 annual selector

| | 2020 | 2021 | 2022 | 2023 | Σ W | Chained minute DD |
|---|---:|---:|---:|---:|---:|---:|
| **Π1 (S1, RoD picks)** | +$14,432 | +$18,059 | **−$30,966** | +$11,049 | **+$12,573** | **$42,882** |
| Π1-S2 (continue old) | +$14,432 | +$9,885 | −$38,716 | +$28,016 | +$13,617 | $44,342 |
| Π1-S3 (netted re-entry) | +$14,432 | +$15,583 | −$31,063 | +$10,865 | +$9,817 | $43,010 |
| C-ALR (always long, monthly $100k) | +$31,177 | +$21,507 | −$37,608 | +$39,427 | +$54,502 | $47,576 |
| C-SMA (flat-start / annual reset) | +$22,052 / +$15,868 | +$31,999 / +$24,228 | −$38,737 / −$28,581 | +$30,416 / +$30,836 | +$45,729 / +$42,351 | $45,036 / $33,946 |

Picks (sealed before each window): A E06 calm advance × XV volatility trail + Z1 monthly trim; B E03 directional
efficiency × XV + RC10 + Z2(0.5, 0) (the adaptive P12); C E03 × XT two-layer + Z1; D E06 × XV + RC10 + Z1
(`results/tables/picks.md`).

| Rubric item | Result | Value |
|---|---|---|
| (a) validity | pass | every parity check, guard and b-mark holds; ledger identities (i), (ii), (iii), (v), (vii) checked in code, (iv) recomputed by the final audit (`IMPLEMENTATION_AUDIT.md`) |
| (d) evidence | pass | 17 exits by the policies' own rules; 14 non-adoption first entries in all 4 windows; long in 4 windows |
| **(c) risk** | **FAIL** | chained minute DD $42,882 > $35,000 (window DDs $13,094 / $8,509 / $33,488 / $13,350) |
| (b) profit | fail | Σ W +$12,573 < +$20,000; min W −$30,966 < −$15,000 |
| (e) exposure and controls | fail | financing-neutral excess over exposure-matched C-ALR Σ −$30,477; margins over C-SMA / C-DON / C-TSM −$33,156 / −$21,142 / −$22,172 |
| (f) perturbation and stress | fail | 34% of 128 perturbed paths have Σ W > 0 and DD ≤ $35k; under 10 bps, 14%, 25 bps stop slippage and +1 minute the chained DD stays $41.8–43.9k |
| (g) winner/giveback | fail | Σ W minus the largest campaign = +$483; minus the largest up-leg = −$5,775; campaign giveback share 61% |

The label is the first failing gate in the frozen order (invalid → insufficient evidence → **risk-incompatible** → no
demonstrated edge). The other paths' labels (descriptive): Π1-S2, Π1-S3, Π-P0, Π-noE06 risk-incompatible; Π-NET and the
static path no demonstrated edge (`results/tables/verdict.md`).

## 2. Answers to the brief's question

- **Can a causally executable standalone VGT momentum strategy earn substantial net returns after 11% financing with
  acceptable drawdown and more reliable chronology than Stage 1?** Not demonstrated. The executable selector earned
  +$12,573 over four years, lost $30,966 in 2022 and drew down $42,882; every rubric control (C-SMA, C-DON, C-TSM,
  flat-start and annual-reset) and every always-long reference earned more over the same windows (the simple
  fixed-stop control C-STOP earned less, +$11,141 flat-start).
- **More reliable than Stage 1?** Partly on risk, not on economics. Stage 1's own picks, executed as an S1 path in the
  same net-debit account, make +$37,834 with a $36,672 chained DD (`EXECUTABLE_ANNUAL_SELECTION.md`); Stage 1b's Π1
  makes less (+$12,573) with a higher DD ($42,882). Stage 1b's exposure control works (peak position value ≤ $116k vs
  $133,673 for Stage 1's executable S1 path and $241,045 for the lot inside its non-executable splice) but the 2022 loss came from new entries into bear-market rallies, which sizing does not touch.
- **Can a protective trail plus re-arming capture long uptrends without surrendering accrued profits?** In-sample on
  2017–2023, several protective designs do look strong (E06 × XV with RP50, E06 × XT, E06 × XF-T with RC10, all with Z1:
  +$105–138k at $15–19.5k DD, `JOINT_COMBINATIONS.md`), but the procedure that selects among them did not carry that into later windows:
  the fold-C pick's entire 2022 neighbourhood lost money (0% of 128 neighbours positive), and re-entry rules rarely
  had enough opportunities to matter (`REENTRY_AND_CAMPAIGNS.md`). Tight trails gave back less per trade but cut trades
  short and re-entered into chop in 2023.
- **Did Stage 1's selection fail once executed?** Yes. Executed honestly it is much better than the non-executable
  splice (+$37,834 vs +$253; DD $36,672 vs $63,569) because the spliced 2022 window inherited a March 2020 E04 lot the
  2022 policy never entered; it still fails Stage 1's own T and E items (2022 −$30,572; DD > $35k).

## 3. What the secondary results do and do not show

- **Π-NET (the NET objective, descriptive)** made +$50,533 with an $18,015 DD and passes (b), (c), (d), (f) and (g),
  but fails (e): its price timing at matched market exposure is Σ −$26,876 against C-ALR, and its margin over C-SMA
  (+$4,804) is below $5,000. Choosing the NET objective now, after seeing both paths, would be selection on the
  evaluation windows; under the frozen rubric it is also "no demonstrated edge".
- **In-sample H results** (2017–2023) are hindsight descriptions: the H pick E06 × XT + Z1 made +$112,782 with a $15,031
  DD and a J128 neighbourhood 100% net-positive and within $35k. That is the kind of result Stage 1 also found in-sample
  (E06 +$120,096) and that did not survive chronological replay.
- **Exposure drift** — the mechanism behind Stage 1's 2022 lot — is controllable: Z1/Z2 were chosen by training-only
  RoD in most histories and bounded peak exposure. It did not rescue the procedure.

## 4. Limits and margins

Margins (final audit F9): Π1's 10 bps stress clears the Σ W ≥ $10k sub-test by $187 (it fails on drawdown); Π-NET's
giveback share 0.497 passes by 0.003 and its C-SMA margin fails by $196; Π-noE06's chained DD exceeds $35k by $32. The
missing-bars stress is weak (Σ W unchanged to the cent). Diagnostics computed read-only after the audit
(`results/tables/diagnostics.md`): Π1 is $17,917 below a drawdown-matched C-ALR and $32,376 below a principal-day-matched
C-ALR. Deliverables not produced and disclosed: `IMPLEMENTATION_AUDIT.md` §8.


One ETF in one secular bull market with three declines; four dependent annual windows; designer knowledge of every
window; parameter draws are not independent observations; no bid/ask, margin-call or forced-liquidation model; simple
interest; price-only accounting (distributions: `results/tables/evaluate-extras.md`); minute-close drawdowns;
1,111,465 planned and 794,623 used development evaluations across 13 entries × 20 exits screened, 44 exit cells and 12
pairings per history — multiplicity is large and the windows few.

## 5. Recommendation and the next gate

1. Do **not** carry any Stage 1b policy into Stage 2–4 or into the 2024–2025 validation: the frozen procedure is
   risk-incompatible and nominates nothing.
2. If the user still wants a momentum sleeve, a **hindsight-informed hypothesis** (it comes from Π-NET's 2022 behaviour in
   an evaluation window) is a different question, not a re-tune: whether a
   low-exposure trend filter (the kind Π-NET's fold-C pick represented, out of the market in 2022) adds value *inside*
   the shared D1 pool rather than standalone. That needs its own frozen protocol and explicit authorisation; it must
   not reuse Π-NET as a pre-chosen candidate (that choice would be hindsight).
3. Any later test of momentum on 2024–2025, then separately 2026, requires a new, independently frozen and
   user-approved protocol; both windows were inspected at program level and must be described so.

**Stop.** Stages 2–4 (D1 + momentum, B4 + momentum, B5 + momentum) and any 2024–2026 evaluation are not authorised and
were not run.
