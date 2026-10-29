# Exposure and position sizing (brief §4, PROTOCOL §3.2, §4.4, §7.5)

Sealed sources: `repair.json` (counterfactuals on Stage 1's fold-C pick), `develop-*.json` (L-D sizing step),
`evaluate.json` (controls, Π1 exposure). Tables: `results/tables/stage1-repair.md`, `sizing-ld.md`, `paths-full.md`,
`ledger-Pi1-S1.md`.

## 1. The self-financing account (frozen; fixtures F6–F11, F23)

- Principal cash M = Σ sale proceeds − Σ buy costs (accrued interest never enters M). Each entry costs B₀ = $100,000.
- **Trim:** proceeds repay the trade's principal first (L := L − min(L, P)); the rest is realised cash. Trade interest
  falls only when L falls (fixture F7: 100,000 × 11% × 2/365 + (100,000 − proceeds) × 11% × 1/365, exact). Trims that
  repay all principal stop the trade's interest; the remainder sits in cash at 0% (F8).
- **Trade interest** is simple interest on each trade's own principal in both financing modes, so trade paths and
  decisions never depend on the account's history. **Account interest:** fixed-slot = Σ trade interest (Stage 1's
  convention, not self-financing); **net-debit** (primary) = simple interest on max(−M, 0), so carried losses pay
  interest (also while flat — F11, F23 in closed form) and realised gains reduce later borrowing. The difference is the
  carried-balance interest line (Π1: −$5,032 over 2020–2023; the gains of 2020–2021 lowered the debit).
- Identities on every sealed ledger (analysis `ledgerProblems`: none): Σ trade nets − carried-balance interest = end
  liquidation; per trade Σ proceeds − cost − interest = net = price gain − friction − interest; repayments = min(L, P);
  Σ W = end liquidation; S > 0 while long. Cash from a trim is counted once (in proceeds), never twice, and never lost.

## 2. The Stage 1 lot, and what sizing would have done to it (counterfactuals, not trades)

Stage 1's fold-C pick (E04-b4a27ac53b) run continuously from 2017 with each overlay (`stage1-repair.md`):

| Sizing | 2022 W (fixed-slot) | Net 2017–23 (fixed-slot / net-debit) | The March-2020 lot: lifetime net, trims, peak gross |
|---|---:|---:|---|
| Z0 (Stage 1; = the Z3($40,000) run, which is path-identical to Z0) | −$57,578 | +$136,446 / +$173,907 | +$83,131, 0 trims, $241,045 |
| Z1 monthly to $100k | −$36,930 | +$117,615 / +$145,196 | +$69,314, 9 trims, $125,937 |
| Z2(0.25, 0) | −$40,618 | +$121,856 / +$151,646 | +$70,182, 3 trims, $125,937 |
| Z2(0.5, 0) | −$38,218 | +$134,665 / +$167,240 | +$81,091, 2 trims, $151,184 |
| Z2(1, 0) | −$40,224 | +$143,405 / +$174,855 | +$90,090, 1 trim, $200,184 |
| Z3($25,000) dollar giveback | −$44,454 | +$149,571 / +$186,925 | +$96,256, exit 2022-01-19 (3 sessions earlier) |
| Z3($15,000) | −$36,209 | +$103,429 / +$139,555 | +$54,750, exit 2020-09-04 |

Trimming bounds the appreciated exposure (peak gross $126k instead of $241k) and cuts the 2022 loss by $17–21k; on the
rest of the history (2017–2023 excluding 2022) it gives up $10.4k (Z2(1, 0)) to $39.5k (Z1) fixed-slot, and over the
whole history the differences to Z0 range from −$18.8k to +$7.0k. A tighter dollar giveback (Z3 $15k) exits the 2020 winner in
September 2020 and gives up far more than it saves. None of this is evidence for a policy: it is one lot in hindsight.

## 3. Sizing inside the procedure (L-D, training-only)

On the three best pairings per history, the nine overlays were scored with the same J32 draws; a variant could replace
Z0 only if it scored higher on RoD **and** kept price gain per notional dollar-day ≥ Z0's at the center
(`sizing-ld.md`). Z1 was chosen in 11 of 15 top-three slots (A: P02, P03, P12; B: P06; C: P03, P06; D: P02, P03; H: P02,
P03, P12), Z2(0.5, 0) once (B P12) and Z2(0.25, 0) once (C P02). Z2 with u ≥ 0.5 and Z3 were usually **identical to
Z0** for these protective designs (positions rarely gained 50%, and the giveback lock rarely activated), so they add no
information there. RoD favours trimming mechanically (it lowers drawdown with gross exposure) — the price-per-
notional-dollar-day guard was meant to stop that; it passed because Z1's trims are small (5% band, monthly).

## 4. Exposure of the verdict path versus passive references

| Run (net-debit) | Σ W 2020–23 | Chained minute DD | Peak gross | f_MV by window |
|---|---:|---:|---:|---|
| Π1 | +$12,573 | $42,882 | $115,601 | 0.55 / 0.74 / 0.37 / 0.74 |
| C-AL (one fixed-share lot) | +$51,806 | $79,315 | $196,943 | 1.13 / 1.61 / 1.47 / 1.65 |
| C-ALR (Stage 1's monthly $100k reset) | +$54,502 | $47,576 | $118,871 | 1.02 / 1.01 / 0.98 / 1.02 |
| C-ALZ1 (always long + Z1 trims, loan repaid) | +$47,357 | $40,820 | $111,179 | 0.98 / 1.03 / 0.79 / 0.88 |

Π1 held 37–74% of the passive exposure and earned a quarter of the passive return. Matched on market exposure for the
price term and on its own borrowing for financing (B_F = f_MV × (price gain − friction)(C-ALR) − Π1's interest), its
excess is −$2,602, +$3,666, −$16,227 and −$15,315 by window (Σ −$30,477): less price gain per unit of exposure than
holding VGT, in particular in 2022 (it bought rallies that failed) and 2023 (it was stopped out of the advance
repeatedly). The ex-post exposure match is a hindsight comparator, not a strategy. A drawdown-matched comparison (C-ALR
scaled to Π1's window DD: Π1 −$17,917) and the principal-day benchmark (Π1 −$32,376), computed read-only after the final
audit, are in `results/tables/diagnostics.md`; raw dollars govern the rubric.

## 5. Conclusions on sizing

- Fixed shares let a long-held winner become a 2.4× position; Z1/Z2 bound that cheaply and were chosen by the training
  data in most histories. The brief's concern about exposure drift is real and is solved by trimming.
- Exposure drift was **not** what failed Stage 1b's procedure: Π1 never exceeded $116k of exposure, yet lost $30,966 in
  2022 on fresh entries into bear-market rallies.
- No pilot/gradual-entry variant was studied (optional in the brief; disclosed).
