# Family A — Loss classification (experiment `adaptive_loss_class`)

Run 2026-10-12 through the frozen Phase 2 infrastructure (`common/framework.py`, `common/runner.py`;
calibration gate passed on all four datasets — `A_baseline` and `REF_lower3` reproduced the frozen
reference results trade for trade before any variant ran). All ten configurations were registered in
`registry.jsonl` before their first evaluation; the registry is append-only and includes the failures.
Vary ONLY the trigger (plus, for A3/A4, a `required_level` reading the armed episode's frozen
`st.loss` / `st.price_return`); discount otherwise fixed 3% off the loss exit, reset fixed frozen-high
95%. No indicators are used, so `indicator_fallbacks = 0` everywhere. Raw outputs: `results/`
(summary.json, trades/, daily/, states/, events/, matching/, recovery/). Analysis tables:
`tmp/analysis.txt`; verification log: `tmp/verification.txt`.

## Summary

Loss classification matters, but not the way the brief assumed. Financing-only losses (net loss with
exit ≥ entry) armed only 15 of 88 A0 restrictions (17%) and directly blocked exactly **one** major
baseline winner across all four datasets (QQQ 2010-08-26, +$19,221). The famous VGT 2023-01 block is
**not** a financing-only story under the fixed 3% discount: the arming loss is 2022-11-03, −$1,306,
price return **−0.49%** — a real (hairline) price loss — so A1 (price-loss-only) does *not* recover the
+$28,006 winner. What recovers it is a **materiality floor**: every A2 config declines the −0.49% loss
and takes the 2023-01-04 entry identically (+$28k). The −$143 trade itself (entry 2022-12-19 at
39.3976, exit 2023-01-03 at 39.5194, interest $453) only exists on paths that were free in December;
A2_material_05's own path contains it, classifies it financing-only/immaterial, declines it, and wins.

