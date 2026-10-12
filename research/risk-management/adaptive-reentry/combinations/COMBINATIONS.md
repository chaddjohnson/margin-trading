# Family G — combinations (experiment `adaptive_combinations`)

Combines the promising mechanisms from the completed standalone families A–F per the coordinator's
fixed combination matrix. 17 configurations (7 standalone ablation legs rerun for a clean single
`summary.json`, 10 combos), 68 runs, calibration gate passed on all four datasets.
`registry.jsonl` was written before the first run; no configs were added or tuned afterwards.

**Multiple-testing statement (read first).** These ~17 configurations were evaluated after roughly
100 prior Phase-2 configurations, on the SAME four datasets on which every ingredient was selected
for being promising. Every number below is therefore exploratory, selection-biased by construction,
and several headline edges hinge on one or two trades (§7). Nothing in this report is a validated
expectation; the validation stage exists for that.

## 1. Hypotheses as registered

Full text in `registry.jsonl` (17 entries, registered 2026-10-12 before any run). In brief:
G2/G3/G4/G5 combine a micro-arming fix (D7 tiny-loss exit anchor, or A2 material-loss trigger) with
a stale-grind fix (B7_stall decay) and/or a reset-obsolescence fix (C6 38% retrace reset),
hypothesized to be ~additive because they act on distinct failure mechanisms; G6 tests the
pre-stated hypothesis that stall-decay + graduated-rebound double relaxation is redundant or
harmful; G7 pairs the tiny anchor with the graduated discount (most conservative combo); G8 tests
whether A2's never-arm cancels C6's indirect rescues; G9a/G9b test Family C's reset guard,
including the pre-registered analytic prediction that the guard is vacuous for an exit-price reset
(0.97 × 1.02 = 0.9894 < 1); G10 is the loss-magnitude bimodal level (tiny ⇒ exit anchor, severe ⇒
B2_inverse relaxation).

## 2. Exact mechanism definitions

All components are verbatim copies; sources cited per component in `strategies.py`:

- **A2_material_1 trigger** (`loss-classification/strategies.py`, `material_trigger(0.01)`):
  arm only when `exit_price / entry_price − 1 ≤ −1%`; other losses never restrict.
- **D7 tiny-loss exit anchor** (`recovery-opportunities/strategies.py`,
  `d7_tiny_loss_exit_anchor`): when the arming |net loss| < $2,000, the required level is the
  frozen loss-exit price (no 3% discount). G_D7tiny uses the verbatim alt-entry form; the combos
  express the same admission set through `required_level` (identical trade sequences; G2 ≡
  G_D7tiny trade-for-trade on the three datasets where the stall never binds confirms this).
- **B7_stall level** (`adaptive-discounts/strategies.py`, `b7_stall`): discount 3% while
  `i − min_close_i < 20`, then `0.03 · max(0, 1 − (age−20)/60)`.
- **B2_inverse level** (`adaptive-discounts/strategies.py`, `b2_inverse`): discount
  `clip(3% − 0.5·|price_return|, 0.5%, 3%)` off the loss exit.
- **C6_retrace_38 reset** (`recovery-resets/strategies.py`, `retrace_reset(0.38)`): reset when
  `close ≥ min_close + 0.38 · (ref_high − min_close)`.
- **C11 graduated level** (`recovery-resets/strategies.py`, `graduated_level`): 3% until the close
  has (ever, within the episode) reached 1.08 × the then-known episode low, thereafter 1.5%
  (sticky); reset stays C1 frozen-high 95%.
- **Reset guard** (coordinator notes, Family C proposal): a reset may fire only if
  `close > required level × 1.02`; with the fixed 3% level the guard constant is
  `exit × 0.9894`.
- **G6** uses `discount = min(d_stall, d_graduated)`; **G10** uses tiny ⇒ exit anchor, else
  B2_inverse; combos otherwise compose trigger/level/reset exactly as named in §1.

Defaults everywhere else: net-loss trigger, fixed 3% off the loss exit, C1 frozen-high 95% reset
(`common/framework.py`). No indicators are read; `indicator_fallbacks` = 0 in all 68 runs.

## 3. Results per dataset

Net / max DD / P/DD / closed trades / W–L / blocked sessions / re-entries (price-path + alt) /
resets / false resets. `vs base` and `vs 3%` are net deltas against the full-size baseline and the
existing 3% strategy; `mCtl` / `mL3` are net Δ, DD Δ against the matched-exposure baseline control
and the (ex-post) matched 3% control.

### VGT_2005_2015 (baseline 11,602/73,404; existing 3% 26,384/54,279)