The cost side is equally clear: small-loss exemptions give up very little in 2000–2002 until the floor
reaches −3% (A2_material_3 re-opens the window: −$28.8k vs A0's −$11.5k), and severity scaling (A4)
does **not** beat binary rules — proportional requirements ratchet to the 8% cap after deep losses and
reproduce the −8% config's fatal misses (March 2009 missed on *both* old datasets, QQQ 2025 missed),
though A4 delivers the family's best bear-window P&L (2000–02 positive) and the family-best max
drawdown on QQQ 1999–2015 ($61.7k vs $91.5k). No config dominates A0 on all four datasets;
A2_material_05 and A2_material_1 come closest and are the family's candidates for validation.

---

## 1. Hypotheses as registered

Verbatim records in `registry.jsonl` (registered before any run; the runner refuses unregistered
names). Abbreviated:

- **A0_net_loss** — anchor; reproduces REF_lower3 exactly; its trigger fires on financing-only losses,
  which arm restrictions after sessions where price did not fall; counting them quantifies the
  false-trigger problem. *(Held: reproduction exact. Partly wrong: only one major winner was blocked
  by a financing-only restriction, and on VGT 2016–2026 those restrictions were net profitable.)*
- **A1_price_loss_only** — dropping financing-only triggers should recover blocked recovery winners
  (VGT 2023-01 type) at little bear-market cost. *(Wrong on the headline case: the 2023-01 blocker was
  a −0.49% price loss, which A1 still arms. Right on 2000–02: cost only ≈ −$6k.)*
- **A2_material_05 / _1 / _2 / _3** — a materiality floor removes noise triggers; the risk grows with
  the threshold as exempted losses can repeat in grinding bears; at −0.5%/−1% the exempted trades
  should be few and small; at −3% the 2000–02 problem should measurably re-open. *(Held, including the
  −3% re-opening.)*
- **A3_bands_a** ($500/$5,000 bands, 3%/5%) — graduated dollar severity keeps bear protection while
  freeing noise episodes; the 5% band risks V-bottom misses. *(The risk dominated: the 5% band and the
  $500 floor's failure to free the −$1,306 episode made it worse than simple A2 floors nearly
  everywhere; QQQ 2000–02 in-window drawdown blew out to $86.8k.)*
- **A3_bands_b** ($1,000 floor, 3%) — simplest dollar materiality; should behave like A2_material_1.
  *(Wrong where it mattered: $1,000 > |−$1,306| fails, so it blocks VGT 2023-01 like A0 while also
  giving up A0's 2026 gains — dominated by A2_material_05 on every dataset.)*
- **A4_proportional_05 / _10** — proportional severity (required decline = clip(k·|price return|, 1%,
  8%)) adapts to cascade severity; k=1 should approach the −8% config's behaviour after deep losses;
  tests whether one adaptive rule can span the B-vs-D regime split. *(Held, including the predicted
  failure: both miss 2009 entirely on both old datasets. Severity scaling did not beat binary rules on
  net; it did produce the family's best drawdowns/bear windows on QQQ-old.)*

## 2. Exact mechanisms

All are pure `AdaptiveStrategy` compositions (`strategies.py`); chronology, reset priority, episode
state and correction bookkeeping are the frozen framework's. Reset: close ≥ 0.95 × frozen reference
high (the losing trade's entry-signal 90-session high). Price return = exit_price/entry_price − 1
(execution prices, interest excluded); dollar loss = net P&L (interest included).

| Config | Trigger (arms on a closed trade) | Required level while restricted |
|---|---|---|
| A0_net_loss | net P&L < 0 | exit × 0.97 |
| A1_price_loss_only | exit_price < entry_price | exit × 0.97 |
| A2_material_05/1/2/3 | price return ≤ −0.5% / −1% / −2% / −3% | exit × 0.97 |
| A3_bands_a | net loss and \|net P&L\| ≥ $500 | exit × 0.97 if \|loss\| ≤ $5,000, else exit × 0.95 |
| A3_bands_b | net loss and \|net P&L\| ≥ $1,000 | exit × 0.97 |
| A4_proportional_05 | exit_price < entry_price | exit × (1 − clip(0.5·\|price return\|, 1%, 8%)) |
| A4_proportional_10 | exit_price < entry_price | exit × (1 − clip(1.0·\|price return\|, 1%, 8%)) |

A price loss always implies a net loss (interest only subtracts), so A1/A2/A4 triggers are strict
subsets of A0's; declined losses are counted (`triggers_declined`) and leave any correction state
unchanged (framework rule). A non-trivial engine consequence of declining a trigger: the unrestricted
path immediately re-enters on the next signal session, so trade *sequences* diverge — all comparisons
below are full-backtest, not per-episode substitutions.

## 3. Results per dataset

Columns: net / max DD / P:DD / closed trades / W–L / blocked signal sessions / lower-price re-entries /
resets / false resets / net vs baseline / net vs existing 3% (REF_lower3) / matched-baseline control
Δprofit, ΔDD / matched-lower3 control (ex-post) Δprofit, ΔDD. Positive Δprofit and negative ΔDD favor
the config.

### VGT 2005–2015 (baseline 11,602 / 73,404; lower3 26,384 / 54,279)

| Config | net | maxDD | P:DD | tr | W–L | blk | re | rst | fRst | vsBase | vsL3 | mCtl ΔP/ΔDD | mL3 ΔP/ΔDD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A0_net_loss | 26,384 | 54,279 | 0.49 | 22 | 8–14 | 274 | 8 | 5 | 4 | +14,782 | 0 | +19,130 / +8,383 | 0 / 0 |
| A1_price_loss_only | 32,115 | 54,279 | 0.59 | 22 | 8–14 | 272 | 8 | 4 | 3 | +20,512 | +5,731 | +24,816 / +8,104 | +5,571 / −329 |
| A2_material_05 | 28,363 | 54,279 | 0.52 | 24 | 8–16 | 269 | 6 | 3 | 2 | +16,761 | +1,979 | +20,512 / +4,612 | −189 / −4,459 |
| A2_material_1 | 28,363 | 54,279 | 0.52 | 24 | 8–16 | 269 | 6 | 3 | 2 | +16,761 | +1,979 | +20,512 / +4,612 | −189 / −4,459 |
| A2_material_2 | 52,098 | 54,279 | 0.96 | 32 | 11–21 | 171 | 5 | 0 | 0 | +40,496 | +25,714 | +41,849 / −10,563 | +14,823 / −22,406 |
| A2_material_3 | 54,192 | 52,185 | 1.04 | 38 | 11–27 | 82 | 4 | 0 | 0 | +42,590 | +27,808 | +43,098 / −18,005 | +13,843 / −30,824 |
| A3_bands_a | 35,321 | 54,524 | 0.65 | 21 | 7–14 | 271 | 8 | 4 | 3 | +23,718 | +8,937 | +28,008 / +8,256 | +8,724 / −194 |
| A3_bands_b | 28,363 | 54,279 | 0.52 | 24 | 8–16 | 269 | 7 | 4 | 3 | +16,761 | +1,979 | +20,512 / +4,612 | −189 / −4,459 |
| A4_proportional_05 | 16,594 | 50,051 | 0.33 | 28 | 7–21 | 170 | 10 | 4 | 2 | +4,992 | −9,790 | +7,937 / −4,716 | −14,889 / −14,719 |
| A4_proportional_10 | 18,327 | 52,279 | 0.35 | 25 | 7–18 | 229 | 9 | 4 | 2 | +6,725 | −8,057 | +10,276 / +1,345 | −10,953 / −7,958 |

### QQQ 1999–2015 (baseline −2,886 / 149,561; lower3 40,258 / 91,469)

| Config | net | maxDD | P:DD | tr | W–L | blk | re | rst | fRst | vsBase | vsL3 | mCtl ΔP/ΔDD | mL3 ΔP/ΔDD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A0_net_loss | 40,258 | 91,469 | 0.44 | 69 | 28–41 | 425 | 31 | 10 | 7 | +43,144 | 0 | +41,968 / +2,844 | 0 / 0 |
| A1_price_loss_only | 51,812 | 93,720 | 0.55 | 74 | 30–44 | 375 | 30 | 7 | 4 | +54,697 | +11,553 | +53,707 / −4,507 | +7,191 / −7,659 |
| A2_material_05 | 51,812 | 93,720 | 0.55 | 74 | 30–44 | 375 | 29 | 7 | 4 | +54,697 | +11,553 | +53,707 / −4,507 | +7,191 / −7,659 |
| A2_material_1 | 67,162 | 78,370 | 0.86 | 77 | 31–46 | 337 | 27 | 6 | 4 | +70,048 | +26,904 | +69,346 / −34,803 | +15,753 / −38,435 |
| A2_material_2 | 70,082 | 77,187 | 0.91 | 81 | 33–48 | 314 | 24 | 4 | 3 | +72,968 | +29,824 | +72,394 / −42,627 | +15,656 / −46,473 |
| A2_material_3 | 46,133 | 95,369 | 0.48 | 82 | 33–49 | 309 | 21 | 3 | 2 | +49,019 | +5,875 | +48,472 / −25,854 | −8,933 / −29,745 |
| A3_bands_a | 49,440 | 93,968 | 0.53 | 51 | 20–31 | 653 | 20 | 7 | 4 | +52,326 | +9,182 | +51,012 / +12,491 | +12,429 / +9,876 |
| A3_bands_b | 50,609 | 94,923 | 0.53 | 74 | 30–44 | 372 | 29 | 8 | 5 | +53,494 | +10,350 | +52,503 / −3,268 | +6,005 / −6,419 |
| A4_proportional_05 | 36,559 | 61,673 | 0.59 | 76 | 30–46 | 351 | 31 | 6 | 4 | +39,445 | −3,699 | +38,494 / −38,576 | −8,979 / −41,794 |
| A4_proportional_10 | 41,083 | 62,303 | 0.66 | 62 | 23–39 | 516 | 24 | 6 | 4 | +43,969 | +825 | +42,835 / −28,488 | −159 / −31,402 |

### VGT 2016–2026 (baseline 161,772 / 38,323; lower3 182,094 / 28,687)

| Config | net | maxDD | P:DD | tr | W–L | blk | re | rst | fRst | vsBase | vsL3 | mCtl ΔP/ΔDD | mL3 ΔP/ΔDD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A0_net_loss | 182,094 | 28,687 | 6.35 | 32 | 13–19 | 138 | 15 | 4 | 2 | +20,322 | 0 | +63,993 / +710 | 0 / 0 |
| A1_price_loss_only | 151,457 | 29,336 | 5.16 | 34 | 13–21 | 127 | 11 | 5 | 2 | −10,315 | −30,637 | +35,753 / +1,926 | −26,942 / +1,231 |
| A2_material_05 | 180,663 | 29,336 | 6.16 | 37 | 15–22 | 80 | 10 | 4 | 1 | +18,890 | −1,431 | +46,319 / −2,489 | −26,477 / −3,297 |
| A2_material_1 | 184,948 | 29,336 | 6.30 | 38 | 16–22 | 76 | 10 | 2 | 0 | +23,175 | +2,854 | +38,953 / −5,249 | −40,155 / −6,127 |
| A2_material_2 | 179,669 | 28,208 | 6.37 | 39 | 16–23 | 69 | 8 | 2 | 0 | +17,897 | −2,425 | +32,476 / −6,661 | −47,281 / −7,546 |
| A2_material_3 | 163,306 | 33,521 | 4.87 | 42 | 17–25 | 50 | 7 | 1 | 0 | +1,533 | −18,788 | +12,451 / −2,215 | −69,290 / −3,122 |
| A3_bands_a | 154,541 | 29,336 | 5.27 | 33 | 13–20 | 132 | 12 | 5 | 2 | −7,232 | −27,554 | +39,902 / +2,179 | −22,216 / +1,490 |
| A3_bands_b | 151,243 | 29,336 | 5.16 | 33 | 13–20 | 128 | 11 | 5 | 2 | −10,529 | −30,851 | +36,205 / +2,084 | −26,129 / +1,393 |
| A4_proportional_05 | 155,399 | 36,506 | 4.26 | 36 | 13–23 | 150 | 14 | 3 | 1 | −6,374 | −26,695 | +24,849 / +5,579 | −45,890 / +4,795 |
| A4_proportional_10 | 143,273 | 28,436 | 5.04 | 34 | 13–21 | 140 | 13 | 4 | 1 | −18,499 | −38,821 | +17,317 / −1,403 | −50,933 / −2,160 |

### QQQ 2016–2026 (baseline 116,388 / 39,237; lower3 132,242 / 23,564)

| Config | net | maxDD | P:DD | tr | W–L | blk | re | rst | fRst | vsBase | vsL3 | mCtl ΔP/ΔDD | mL3 ΔP/ΔDD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A0_net_loss | 132,242 | 23,564 | 5.61 | 27 | 13–14 | 111 | 10 | 4 | 1 | +15,854 | 0 | +35,187 / −9,155 | 0 / 0 |
| A1_price_loss_only | 129,839 | 26,133 | 4.97 | 29 | 14–15 | 71 | 9 | 3 | 0 | +13,451 | −2,403 | +29,589 / −7,663 | −6,755 / +1,793 |
| A2_material_05 | 133,745 | 29,106 | 4.60 | 30 | 15–15 | 67 | 9 | 2 | 0 | +17,357 | +1,503 | +30,637 / −5,654 | −6,743 / +4,072 |
| A2_material_1 | 122,206 | 29,106 | 4.20 | 28 | 13–15 | 108 | 8 | 3 | 0 | +5,817 | −10,037 | +24,926 / −3,689 | −10,342 / +5,487 |
| A2_material_2 | 113,677 | 32,752 | 3.47 | 25 | 11–14 | 179 | 7 | 3 | 0 | −2,711 | −18,565 | +22,841 / +2,130 | −10,090 / +10,698 |
| A2_material_3 | 115,230 | 29,106 | 3.96 | 29 | 12–17 | 104 | 7 | 2 | 0 | −1,158 | −17,012 | +16,157 / −4,294 | −19,761 / +5,052 |
| A3_bands_a | 129,370 | 26,133 | 4.95 | 26 | 13–13 | 129 | 8 | 3 | 0 | +12,981 | −2,873 | +33,603 / −6,152 | −1,116 / +2,881 |
| A3_bands_b | 133,745 | 29,106 | 4.60 | 30 | 15–15 | 67 | 9 | 2 | 0 | +17,357 | +1,503 | +30,637 / −5,654 | −6,743 / +4,072 |
| A4_proportional_05 | 88,367 | 31,157 | 2.84 | 26 | 11–15 | 123 | 9 | 4 | 0 | −28,022 | −43,876 | +3,359 / +2,499 | −27,460 / +10,518 |
| A4_proportional_10 | 92,926 | 31,157 | 2.98 | 25 | 11–14 | 142 | 8 | 4 | 0 | −23,463 | −39,317 | +9,263 / +2,953 | −21,069 / +10,845 |

Notes. (1) The matched-lower3 control is the ex-post exposure control defined by the runner, not a
deployable strategy; configs that decline triggers trade more, so their scaled-up lower3 control is
larger. At matched exposure, Family A configs beat BOTH controls on BOTH profit and drawdown only on
the two old datasets: QQQ 1999–2015 (A1/A2_05/A3_bands_b marginally; A2_material_1 and A2_material_2
decisively, +$15.7k profit and −$38k/−$46k drawdown vs the lower3 control) and VGT 2005–2015
(A2_material_2/_3). On neither 2016–2026 dataset does any config beat the ex-post lower3 control on
profit — the new-era net gains vs the baseline come with more exposure. (2) `unresolved_at_end`: only A0's trivial 9-session tail on VGT 2005–2015 (the
frozen dataset ends 2015-10-07); every other episode of every config resolved. (3) `alt_entries` and
`reset_priority_blocks` are 0 everywhere; `triggers_declined` per config/dataset are in
`tmp/analysis.txt` §7 (A0: 0 by construction).

## 4. Bear windows and recovery windows

### Bear windows (window P&L / in-window max DD / closed trades (losing))

| Config | QQQ 2000–02 | QQQ 2007–09 | VGT 2007–09 | VGT 2022 | QQQ 2022 |
|---|---:|---:|---:|---:|---:|
| baseline (ref) | −91,629 / 149,561 / 56 (36) | +20,931 / 70,759 | −38,496 / 73,404 | −23,643 / 34,856 | −26,320 / 33,932 |
| A0_net_loss | −11,471 / 61,251 / 42 (23) | +45,281 / 44,706 / 10 (6) | −6,198 / 54,279 / 10 (5) | −3,865 / 20,570 / 9 (7) | −9,942 / 21,397 / 9 (7) |
| A1_price_loss_only | −17,559 / 63,478 / 45 (25) | +45,281 / 44,706 / 10 (6) | −6,198 / 54,279 / 10 (5) | −3,865 / 20,570 / 9 (7) | −9,636 / 21,397 / 10 (7) |
| A2_material_05 | −17,559 / 63,478 / 45 (25) | +45,281 / 44,706 / 10 (6) | −6,198 / 54,279 / 10 (5) | −165 / 20,570 / 10 (7) | −9,636 / 21,397 / 10 (7) |
| A2_material_1 | −17,559 / 63,478 / 45 (25) | +47,886 / 44,706 / 11 (6) | −6,198 / 54,279 / 10 (5) | −165 / 20,570 / 10 (7) | −13,537 / 22,830 / 10 (8) |
| A2_material_2 | −16,377 / 62,296 / 46 (25) | +47,886 / 44,706 / 11 (6) | −6,198 / 54,279 / 10 (5) | −3,356 / 20,570 / 10 (7) | −22,066 / 22,194 / 7 (7) |
| A2_material_3 | **−28,773 / 68,924** / 45 (24) | +36,333 / 56,259 / 13 (8) | −4,103 / 52,185 / 16 (11) | −10,887 / 23,665 / 11 (7) | −17,705 / 22,830 / 10 (8) |
| A3_bands_a | **−26,264 / 86,848** / 23 (14) | +51,849 / 42,017 / 8 (4) | −2,991 / 54,524 / 9 (5) | −3,865 / 20,570 / 9 (7) | −9,346 / 21,397 / 8 (6) |
| A3_bands_b | −17,559 / 63,478 / 45 (25) | +45,281 / 44,706 / 10 (6) | −6,198 / 54,279 / 10 (5) | −3,865 / 20,570 / 9 (7) | −9,636 / 21,397 / 10 (7) |
| A4_proportional_05 | **+5,865** / 61,673 / 43 (24) | **−15,363** / 42,017 / 9 (4) | −32,280 / 50,051 / 11 (8) | −24,187 / 27,176 / 8 (8) | −15,245 / 21,066 / 9 (7) |
| A4_proportional_10 | **+9,243** / 62,303 / 31 (18) | **−15,404** / 42,058 / 8 (4) | −33,840 / 52,279 / 8 (5) | −13,317 / 21,995 / 8 (7) | −10,687 / 18,508 / 8 (6) |

### Recovery windows (window P&L; extended set incl. 2026)

| Config | VGTold 2009 | QQQ 2003 | QQQ 2009 | VGT 2020 | VGT 2023 | VGT 2025 | VGT 2026 | QQQ 2020 | QQQ 2023 | QQQ 2025 | QQQ 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | +15,518 | +18,291 | +66,522 | +48,081 | +44,468 | +39,671 | +29,821 | +63,718 | +25,111 | +19,964 | +32,918 |
| A0_net_loss | +29,642 | 0 | +65,938 | +55,455 | +18,901 | +42,023 | **+51,712** | +63,172 | +17,473 | +26,779 | +32,918 |
| A1_price_loss_only | +29,642 | 0 | +65,938 | +55,455 | +18,901 | +42,023 | +29,821 | +63,172 | +18,232 | +26,779 | +32,918 |
| A2_material_05 | +29,642 | 0 | +65,938 | +55,455 | **+44,468** | +42,023 | +29,821 | +63,172 | **+25,111** | +26,779 | +32,918 |
| A2_material_1 | +29,642 | 0 | +65,938 | +55,455 | **+44,468** | +42,023 | +29,821 | +63,172 | +17,473 | +26,779 | +32,918 |
| A2_material_2 | +29,642 | 0 | +65,938 | +55,455 | **+44,468** | +36,993 | +29,821 | +63,172 | +17,473 | +26,779 | +32,918 |
| A2_material_3 | +29,642 | 0 | +65,938 | +48,081 | **+44,468** | +39,671 | +29,821 | +63,718 | +17,473 | +23,433 | +32,918 |
| A3_bands_a | +33,093 | −23 | +69,817 | +55,455 | +18,901 | +42,023 | +32,794 | +63,172 | +17,473 | +26,779 | +32,918 |
| A3_bands_b | +29,642 | 0 | +65,938 | +55,455 | +15,664 | +42,023 | +32,794 | +63,172 | **+25,111** | +26,779 | +32,918 |
| A4_proportional_05 | **0** | −1,251 | **0** | +55,455 | +16,723 | +36,993 | +29,821 | +63,172 | +17,473 | **−3,301** | +32,918 |
| A4_proportional_10 | **0** | −63 | **0** | +55,455 | +16,723 | +36,993 | +29,821 | +63,172 | +17,473 | **−3,301** | +32,918 |

QQQ 2003 stays dead for the whole family: the restrictions overlapping spring 2003 were armed by deep
price losses (−13% to −14%) that every trigger in this family accepts. Loss classification cannot fix
the 2003 basing-period miss; that failure belongs to the discount (Family B) or the reset (Family C).

## 5. Family-specific questions

### 5.1 Financing-only losses under A0: counts and what they blocked

Definition per spec: net P&L < 0 with exit_price ≥ entry_price. Under A0 every losing closed trade
arms, so these counts are complete. Full episode lists with prices in `tmp/analysis.txt` §1.

| Dataset | financing-only / all A0 episodes | baseline trades blocked or delayed during those episodes (window diff, + favors A0) |
|---|---|---|
| VGT 2005–2015 | 2 / 14 | 2015-09-28 **+$5,731 open trade blocked** (−5,731); 2007-11-27 episode blocked nothing |
| QQQ 1999–2015 | 6 / 41 | **2010-08-26 +$19,221 winner blocked** (−19,221; gap to level 1.9%); 2001-05 episode: +$596 and +$2,130 winners blocked, −$5,054 loser delayed (−596, −2,130, +8,334 → net +5,608); 2000-07-12 −$3,860 loser avoided (+3,860); 2004-05-07 (+24); 2012-12-31 none |
| VGT 2016–2026 | 4 / 19 | 2026-03-03 −$111 loser avoided (+111); 2026-03-26 **+$31,094 winner delayed to 2026-03-27 at a LOWER price (+2,973)**; 2026-07-17 −$1,034 delayed (+7,297); 2018-12, 2022-10 episodes resolved in ≤7 sessions, nothing blocked |
| QQQ 2016–2026 | 3 / 14 | 2022-11-04 +$1,925 and 2023-01-04 +$6,879 blocked, 2022-12-19 −$859 avoided (net −7,945); 2018-12, 2024-09 episodes blocked nothing |

**Totals: 15 of 88 episodes (17%). Exactly one major ($10k+) baseline winner was blocked outright by a
financing-only restriction: QQQ 2010-08-26, +$19,221** (armed 2010-08-24 by a −$295 loss whose exit
38.4825 stood 1.4% ABOVE its entry 37.9538 — pure interest; the episode ended in a recovery reset on
2010-09-17 after the entry signal had lapsed). The other large exposure, VGT 2026-03-26 +$31,094, was
*delayed, not lost*, and the delay **made money** (+$2,973): the restriction from the −$2,092
financing-only loss of 2026-02-05 pushed the entry to 2026-03-27 at a better price, and the same
dataset's other financing-only episodes added +$111 and +$7,297. On VGT 2016–2026 the financing-only
restrictions were, in aggregate, the single reason A0 beat the baseline's 2026 recovery window by
+$21.9k (A0 +51,712 vs baseline/A1 +29,821). The brief's "financing-only false trigger" problem is
real but small (one $19k casualty in ~27 years of data), and on one of four datasets the "false"
triggers were strongly profitable. Historical observation, not inference: with one casualty and one
windfall, the financing-only exemption's sign is decided by single episodes.

### 5.2 The VGT 2023-01 episode (the −$143 loss), explicitly

Under the frozen 3% discount, **the January 2023 block is not caused by the −$143 loss.** The A0/A1
restriction that blocked the 2023-01-04 +$28,006 baseline winner was armed on **2022-11-03 by a
−$1,306 loss with price return −0.49%** (entry 38.2451 on 2022-10-07, maximum-hold exit 38.0568;
interest $814 of the $1,306) — a genuine price loss, so A1 arms it too (min gap to the 36.9151 level:
1.55%; resolved only by the 2023-02-15 reset, after the signal lapsed). The famous −$143 trade (entry
2022-12-19 at 39.3976, exit 2023-01-03 at 39.5194 ≥ entry, interest $452 — financing-only) belongs to
the *−5% config's* divergent path in the lower-price-reentry study; within Family A it appears only on
paths that were free to enter in December.

What recovers the winner is the **materiality floor**: all four A2 configs decline the −0.49% trigger
(−0.4924% sits 0.0076 pp above the −0.5% cutoff — see §7), stay normal, take an interim +$4,640 trade
(2022-11-04), take the −$143 trade, decline *that* too (financing-only AND immaterial), and buy
2023-01-04 identically with the baseline: VGT 2023 window +$44,468 vs A0's +$18,901. A3_bands_a/b fail
here because $500/$1,000 < $1,306 (dollar floors arm); A4 fails because any price loss arms and the
January rally never met even its 1% floor level on a signal session before the reset. So: the
episode's correct classification fix is "immaterial price loss", not "financing-only loss".

### 5.3 Do A1/A2 re-open the 2000–2002 repeated-loss problem?

See the bear-window table. A1, A2_material_05, A2_material_1, A2_material_2: window P&L −$16.4k to
−$17.6k vs A0's −$11.5k (≈$5–6k worse, in-window DD +$1–2k worse) — still $74–80k better than the
baseline's −$91.6k, with 25 in-window losing trades vs the baseline's 36. The exempted small losses do
recur (3 extra closed trades in the window) but their 3%-discount protection was worth little there.
**A2_material_3 does re-open it**: −$28.8k window P&L, in-window DD $68.9k, and dataset max DD $95.4k
(worse than A0's $91.5k) — at −3%, materially many cascade losses (15-day exits losing 1–3%) escape
restriction. **A3_bands_a also degrades the window badly** (−$26.3k, in-window DD $86.8k): its $500
floor exempts almost nothing in a cascade, while the 5% band for >$5k losses lengthens restrictions
(653 blocked sessions dataset-wide) through the bear rallies A0 re-entered. Verdict: the repeated-loss
protection survives materiality floors up to −2% (price) or ≈$1,000 (dollars); it starts breaking at
−3%.

### 5.4 Does severity scaling (A4) beat binary rules?

**No on net profit; partially on risk.** Binary-vs-A4 across the four datasets (net vs lower3): A4_05
−9,790 / −3,699 / −26,695 / −43,876; A4_10 −8,057 / +825 / −38,821 / −39,317 — worse than the binary
anchor on 7 of 8 comparisons, and worse than the best A2 config everywhere. Mechanism: after a deep
loss, clip(k·|ret|, 1%, 8%) sits at or near the 8% cap exactly when the market V-bottoms, reproducing
the −8% config's known failures — **both A4s miss March 2009 entirely on BOTH old datasets** (QQQ
2009 window $0 vs +$65,938; A4_05's min gap to its level in the 2009-03-09 episode: 1.1%) and both
turn QQQ 2025 negative (−$3,301 vs +$26,779). The honest other side: A4 produces the family's only
positive 2000–02 windows (+$5,865 / +$9,243) and the family-best max drawdown on QQQ 1999–2015
($61,673 / $62,303 vs A0's $91,469, with the drawdown trough moving from 2008 back to 2002), and its
matched-baseline control deltas on QQQ-old are profit-positive and DD-negative. As a *drawdown*
mechanism it has something; as a replacement for a binary trigger it failed. The 1% floor did what was
hoped at small losses (fast, cheap re-entries — e.g. its November 2022 VGT level was actually
*reached*, min gap −0.5%) but the top of the clip dominates outcomes.

### 5.5 Which config, if any, dominated A0?

None on all four datasets. Closest:

- **A2_material_05**: net ≥ A0 on three datasets (+1,979 / +11,553 / +1,503 vs lower3), −1,431 on
  VGT 2016–2026 (essentially a tie decided by path noise); max DD never better than A0's but within
  +$5.5k of it everywhere (equal on VGT-old; +2.3k QQQ-old; +0.6k VGT-new; +5.5k QQQ-new, the worst
  case). It is the only config that recovers both
  VGT 2023-01 (+$25.6k window improvement) and QQQ 2023 (+$7.6k) while keeping 2000–02 within $6.1k
  of A0.
- **A2_material_1**: the largest family gains (+26,904 QQQ-old with max DD −$13.1k; +2,854 VGT-new)
  but −10,037 on QQQ-new (its 2022-11 path change hurt there) — three of four up, one clearly down.
- A2_material_05 dominates A3_bands_b (equal or better net on all four datasets, equal or better max
  DD) — dollar floors are the same idea done worse, because a fixed dollar floor misclassifies
  hairline price losses on a $100k notional (the −$1,306/−0.49% episode arms at any floor ≤ $1,306).

## 6. Failure cases (named)

- **A1 on VGT 2016–2026 (−$30,637 vs A0):** keeps the 2022-11-03 −0.49% arming (so Jan-2023 stays
  blocked, like A0) *and* gives away A0's profitable financing-only restrictions of 2026 (entered
  identically with the baseline: 2026 window +29,821 vs A0's +51,712) and 2026-07 (+7,297 foregone).
  Worst of both worlds on this dataset.
- **A2_material_3 on QQQ 1999–2015:** re-opens 2000–02 (−$28.8k, DD $68.9k, max DD $95.4k) and on QQQ
  2007-09 degrades to +36,333 with DD $56.3k (its exempted −1–3% losses re-enter into the slide).
  Also VGT 2022: −$10,887 vs A0's −$3,865.
- **A3_bands_a on QQQ 1999–2015:** 653 blocked sessions (A0: 425), 2000–02 in-window DD $86,848; 11
  of 27 episodes hit the 5% band. On VGT 2016–2026 it keeps the Jan-2023 block AND loses 2026
  (−$27,554 vs lower3 overall).
- **A4_proportional_05/_10 on both old datasets:** miss March 2009 completely (2009 windows $0; the
  single largest baseline trade +$57,832 foregone on QQQ, +$21,725 on VGT); QQQ 2016–2026: 2025
  window −$3,301 vs +$26,779 (A0). VGT 2007–09: −$32.3k / −$33.8k vs A0's −$6.2k (the ratcheted
  levels sat below the November 2008 / March 2009 closes on signal sessions).
- **A0's own financing-only casualties** (the family's motivation): QQQ 2010-08-26 +$19,221 blocked
  by a −$295 interest-only loss; VGT 2015-09-28 +$5,731 end-of-data trade blocked by a −$340
  financing-only loss nine sessions before the file ends.

## 7. Dependence on few trades

The family's rankings hinge on a handful of episodes, and one of them is knife-edge in *trigger* space
(a new sensitivity axis this family introduces — the prior study's knife edges were in price space):

- **VGT 2022-11-03, price return −0.4924% vs the −0.5% cutoff (0.0076 pp!):** decides ±$29.2k between
  A1 and A2_material_05 on VGT 2016–2026 (and the whole VGT-2023 recovery row). A trade priced one
  cent differently flips it. Any validation must test cutoff perturbations around this episode.
- QQQ 2010-08-24 (−$295 financing-only): ±$19.2k, most of A1's QQQ-old gain over A0.
- VGT 2026 financing-only episodes: ±$21.9k of A0's advantage over A1/baseline in the 2026 window.
- A2_material_1 vs A2_material_05 on QQQ-old (+$15.3k, DD −$15.4k): a few exempted −0.5%..−1% losses
  around 2004–2012 reset-churn episodes.
- A4 vs everything on the old datasets: one blocked entry each (2009-03-06/09), worth $57.8k (QQQ) and
  $21.7k (VGT).
- A2_material_2's QQQ-old win (+$29.8k vs lower3) erodes to +$5.9k at −3%: the −2%→−3% step flips
  ~$24k, mostly inside 2000–02.

## 8. Per-config classification

Historical observation = what happened on these four frozen datasets; inference = expected
generalization, which multiple-testing and the single-episode dependencies above limit severely.

| Config | Classification | Basis |
|---|---|---|
| A0_net_loss | Anchor (= existing 3%) | Reproduced REF_lower3 trade for trade (runner gate). |
| A1_price_loss_only | **Unpromising** as a standalone fix | Observation: does NOT fix VGT 2023-01 (the blocker is a price loss); wins old datasets (+5.7k/+11.6k) on two single episodes, loses both new ones (−30.6k/−2.4k). Inference: exempting financing-only losses alone buys the one 2010-type episode but randomly forfeits beneficial restrictions. |
| A2_material_05 | **Promising** | Observation: ≥ lower3 on 3 of 4 datasets, −1.4k on the fourth; fixes VGT+QQQ 2023; 2000–02 within $6.1k of A0. Inference: the most defensible classification rule found, BUT its headline VGT win rests on a 0.0076 pp trigger margin — validation must include cutoff sensitivity. |
| A2_material_1 | **Promising** (co-flagged) | Observation: largest gains (QQQ-old +26.9k net, −13.1k DD; beats BOTH matched controls there); −10.0k on QQQ-new. Inference: same mechanism as A2_05 with more exemption; the QQQ-old dominance over both matched controls is the family's strongest single result. |
| A2_material_2 | Inconclusive | Observation: QQQ-old star (+29.8k, beats both controls), VGT-old +25.7k, but −2.4k / −18.6k on the new datasets. Inference: regime-dependent; the old-dataset gains look like the same "trade more in basing periods" effect the controls partly discount. |
| A2_material_3 | **Unpromising** | Observation: re-opens 2000–02 (−28.8k, max DD 95.4k) and VGT 2022; −17k/−18.8k vs lower3 on the new datasets. The spec's feared failure mode, observed. |
| A3_bands_a | **Unpromising** (as parameterized) | Observation: 2000–02 DD blow-out ($86.8k), VGT-new −27.6k; wins only VGT-old (+8.9k) and marginally QQQ-old. The 5% band re-imports the −5% config's V-bottom problem; the $500 floor frees almost nothing that matters. |
| A3_bands_b | **Unpromising** | Observation: strictly ≤ A2_material_05 on every dataset (equal VGT-old/QQQ-new, −1.2k QQQ-old, −29.4k VGT-new). Dollar floors are an inferior encoding of materiality at fixed position size. |
| A4_proportional_05 | **Unpromising** | Observation: worse than lower3 everywhere (−3.7k to −43.9k); misses 2009 twice and QQQ 2025. |
| A4_proportional_10 | **Unpromising** on net; note the risk result | Observation: −39k/−39k on the new datasets, misses 2009 twice; but family-best 2000–02 (+$9.2k) and QQQ-old max DD $62.3k. Inference: proportional severity is a drawdown tool, not a profit tool; if anything survives to validation it is the *idea* of a floor ≈1% after small losses, not the k·|ret| ramp. |

## 9. Flagged for the validation stage (not explored further here)

1. **A2_material_05 / A2_material_1** as the family's candidates, with mandatory sensitivity of the
   cutoff across [−0.25%, −1.5%] *at the episode level* (the VGT 2022-11-03 −0.4924% knife edge and
   the QQQ-old −0.5%→−1% step worth +$15.3k are the two known cliffs). No intermediate cutoffs were
   run here (grid discipline).
2. The interaction "materiality floor × discount size" for Family G: A2's floor fixes a *trigger*
   failure (2023-01) that Families B/C try to fix with *level/reset* changes; combining A2_05 with a
   B/C mechanism may be complementary rather than redundant. Conversely A3_bands_a shows
   floor × bigger-discount combines badly.
3. The financing-only phenomenon is worth ONE registry line in any combined design (exempting them is
   nearly free on old data, harmful on VGT-new) — but it should not carry a config on its own.
4. A4's clip floor (1%) helped, its ramp hurt; if severity scaling returns in G, cap the *maximum*
   requirement at ≈3% (i.e. clip(k·|ret|, 1%, 3%)) rather than 8%. Not run here; inference only.
5. QQQ 2003 remains unfixed by every Family A config — reserve for B/C.

## 10. Verification performed

`verify_spotchecks.py` → `tmp/verification.txt`: **300 checks, 0 failures.**

- Counter/episode consistency for all 40 (dataset × config) runs: events rows = armed episodes;
  armed + declined = losing closed trades; re-entry/reset counters = event resolutions; blocked-session
  counters = per-episode block lists (net of reset-priority blocks, 0 everywhere); zero alt entries;
  and the trigger predicate re-applied to each config's own closed-trade list reproduces its episode
  count exactly (e.g. the A2 cutoffs classify every trade the way the state machine did).
- **Spot-check (a)** — A2_material_05, VGT 2016–2026, the declined 2022-11-03 trigger: raw prices give
  entry 38.2451 (2022-10-07 close), maximum-hold exit 38.0568, price return −0.492351% > −0.5% →
  correctly declined (net −$1,306 < 0, so A0 arms it). Confirmed 2023-01-04 close 38.9505 vs
  previous-90-session high 46.0645 = 15.44% dip (signal valid), A2_05 holds the +$28,006 trade
  identically, while A0's frozen level 36.9151 (= 38.0568 × 0.97) sits 5.5% below that close →
  blocked under A0. Also confirmed the −$143 trade on A2_05's own path (39.3976 → 39.5194,
  financing-only, declined).
- **Spot-check (b)** — A2_material_1, QQQ 1999–2015, cascade episode arming 2001-02-13 (−$14,416,
  price return −13.96%, frozen exit 48.8746, ref high 80.7369): required level 47.4084 = 48.8746 ×
  0.97; re-entry 2001-02-16 at close 46.7426 ≤ level; scan of every intermediate session confirms no
  earlier close was both ≤ level and a 10%-signal session (no skipped entry), and no close reached
  the 0.95 × ref-high reset.
- **Spot-check (c)** — A0, QQQ 1999–2015, financing-only episode arming 2010-08-24 (−$295, exit
  38.4825 ≥ entry 37.9538): required level 37.3280; the blocked baseline winner's entry session
  2010-08-26 closed at 38.1019, 2.07% above the level (block real); reset on 2010-09-17 at close
  42.0977 ≥ 0.95 × 44.2347 = 42.0230, with no earlier session qualifying for reset or entry.
- **Spot-check (d)** — A4_proportional_10, QQQ 1999–2015, 2001-02-13 episode: stored
  required-level-at-entry 44.9646 equals 48.8746 × (1 − clip(0.1396, 1%, 8%)) = 48.8746 × 0.92
  exactly (clip engaged at the 8% cap).

## 11. Reproducing

```
PY=<frozen research venv python>
cd research/risk-management/adaptive-reentry/loss-classification
$PY run.py                # registers (first run only) + 40 runs through common/runner (calibration-gated)
$PY analyze.py            # tmp/analysis.txt (all tables in §3–§7 of this report)
$PY verify_spotchecks.py  # tmp/verification.txt (300 checks)
```