| config | net | DD | P/DD | tr | W–L | blk | re | rst | fRst | vs base | vs 3% | mCtl Δnet/Δdd | mL3 Δnet/Δdd |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REF_lower3 | 26,384 | 54,279 | 0.49 | 22 | 8–14 | 274 | 8 | 5 | 4 | +14,782 | 0 | +19,130/+8,383 | 0/0 |
| G_A2m1 | 28,363 | 54,279 | 0.52 | 24 | 8–16 | 269 | 6 | 3 | 2 | +16,761 | +1,979 | +20,512/+4,612 | −189/−4,459 |
| G_D7tiny | 30,734 | 58,645 | 0.52 | 28 | 9–19 | 215 | 15 | 4 | 3 | +19,132 | +4,350 | +22,766/+8,236 | +1,756/−970 |
| G_B7stall | 26,384 | 54,279 | 0.49 | 22 | 8–14 | 274 | 8 | 5 | 4 | +14,782 | 0 | +19,130/+8,383 | 0/0 |
| G_B2inv | 26,602 | 52,761 | 0.50 | 22 | 7–15 | 273 | 9 | 5 | 4 | +14,999 | +218 | +19,362/+6,957 | +271/−1,408 |
| G_C6r38 | 22,980 | 50,127 | 0.46 | 28 | 7–21 | 210 | 10 | 11 | 9 | +11,378 | −3,404 | +15,061/+27 | −5,820/−9,123 |
| G_C11grad | 42,538 | 54,279 | 0.78 | 23 | 9–14 | 263 | 9 | 4 | 3 | +30,935 | +16,153 | +34,306/+2,201 | +12,600/−7,310 |
| G2_tiny_stall | 30,734 | 58,645 | 0.52 | 28 | 9–19 | 215 | 15 | 4 | 3 | +19,132 | +4,350 | +22,766/+8,236 | +1,756/−970 |
| G3_tiny_retrace | 17,133 | 49,959 | 0.34 | 31 | 8–23 | 192 | 14 | 9 | 7 | +5,531 | −9,251 | +8,115/−7,095 | −15,665/−17,515 |
| G4_A2m1_stall | 28,363 | 54,279 | 0.52 | 24 | 8–16 | 269 | 6 | 3 | 2 | +16,761 | +1,979 | +20,512/+4,612 | −189/−4,459 |
| G5_tiny_stall_retrace | 17,133 | 49,959 | 0.34 | 31 | 8–23 | 192 | 14 | 9 | 7 | +5,531 | −9,251 | +8,115/−7,095 | −15,665/−17,515 |
| G6_stall_grad | 42,538 | 54,279 | 0.78 | 23 | 9–14 | 263 | 9 | 4 | 3 | +30,935 | +16,153 | +34,306/+2,201 | +12,600/−7,310 |
| G7_tiny_grad | 28,747 | 58,645 | 0.49 | 28 | 9–19 | 211 | 15 | 4 | 3 | +17,144 | +2,363 | +20,759/+8,113 | −302/−1,117 |
| G8_A2m1_retrace | 26,600 | 50,883 | 0.52 | 32 | 8–24 | 185 | 7 | 6 | 5 | +14,997 | +216 | +17,518/−6,573 | −6,429/−17,067 |
| G9a_retrace_guard | 22,980 | 50,127 | 0.46 | 28 | 7–21 | 210 | 10 | 11 | 9 | +11,378 | −3,404 | +15,061/+27 | −5,820/−9,123 |
| G9b_exitreset_guard | 7,625 | 77,691 | 0.10 | 44 | 11–33 | 10 | 8 | 25 | 20 | −3,978 | −18,759 | −3,856/+5,060 | −34,128/−8,205 |
| G10_bimodal | 31,685 | 57,127 | 0.55 | 28 | 8–20 | 216 | 16 | 4 | 3 | +20,083 | +5,301 | +23,742/+6,873 | +2,796/−2,306 |

### QQQ_1999_2015 (baseline −2,886/149,561; existing 3% 40,258/91,469)

| config | net | DD | P/DD | tr | W–L | blk | re | rst | fRst | vs base | vs 3% | mCtl Δnet/Δdd | mL3 Δnet/Δdd |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REF_lower3 | 40,258 | 91,469 | 0.44 | 69 | 28–41 | 425 | 31 | 10 | 7 | +43,144 | 0 | +41,968/+2,844 | 0/0 |
| G_A2m1 | 67,162 | 78,370 | 0.86 | 77 | 31–46 | 337 | 27 | 6 | 4 | +70,048 | +26,904 | +69,346/−34,803 | +15,753/−38,435 |
| G_D7tiny | 73,678 | 69,850 | 1.05 | 76 | 31–45 | 369 | 38 | 7 | 5 | +76,563 | +33,419 | +75,915/−46,139 | +20,989/−49,861 |
| G_B7stall | 61,425 | 70,302 | 0.87 | 73 | 30–43 | 378 | 33 | 10 | 7 | +64,311 | +21,167 | +63,194/−21,391 | +19,773/−24,334 |
| G_B2inv | 54,819 | 72,722 | 0.75 | 81 | 34–47 | 257 | 39 | 8 | 6 | +57,705 | +14,561 | +57,056/−43,194 | +2,164/−46,914 |
| G_C6r38 | 64,997 | 70,917 | 0.92 | 77 | 32–45 | 370 | 33 | 12 | 8 | +67,882 | +24,738 | +66,996/−32,689 | +17,933/−36,014 |
| G_C11grad | 55,454 | 73,125 | 0.76 | 75 | 30–45 | 364 | 35 | 10 | 7 | +58,340 | +15,196 | +57,234/−19,109 | +13,556/−22,069 |
| G2_tiny_stall | 73,678 | 69,850 | 1.05 | 76 | 31–45 | 369 | 38 | 7 | 5 | +76,563 | +33,419 | +75,915/−46,139 | +20,989/−49,861 |
| G3_tiny_retrace | 67,435 | 58,621 | 1.15 | 86 | 35–51 | 303 | 39 | 12 | 9 | +70,320 | +27,176 | +69,813/−64,623 | +11,450/−68,579 |
| G4_A2m1_stall | 87,165 | 63,294 | 1.38 | 81 | 33–48 | 289 | 28 | 6 | 4 | +90,051 | +46,907 | +89,409/−52,984 | +34,346/−56,715 |
| G5_tiny_stall_retrace | 67,435 | 58,621 | 1.15 | 86 | 35–51 | 303 | 39 | 12 | 9 | +70,320 | +27,176 | +69,813/−64,623 | +11,450/−68,579 |
| G6_stall_grad | 55,454 | 73,125 | 0.76 | 75 | 30–45 | 364 | 35 | 10 | 7 | +58,340 | +15,196 | +57,234/−19,109 | +13,556/−22,069 |
| G7_tiny_grad | 63,819 | 75,139 | 0.85 | 79 | 32–47 | 340 | 40 | 7 | 5 | +66,705 | +23,561 | +66,076/−41,860 | +10,672/−45,615 |
| G8_A2m1_retrace | 87,890 | 65,407 | 1.34 | 85 | 35–50 | 280 | 26 | 8 | 5 | +90,776 | +47,632 | +90,365/−62,892 | +29,610/−67,009 |
| G9a_retrace_guard | 64,997 | 70,917 | 0.92 | 77 | 32–45 | 370 | 33 | 12 | 8 | +67,882 | +24,738 | +66,996/−32,689 | +17,933/−36,014 |
| G9b_exitreset_guard | 13,119 | 114,608 | 0.11 | 104 | 37–67 | 24 | 21 | 46 | 30 | +16,005 | −27,139 | +15,877/−28,346 | −51,819/−32,934 |
| G10_bimodal | 61,283 | 76,858 | 0.80 | 88 | 36–52 | 221 | 46 | 6 | 4 | +64,168 | +21,024 | +63,773/−52,235 | +2,642/−56,377 |

### VGT_2016_2026 (baseline 161,772/38,323; existing 3% 182,094/28,687)

| config | net | DD | P/DD | tr | W–L | blk | re | rst | fRst | vs base | vs 3% | mCtl Δnet/Δdd | mL3 Δnet/Δdd |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REF_lower3 | 182,094 | 28,687 | 6.35 | 32 | 13–19 | 138 | 15 | 4 | 2 | +20,322 | 0 | +63,993/+710 | 0/0 |
| G_A2m1 | 184,948 | 29,336 | 6.30 | 38 | 16–22 | 76 | 10 | 2 | 0 | +23,175 | +2,854 | +38,953/−5,249 | −40,155/−6,127 |
| G_D7tiny | 195,238 | 28,436 | 6.87 | 37 | 15–22 | 80 | 20 | 2 | 0 | +33,465 | +13,144 | +45,981/−6,923 | −34,895/−7,820 |
| G_B7stall | 182,094 | 28,687 | 6.35 | 32 | 13–19 | 138 | 15 | 4 | 2 | +20,322 | 0 | +63,993/+710 | 0/0 |
| G_B2inv | 228,043 | 28,687 | 7.95 | 35 | 16–19 | 76 | 17 | 2 | 1 | +66,271 | +45,949 | +83,247/−5,615 | +4,788/−6,485 |
| G_C6r38 | 215,011 | 28,687 | 7.50 | 37 | 15–22 | 99 | 16 | 6 | 4 | +53,239 | +32,917 | +72,345/−5,110 | −4,959/−5,967 |
| G_C11grad | 182,094 | 28,687 | 6.35 | 32 | 13–19 | 138 | 15 | 4 | 2 | +20,322 | 0 | +63,993/+710 | 0/0 |
| G2_tiny_stall | 195,238 | 28,436 | 6.87 | 37 | 15–22 | 80 | 20 | 2 | 0 | +33,465 | +13,144 | +45,981/−6,923 | −34,895/−7,820 |
| G3_tiny_retrace | 192,618 | 34,678 | 5.55 | 40 | 16–24 | 53 | 20 | 4 | 2 | +30,846 | +10,524 | +33,442/−3,030 | −52,808/−3,987 |
| G4_A2m1_stall | 184,948 | 29,336 | 6.30 | 38 | 16–22 | 76 | 10 | 2 | 0 | +23,175 | +2,854 | +38,953/−5,249 | −40,155/−6,127 |
| G5_tiny_stall_retrace | 192,618 | 34,678 | 5.55 | 40 | 16–24 | 53 | 20 | 4 | 2 | +30,846 | +10,524 | +33,442/−3,030 | −52,808/−3,987 |
| G6_stall_grad | 182,094 | 28,687 | 6.35 | 32 | 13–19 | 138 | 15 | 4 | 2 | +20,322 | 0 | +63,993/+710 | 0/0 |
| G7_tiny_grad | 189,684 | 29,443 | 6.44 | 35 | 14–21 | 125 | 19 | 2 | 0 | +27,911 | +7,590 | +46,219/−4,543 | −31,519/−5,405 |
| G8_A2m1_retrace | 200,595 | 28,208 | 7.11 | 39 | 17–22 | 67 | 10 | 3 | 1 | +38,822 | +18,501 | +47,477/−8,065 | −35,491/−8,985 |
| G9a_retrace_guard | 215,011 | 28,687 | 7.50 | 37 | 15–22 | 99 | 16 | 6 | 4 | +53,239 | +32,917 | +72,345/−5,110 | −4,959/−5,967 |
| G9b_exitreset_guard | 169,554 | 36,478 | 4.65 | 44 | 18–26 | 12 | 7 | 19 | 12 | +7,781 | −12,540 | +9,379/−1,467 | −77,413/−2,430 |
| G10_bimodal | 187,076 | 30,540 | 6.13 | 36 | 15–21 | 88 | 19 | 2 | 0 | +25,303 | +4,982 | +38,751/−4,597 | −41,619/−5,488 |

### QQQ_2016_2026 (baseline 116,388/39,237; existing 3% 132,242/23,564)

| config | net | DD | P/DD | tr | W–L | blk | re | rst | fRst | vs base | vs 3% | mCtl Δnet/Δdd | mL3 Δnet/Δdd |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REF_lower3 | 132,242 | 23,564 | 5.61 | 27 | 13–14 | 111 | 10 | 4 | 1 | +15,854 | 0 | +35,187/−9,155 | 0/0 |
| G_A2m1 | 122,206 | 29,106 | 4.20 | 28 | 13–15 | 108 | 8 | 3 | 0 | +5,817 | −10,037 | +24,926/−3,689 | −10,342/+5,487 |
| G_D7tiny | 122,725 | 31,521 | 3.89 | 27 | 13–14 | 142 | 11 | 3 | 1 | +6,336 | −9,518 | +26,398/−952 | −8,525/+8,134 |
| G_B7stall | 132,242 | 23,564 | 5.61 | 27 | 13–14 | 111 | 10 | 4 | 1 | +15,854 | 0 | +35,187/−9,155 | 0/0 |
| G_B2inv | 93,608 | 29,423 | 3.18 | 27 | 11–16 | 102 | 11 | 5 | 1 | −22,780 | −38,634 | +6,639/+105 | −24,891/+8,308 |
| G_C6r38 | 134,055 | 26,851 | 4.99 | 30 | 14–16 | 74 | 11 | 5 | 2 | +17,666 | +1,812 | +27,865/−8,947 | −10,633/+1,070 |
| G_C11grad | 132,242 | 23,564 | 5.61 | 27 | 13–14 | 111 | 10 | 4 | 1 | +15,854 | 0 | +35,187/−9,155 | 0/0 |
| G2_tiny_stall | 122,004 | 32,243 | 3.78 | 27 | 13–14 | 129 | 11 | 3 | 1 | +5,615 | −10,239 | +24,612/−590 | −10,697/+8,597 |
| G3_tiny_retrace | 108,287 | 51,099 | 2.12 | 33 | 13–20 | 82 | 14 | 6 | 4 | −8,101 | −23,955 | +416/+14,734 | −38,691/+24,909 |
| G4_A2m1_stall | 122,206 | 29,106 | 4.20 | 28 | 13–15 | 108 | 8 | 3 | 0 | +5,817 | −10,037 | +24,926/−3,689 | −10,342/+5,487 |
| G5_tiny_stall_retrace | 108,287 | 51,099 | 2.12 | 33 | 13–20 | 82 | 14 | 6 | 4 | −8,101 | −23,955 | +416/+14,734 | −38,691/+24,909 |
| G6_stall_grad | 132,242 | 23,564 | 5.61 | 27 | 13–14 | 111 | 10 | 4 | 1 | +15,854 | 0 | +35,187/−9,155 | 0/0 |
| G7_tiny_grad | 121,723 | 32,716 | 3.72 | 28 | 13–15 | 120 | 12 | 3 | 1 | +5,335 | −10,519 | +23,659/−344 | −11,894/+8,907 |
| G8_A2m1_retrace | 130,897 | 30,446 | 4.30 | 32 | 15–17 | 63 | 9 | 3 | 1 | +14,509 | −1,345 | +21,289/−6,505 | −18,448/+3,834 |
| G9a_retrace_guard | 134,055 | 26,851 | 4.99 | 30 | 14–16 | 74 | 11 | 5 | 2 | +17,666 | +1,812 | +27,865/−8,947 | −10,633/+1,070 |
| G9b_exitreset_guard | 101,759 | 55,135 | 1.85 | 35 | 15–20 | 8 | 2 | 18 | 12 | −14,629 | −30,483 | −13,004/+16,446 | −54,611/+27,271 |
| G10_bimodal | 91,396 | 32,771 | 2.79 | 29 | 12–17 | 91 | 13 | 4 | 1 | −24,993 | −40,847 | +1,457/+2,451 | −31,150/+10,935 |

**Σ net across the four datasets**: G8 445,982 > G9a/G_C6r38 437,043 > G4 422,682 > G_D7tiny
422,374 ≈ G2 421,654 > G6/G_C11grad 412,328 > G7 403,973 ≈ G_B2inv ≈ G_A2m1 ≈ G_B7stall ~402–403k >
G3/G5 385,473 > REF 380,979 > **G10 371,440 (below REF)** > G9b 292,057.

## 4. Bear and recovery windows

Window P&L (max DD inside the window in parentheses where it matters):

| config | QQQ 2000–02 | QQQ 2007–09 | VGT 2007–09 | VGT 2022 | QQQ 2022 | QQQ 2003 | QQQ 2009 | VGT 2009 | VGT 2020 | VGT 2023 | VGT 2025 | VGT 2026 | QQQ-n 2023 | QQQ-n 2025 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REF_lower3 | −11,471 (61,251) | 45,281 | −6,198 | −3,865 | −9,942 | 0 | 65,938 | 29,642 | 55,455 | 18,901 | 42,023 | 51,712 | 17,473 | 26,779 |
| G_A2m1 | −17,559 | 47,886 | −6,198 | −165 | −13,537 | 0 | 65,938 | 29,642 | 55,455 | 44,468 | 42,023 | 29,821 | 17,473 | 26,779 |
| G_D7tiny | −16,251 (56,693) | 48,007 | −8,006 | −6,076 | −18,605 | 0 | 65,938 | 29,642 | 55,455 | 44,468 | 36,993 | 47,148 | 25,111 | 26,779 |
| G_B7stall | **+9,718** | 45,281 | −6,198 | −3,865 | −9,942 | −23 | 65,938 | 29,642 | 55,455 | 18,901 | 42,023 | 51,712 | 17,473 | 26,779 |
| G_B2inv | −8,691 | 32,600 | −5,246 | −9,934 | −18,497 | −1,210 | 69,817 | 33,093 | 55,455 | 50,581 | 42,023 | 51,712 | 17,473 | **−3,301** |
| G_C6r38 | −12,184 | 45,281 | −2,045 | −6,555 | −13,934 | **+15,444** | 65,938 | 29,642 | 55,455 | 50,581 | 42,023 | 48,739 | 18,232 | 26,779 |
| G_C11grad | **+5,926** | 42,966 | −8,185 | −3,865 | −9,942 | −23 | 63,623 | 27,654 | 55,455 | 18,901 | 42,023 | 51,712 | 17,473 | 26,779 |
| G2_tiny_stall | −16,251 | 48,007 | −8,006 | −6,076 | −19,326 | 0 | 65,938 | 29,642 | 55,455 | 44,468 | 36,993 | 47,148 | 25,111 | 26,779 |
| G3/G5 | −20,418 (58,025) | 48,007 | −3,532 | −14,794 | **−38,182 (40,541)** | +15,403 | 65,938 | 29,642 | 55,455 | 44,468 | 36,993 | 44,176 | 25,111 | 26,779 |
| G4_A2m1_stall | **+2,507** | 47,886 | −6,198 | −165 | −13,537 | −63 | 65,938 | 29,642 | 55,455 | 44,468 | 42,023 | 29,821 | 17,473 | 26,779 |
| G6_stall_grad | +5,926 | 42,966 | −8,185 | −3,865 | −9,942 | −23 | 63,623 | 27,654 | 55,455 | 18,901 | 42,023 | 51,712 | 17,473 | 26,779 |
| G7_tiny_grad | −23,931 | 45,693 | −9,993 | −11,630 | −19,606 | 0 | 63,623 | 27,654 | 55,455 | 44,468 | 36,993 | 47,148 | 25,111 | 26,779 |
| G8_A2m1_retrace | −19,395 (64,811) | 47,886 | −2,801 | −165 | −17,529 | +15,403 | 65,938 | 29,642 | 55,455 | 44,468 | 42,023 | 29,821 | 25,111 | 26,779 |
| G9a_retrace_guard | −12,184 | 45,281 | −2,045 | −6,555 | −13,934 | +15,444 | 65,938 | 29,642 | 55,455 | 50,581 | 42,023 | 48,739 | 18,232 | 26,779 |
| G9b_exitreset_guard | **−57,079 (114,608)** | 9,728 | −31,670 | −19,207 | −42,218 | +14,535 | 52,014 | 29,314 | 52,250 | 47,345 | 36,373 | 29,821 | 23,335 | 23,433 |
| G10_bimodal | −16,157 (73,130) | 26,378 | −7,055 | −14,238 | −19,854 | −1,251 | 65,938 | 33,093 | 55,455 | 44,468 | 36,993 | 47,148 | 25,111 | **−3,301** |

(2020 QQQ-new = 63,172 for every config except G9b 63,718; 2026 QQQ-new = 32,918 everywhere.)

## 5. Ablation tables (combo vs legs vs REF; net/DD per dataset)

Format: VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26.

### G2_tiny_stall = D7tiny ⊕ B7stall

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G2 | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,004/32,243 |
| G_D7tiny | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 |
| G_B7stall | 26,384/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: no distinct contribution from the stall; mild harm.** G2 is trade-identical to G_D7tiny
on three datasets; the stall level was entry-decisive exactly once in 26 years (QQQ-new
2022-09-23: the June-2022 low aged through the summer rally, the decayed level 272.60 admitted
re-entry at close 271.09 where D7tiny waited for 262.97 on 09-30) and that one decision cost −721
net / +722 DD. Crucially, B7_stall's entire QQQ-old edge (+21,167 standalone) **vanishes on the
D7tiny path**: zero stall-decisive entries there, because the tiny anchor keeps the trade cycle
turning (e.g. its 2002-07-10 alt entry exits PROFITABLY on 07-19 and clears the correction), so
episode lows never go stale. The components do not add; D7tiny's path pre-empts the stall.

### G3_tiny_retrace = D7tiny ⊕ C6r38 (and G5 = G3 ⊕ B7stall)

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G3 (=G5) | 17,133/49,959 | 67,435/58,621 | 192,618/34,678 | 108,287/51,099 |
| G_D7tiny | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 |
| G_C6r38 | 22,980/50,127 | 64,997/70,917 | 215,011/28,687 | 134,055/26,851 |
| G_B7stall (G5 only) | 26,384/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: interference, era-asymmetric.** G3 < max(legs) on net on all four datasets and < both
legs on three. One genuine distinct-benefit cell exists: QQQ-old, where the tiny anchor's net gains
and the retrace reset's DD relief combine into the program's best old-era P/DD (1.15, DD 58,621)
and the 2003 rescue (+15,403) survives. Everywhere else the components compound each other's
permissiveness: in QQQ-new 2022 the tiny anchor re-admitted after every small loss
(2022-03-01 re-entry only 0.30% below the failed exit; 2022-09-13 4.8% below a financing-only
−$167 exit) while C6 resets re-admitted after every bear rally (2022-03-29 reset → 03-31 entry @
355.40 into the April collapse −7,490; 07-29 reset → 08-01 entry −1,028; 11-15 reset → 11-16 entry
−2,374): 13 trades in calendar 2022, 12 losers, window −38,182, DD 51,099 — a miniature of the
2000–02 repeated-entry problem, rebuilt from two individually-promising parts. **G5 ≡ G3
trade-for-trade on all four datasets**: adding the stall to the full stack changed literally
nothing (C6 resets or tiny anchors always resolved episodes before the decay could bind).

### G4_A2m1_stall = A2m1 ⊕ B7stall

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G4 | 28,363/54,279 | 87,165/63,294 | 184,948/29,336 | 122,206/29,106 |
| G_A2m1 | 28,363/54,279 | 67,162/78,370 | 184,948/29,336 | 122,206/29,106 |
| G_B7stall | 26,384/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: cleanly additive — the model combination of the family.** G4 ≡ G_A2m1 trade-for-trade
on three datasets; on QQQ-old the stall contributes +20,003 net / −15,076 DD on top of A2m1,
nearly its full standalone edge (+21,167). Mechanism verified at raw prices: exactly ONE
stall-decisive entry (2002-09-19: episode armed 2002-08-05 at exit 18.7474; low 18.1787 set on the
arming day, age 32 ⇒ discount 2.40%, level 18.2975 ≥ close 18.2941 > the 3% level 18.1850), which
re-phases the cycle so 2002-10-07 @ 17.0949 catches the October-2002 bottom (+21,285, the same
trade that carries C11's and B7_stall's standalone QQQ-old edges). 2000–02 window **positive**
(+2,507). The components act on disjoint episodes because A2m1 leaves material episodes exactly as
REF has them — the stall then sees the same episode structure it was validated on.

### G6_stall_grad = min(d_stall, d_graduated), the double-relaxation test

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G6 | 42,538/54,279 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 |
| G_C11grad | 42,538/54,279 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 |
| G_B7stall | 26,384/54,279 | 61,425/70,302 | 182,094/28,687 | 132,242/23,564 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: redundant, exactly as hypothesized — but not harmful.** G6 is trade-identical to
G_C11grad on all four datasets: the graduated 1.5% (which activates on an 8% rebound, typically
within days at a turn) always relaxes before the stall decay (which needs a 50+-session-old low to
go below 1.5%) can matter, and on the C11-shaped path the lone stall-decisive setup (QQQ-old
Sept 2002) never arises. The feared harmful case (bear rallies that both rebound 8% and freeze the
low for 20+ sessions) never produced an entry either mechanism alone would have refused. Note the
asymmetric redundancy: min() inherits C11, and in doing so **loses** B7stall's +21k QQQ-old edge
(G6 = 55,454 < G_B7stall 61,425 there).

### G7_tiny_grad = D7tiny ⊕ C11grad

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G7 | 28,747/58,645 | 63,819/75,139 | 189,684/29,443 | 121,723/32,716 |
| G_D7tiny | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 |
| G_C11grad | 42,538/54,279 | 55,454/73,125 | 182,094/28,687 | 132,242/23,564 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: overlap + interference — G7 < G_D7tiny on net on ALL FOUR datasets.** The two
components fix the SAME episode where C11's VGT-old edge lives (the 2010-08-30 −$1,536 arming:
tiny for D7, stage-2 for C11; both admit the 2010-08-31 entry → +18,140), so combining adds only
each other's costs: C11's earlier March-2009 entry (2009-03-02 @ 3.3222 vs 03-06 @ 3.2757, −1,987)
lands on top of D7tiny's path, and in the 2000 cascade stage-2 relaxations after ≥8% bear rallies
bought entries D7tiny alone avoided (first divergence 2000-04-24; QQQ-old −9,859 vs D7tiny).
C11's "never below C1" property does NOT survive composition — it was a property of C1-anchored
paths, not of the mechanism.

### G8_A2m1_retrace = A2m1 ⊕ C6r38

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G8 | 26,600/50,883 | 87,890/65,407 | 200,595/28,208 | 130,897/30,446 |
| G_A2m1 | 28,363/54,279 | 67,162/78,370 | 184,948/29,336 | 122,206/29,106 |
| G_C6r38 | 22,980/50,127 | 64,997/70,917 | 215,011/28,687 | 134,055/26,851 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: largely additive; the registered cancellation risk did not materialize.** Best Σ net of
the program (445,982) and better than REF on BOTH dims on three datasets. On QQQ-old the
components contribute distinct episodes: A2m1 adds its micro-exemptions (+22.9k vs C6 alone), C6
adds the post-cascade re-admissions A2m1's frozen-high reset never allows — reset 2002-11-01 →
Dec-2002/Jan-2003 probes (−1,899) → reset 2003-03-14 → 2003-03-31 @ 21.4119 → **+15,467** (spring
2003, the episode no trigger/discount config ever fixed), while A2m1 alone sat out until 2004.
Note G8 does NOT catch Oct-2002 (G4's trade); its old-era edge comes from 2003 instead. Costs,
honestly: 2000–02 window −19,395 (worse than both legs: A2m1's exempted micro-losses re-enter
faster AND C6's 2000–02 false resets still fire — the two permissive sides stack in a cascade),
and on QQQ-new it keeps C6's DD cost without its net gain (130,897/30,446 vs REF both-dims-worse).
VGT-new: +18.5k over REF but −14.4k below C6 alone (A2m1's 2026 give-back, below).

### G9a_retrace_guard / G9b_exitreset_guard — the reset guard

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G9a | 22,980/50,127 | 64,997/70,917 | 215,011/28,687 | 134,055/26,851 |
| G_C6r38 | identical | identical | identical | identical |
| G9b | 7,625/77,691 | 13,119/114,608 | 169,554/36,478 | 101,759/55,135 |
| Family C C2_exit_price | identical | identical | identical | identical |

**Verdict: the guard changes nothing on either reset.** G9a is trade-identical to unguarded
C6_retrace_38 on all four datasets: across all 34 realized C6 resets the close sat at least
**+4.5%** above the guard level (0.9894 × exit), i.e. the inversion the guard prevents (a reset
surrendering a pending discount entry) never comes close to occurring under this reset — the 38%
retrace point stood above the 3% level at every reset that actually fired. G9b is trade-identical
to Family C's C2 (QQQ 2000-02 −57,079, DD 114,608 reproduced to the dollar), confirming the
pre-registered analytic prediction: `exit ≥ exit × 0.9894` always, so the guard cannot bind. **The
guard does NOT rescue C2, because C2's catastrophe is re-admission at unimproved prices, not the
reset-priority inversion.** The inversion remains a real but niche pathology of time/rebound
resets that fire below pending levels (Family C's C10 2009-02-24, Family D's D1) — neither of the
resets chosen for G exhibits it.

### G10_bimodal = tiny ⇒ exit anchor, severe ⇒ B2_inverse

| | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 |
|---|---|---|---|---|
| G10 | 31,685/57,127 | 61,283/76,858 | 187,076/30,540 | 91,396/32,771 |
| G_D7tiny | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 |
| G_B2inv | 26,602/52,761 | 54,819/72,722 | 228,043/28,687 | 93,608/29,423 |
| REF | 26,384/54,279 | 40,258/91,469 | 182,094/28,687 | 132,242/23,564 |

**Verdict: worst combo — inherits both tails' failures and destroys B2inv's one big edge.** Σ net
371,440 is BELOW REF. It keeps B2inv's QQQ-new disaster (2025 window −3,301: early re-entries
after the big 2025 loss) and loses B2inv's VGT-new +45.9k: on G10's path the Nov-2018 tiny anchors
chained straight into the 2018-12-24 crash (re-entries 10-29, 11-19, 12-07; final loss −9,536,
price return −9.0% ⇒ B2inv discount floors at 0.5%, level 18.468), and the 2019-01-03 close of
18.7081 missed that level by 1.3% — forfeiting the +21,561 January-2019 rebound winner B2inv alone
caught from its differently-anchored path. Only VGT-old improved (+5,301 vs REF, best of the tiny
combos there). The bimodal idea produced the knife-edge it was meant to remove.

## 6. The six key questions

**(1) Does any combo dominate REF_lower3 on all four datasets?** **No.** The closest is
**G8_A2m1_retrace**, better than REF on BOTH net and DD on three datasets (VGT-old +216/−3,397;
QQQ-old +47,632/−26,062; VGT-new +18,501/−479) and worse on both on QQQ-new (−1,345/+6,882). G4
dominates REF on 2 (equal-DD VGT-old counts as weak dominance; QQQ-old strictly), loses QQQ-new.
Vs BOTH matched controls on both dims: on QQQ-old essentially every combo qualifies (G4:
+89,409/−52,984 vs matched baseline, +34,346/−56,715 vs matched 3%; G8 similar); on VGT-old,
VGT-new and QQQ-new **no combo** beats both matched controls on both dims (the ex-post matched-3%
control is unbeaten in the new era by every G config; the only Phase-2 config that does it on
VGT-new remains the standalone leg B2_inverse, +4,788/−6,485).

**(2) A2_material_1 vs D7_tiny head-to-head.** Episode census (REF events): of 88 armed episodes,
26 are tiny&immaterial (A2 never arms / D7 anchors at exit), 12 are tiny&material (A2 keeps the
FULL 3% / D7 anchors at exit), 3 are big&immaterial (A2 never arms / D7 keeps the full 3%:
QQQ 2008-01-07 −$2,256 @ −0.57%, VGT 2011-08-05 −$2,049 @ −0.45%, VGT 2026-02-05 −$2,092 @
+0.23%), 47 identical. Standalone, **D7tiny wins**: higher net on all four datasets
(Σ +19,696), with A2 better only on DD (VGT-old 54,279 vs 58,645; QQQ-new 29,106 vs 31,521).
Trade-level, the cells split cleanly:
- *tiny&material* (full 3% vs gentle anchor): the full 3% wins — VGT 2025-04-14 (−$1,753,
  −1.24%): A2(=REF) waited for 64.77, entered 04-16 @ 63.1975 → +39,335; D7's anchor 66.7759
  admitted 04-15 @ 65.4428 → +34,305 (−5,030; raw-price spot check 4).
- *big&immaterial* (never arm vs full 3%): keeping the restriction wins — VGT 2026-02-05: A2
  unrestricted bought 2026-03-03 and 03-26 @ 87.005 (window 29,821); D7's full 3% waited to
  03-27 @ 85.125 (window 47,148; REF 51,712).
- *tiny&immaterial* (never arm vs gentle anchor): the anchor wins — QQQ-new Dec-2022 (D7's
  2022-12-19/2023-01-04 entries, 2023 window 25,111 vs A2's 17,473); and in VGT July-2026 even
  the gentle anchor beat never-arm (D7 re-entered 07-27 @ 112.42; A2 free-entered 07-17 @ 113.10,
  lost, and then MISSED the +17,884 open ride REF's 3% level caught at 07-29 @ 108.20).
The consistent trade-level pattern: **the less you weaken the restriction, the better** — REF beat
both in 2025-04 and 2026; gentle-arm beat never-arm wherever they diverged decisively (Family E's
finding, confirmed at trade level). BUT in composition the ranking flips: **A2 composes, D7tiny
does not.** A2 leaves material episodes bit-identical to REF, so a second component (stall decay,
retrace reset) still finds the episode structure it was validated on (G4, G8 ≈ additive); D7tiny's
extra entries re-phase the sequence and starve the partner (G2 ≡ D7tiny, stall never binds; G3 <
both legs on three datasets).

**(3) Is G6 double relaxation redundant or harmful?** **Redundant, not harmful — hypothesis
confirmed.** Trade-identical to C11_graduated alone on all four datasets (§5). The redundancy is
asymmetric: min(d_stall, d_grad) behaves as C11 and therefore forfeits B7stall's QQQ-old edge
(−5,971 vs the stall leg there).

**(4) Does the reset guard change anything? Does it rescue C2?** **No and no** (§5 G9). On the
chosen resets the guard never binds (0 of 34 C6 resets within 4.5% of the guard; C2's resets are
above the guard by construction). G9b ≡ Family C's C2 to the dollar (QQQ 2000-02 −57,079 / DD
114,608). The guard addresses a pathology (reset-priority inversion) that the retrace and
exit-price resets simply do not have; its true targets were C10/D1-style time/rebound resets.

**(5) Episode scorecard per combo.** 2000–02 bill: G4 **+2,507** (only combo positive; G6 +5,926
via C11), G9a −12,184, G2 −16,251, G10 −16,157, G8 −19,395, G3/G5 −20,418, G7 −23,931, G9b
−57,079. V-bottoms: 2020 is untouched by every config (55,455/63,172 — on a 3%-family path the
2020 misses never existed, consistent with Family C); VGT 2023-01 rescued by all A2/D7/C6-based
combos (44,468; C6/B2inv paths 50,581) vs REF 18,901; VGT 2025-04 — tiny-anchored combos LOSE
5,030 (36,993), A2-based keep 42,023; VGT 2026-03 — A2-based give back −21,891 (29,821!), tiny
combos −4,564 (47,148), G3 −7,536. QQQ 2003: fixed only where C6 is present (G3/G5/G8 +15,403,
G9a +15,444) — entirely the reset's doing; triggers/discounts never touched it. Mar-2009:
preserved by every combo (QQQ-old 2009 windows 63,623–65,938; VGT-old 27,654–29,642; the −1,987
VGT variant is C11's 4-days-earlier entry; only G9b degrades QQQ 2009 to 52,014).

**(6) Multiple testing.** Stated at the top; reiterated: ~17 configs after ~100, on the selection
datasets, with single-trade edges (§7). Exploratory throughout.

## 7. Dependence on few trades

- **G4's** QQQ-old edge over A2m1 (+20,003) is ONE re-phased chain ending in ONE trade: 2002-10-07
  → 2002-11-11 +21,285 (trailing stop). The same October-2002 trade carries B7stall's and
  C11grad's standalone QQQ-old edges. Three "independent" mechanisms, one trade.
- **G8's** QQQ-old edge over A2m1 (+20,728) is dominated by 2003-03-31 +15,467 plus the Dec-2002
  probes; its VGT-new edge over REF is A2m1's 2023-01 rescue (+25,567) minus the 2026 give-back.
- **C11/G6's** VGT-old edge (+16,153) is one trade: 2010-08-31 → 2011-03-15 +18,140, minus −1,987
  from the earlier March-2009 entry. G7 shows what happens when a partner already owns that trade.
- **G10's** VGT-new collapse vs B2inv is one episode chain (Nov-2018 → miss of 2019-01-03 by
  1.3%, forfeiting +21,561).
- **G3/G5's** QQQ-new failure is systemic rather than single-trade (12 losing 2022 trades), which
  is in a sense more credible — and more damning.
- D7tiny-based QQQ-old edges are the most diffuse (11 alt entries spread over 1999–2012).

## 8. Per-config classification (historical observation first; inference clearly marked)

- **G8_A2m1_retrace — Promising (exploratory).** Observed: best Σ net (445,982); ≥ REF on both
  dims on 3 of 4 datasets; beats both matched controls on both dims on QQQ-old; rescues 2023-01
  (+25,567) AND 2003 (+15,403) with distinct component attribution. Observed costs: QQQ-new worse
  than REF on both dims (−1,345/+6,882); 2000–02 −19,395 (worst of the serious combos); 2026
  −21,891. Inference: trigger-exemption + depth-adaptive reset is the only combination whose parts
  proved additive across eras; its weaknesses are each component's known ones, not new
  interactions.
- **G4_A2m1_stall — Promising (exploratory), narrow.** Observed: strictly ≥ G_A2m1 everywhere
  (equal on 3 datasets, +20k/−15k QQQ-old); 2000-02 positive; zero new failure modes. Inference:
  the stall is a nearly-free QQQ-old-grind option on top of A2m1 — but its payoff is one trade,
  so "free" is the honest claim, not "valuable".
- **G2_tiny_stall — Inconclusive.** ≡ G_D7tiny except one harmful stall entry (QQQ-new −721/+722).
  Adds nothing; use D7tiny alone if that philosophy wins validation.
- **G9a_retrace_guard — Inconclusive (as a guard: null).** ≡ C6_retrace_38 everywhere. Harmless
  insurance against a pathology this reset doesn't exhibit. Keep the guard idea ONLY if validation
  introduces a permissive reset that actually inverts.
- **G9b_exitreset_guard — Unpromising (diagnostic complete).** ≡ C2; the guard rescues nothing.
- **G6_stall_grad — Unpromising as a combo (hypothesis confirmed: redundant).** ≡ C11grad; pick
  one relaxation, and note min() silently discards the stall's one real contribution.
- **G7_tiny_grad — Unpromising.** Below G_D7tiny on net on all four datasets; the "most
  conservative combo" expectation was wrong: overlap (2010-08) plus stage-2 bear-rally entries
  (2000) made it worse than either leg almost everywhere. C11's never-worse property is
  path-dependent and does not compose.
- **G3_tiny_retrace / G5_tiny_stall_retrace — Unpromising as specified.** G5 ≡ G3 (the "full
  stack" is a fiction — the third component never acts). Best old-era QQQ P/DD (1.15) and the 2003
  fix, but VGT-old worst-of-family (17,133) and a rebuilt repeated-entry cascade in QQQ 2022 (DD
  51,099, window −38,182). Two permissive mechanisms on the entry AND exit side of the same
  restriction compound in grinding bears.
- **G10_bimodal — Unpromising.** Σ below REF; recreated the knife-edge failure mode it was
  designed to remove (2019-01 miss by 1.3%) and kept B2inv's QQQ-new failure.
- Legs: as their families reported (reproduced exactly here; G_A2m1/G_D7tiny promising,
  G_B7stall promising-narrow, G_B2inv promising-with-QQQ-new-caveat, G_C6r38 promising,
  G_C11grad promising-standalone-only — its composition behavior in G6/G7 is a new negative
  finding of this family).

## 9. Parameters and items flagged for validation

1. **G8**: the combination to replay independently; sensitivity on BOTH components jointly
   (A2 cutoff −0.5%/−1%/−1.5% × retrace f 0.30–0.50). Watch QQQ-new 2022 and the 2000–02 window
   for the stacking-permissiveness effect; test on QLD/SOXX/VOOG.
2. **G4**: replay; sensitivity of stall (fresh_age 15–30, decay 40–80) around the single
   2002-09-19 decision — if the Oct-2002 trade disappears anywhere in the neighborhood, G4
   collapses to G_A2m1 (that is the honest null).
3. **A2-vs-D7 philosophy choice**: validation should prefer the composition question (does the
   chosen combo partner need REF-shaped material episodes?) over the standalone Σ; the standalone
   answer (D7tiny) and the composition answer (A2m1) disagree.
4. The tiny bound $2,000 vs the A2 −1% cutoff interact with position size ($100k); both are
   size-denominated in different units (dollars vs return) — validation must vary size or restate
   the tiny bound as a return.
5. **Reset guard**: drop unless a validated candidate uses a time/rebound reset; if so, test the
   guard there (that is where inversion actually occurred in C10/D1), not on retrace/exit resets.
6. Negative results to carry forward verbatim: G3/G5's QQQ-2022 cascade; G7's non-composability of
   C11; G10's reconstructed knife edge; the stall's edge being one trade.

## 10. Verification performed (spec rule 8)

- Calibration gate passed on all four datasets (A_baseline and REF_lower3 trade-equal to frozen
  results — enforced by the runner before any G run).
- Cross-family integrity: all six ablation legs reproduce their family-of-origin results to the
  dollar (A2_material_1, D7_tiny_loss_exit_anchor, B7_stall, B2_inverse, C6_retrace_38,
  C11_graduated vs their families' summary.json), and G9b ≡ recovery-resets C2_exit_price
  trade-for-trade on all four datasets.
- Raw-price spot checks (tmp/spotcheck.py):
  1. **G9a guard decision** — QQQ-new reset 2022-11-15: episode armed 2022-11-03 (exit 258.790),
     min close 256.313 (11-03), retrace point 283.732, close 284.750 ≥ it; guard level 256.047 <
     close ⇒ reset legitimately fired; no earlier session satisfied the retrace condition.
  2. **G5/G3 tiny anchoring** — QQQ-new episode armed 2022-02-28 (−$1,825.10, −1.31%): re-entry
     2022-03-01 at raw close 334.356 ≤ frozen exit 335.354 but ABOVE the 3% level 325.293
     (anchor-decisive); 10% signal confirmed (−16.34% off the 90-session high 399.663).
  3. **G4 stall decay** — QQQ-old re-entry 2002-09-19: age of low 32 sessions ⇒ discount 2.400%,
     level 18.2975; raw close 18.2941 ≤ level but above the 3% level 18.1850 (decay-decisive);
     min close 18.1787 on the arming session 2002-08-05 confirmed from raw closes.
  4. **G2 tiny anchoring** — VGT-new episode armed 2025-04-14 (−$1,752.74): re-entry 2025-04-15 at
     raw close 65.4428 ≤ exit 66.7759, above the 3% level 64.7726 (anchor-decisive); REF's
     one-session-later entry 04-16 @ 63.1975 earned +39,335 vs G2's +34,305.
- Counter/episode consistency: counters in summary.json match events CSVs (e.g. G9a vs G_C6r38
  identical reset counts and reset_priority_blocks per dataset); indicator_fallbacks = 0 in all
  68 runs (no config reads an indicator).

## Files

- `strategies.py` (component copies with citations), `register.py`, `registry.jsonl` (17 entries,
  pre-run), `run.py`, `results/` (summary.json + trades/daily/states/events/matching/recovery per
  run), `tmp/` (analyze1.py, analyze2.py, analyze3.py, spotcheck.py — reproducible analysis).
