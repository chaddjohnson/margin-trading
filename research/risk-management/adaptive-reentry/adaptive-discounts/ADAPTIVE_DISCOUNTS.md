# Family B — Adaptive lower-price requirements: research report

Experiment `adaptive_discounts`, run 2026-10-12 through the frozen Phase 2 infrastructure
(`common/framework.py` / `runner.py`; calibration gate passed on all four datasets: the framework's
baseline and REF_lower3 matched the frozen research results trade for trade before any family config
ran). 26 configurations (20 predefined + 6 agent-proposed B10 configs covering 5 mechanisms), all
registered with hypotheses in `registry.jsonl` BEFORE the first run. Every configuration varies ONLY
`required_level`; trigger = net loss, reset = frozen-high 95%. All are pure compositions — no
subclassing, no hook overrides. Raw outputs: `results/` (summary.json, trades/, daily/, states/,
events/, matching/, recovery/). Appendix tables at the end of this file.

Reference points (net / max DD): baseline 11,602/73,404 (VGT05-15), −2,886/149,561 (QQQ99-15),
161,772/38,323 (VGT16-26), 116,388/39,237 (QQQ16-26); existing 3% rule 26,384/54,279, 40,258/91,469,
182,094/28,687, 132,242/23,564.

## Summary

**The loss-exit price is the right anchor; the entry-price and correction-top anchors fail
structurally.** Every entry-anchored config re-opened the 2000–02 cascade (B3_entry_anchor_3:
−$118,054 net, $182,189 max DD on QQQ 1999–2015 — a *larger* drawdown than the unrestricted
baseline), because loss exits execute below entries: in 27 of B3's 53 QQQ episodes the required level
sat *above* the failed exit price, and 16 of its 44 re-entries actually filled above the failed exit.

**Within the exit anchor, three adaptations beat the existing 3% rule somewhere without
catastrophic cost elsewhere, and none dominates:**

- `B7_stall` (3% until the episode low is 20 sessions old, then linear decay over 60): identical to
  the existing 3% rule trade-for-trade on three datasets, and on QQQ 1999–2015 adds +$21,167 net with
  −$21,167 max DD, beating both matched-exposure controls. In-sample it is pure upside — but the
  upside flows from two basing-period entries in late 2002.
- `B2_inverse` (severe loss ⇒ *less* extra waiting, floor 0.5%): beats the existing 3% on three of
  four datasets (+218 / +14,561 / +45,949) and both matched controls on those three; it is the
  cleanest fix of the VGT 2023-01 "−$143 loss blocked a +$28k winner" failure. Cost: −$38,634 vs the
  3% rule on QQQ 2016–2026.
- `B7_decay120` (3% decaying to 0 over 120 restricted sessions): ≥ the 3% rule within noise on three
  datasets and +$49,062 on VGT 2016–2026 — but that entire edge traces to a 0.09%-of-price margin on
  2022-10-12. It did **not** degenerate into a cooldown (zero of 66 re-entries at <1% realized
  discount; median 3.4–4.3%).

**The loss-magnitude question resolves in the inverse direction** (B2_inverse ≥ B2_loss everywhere;
proportional severity B2_loss_k05/k10 is worse than the fixed 3% on seven of eight old-era
comparisons). **Volatility scaling points the wrong way at the decisive moments** (NATR explodes in
crashes, so B1 widened the requirement exactly at the 2020/2023 bottoms). **Knife-edge sensitivity
is not removed by any adaptation — it is relocated** (B10_persist2 missed a +$12,293 rebound by
0.033% of price; B7_decay120's headline win cleared by 0.09%).

## 1. Hypotheses as registered

Verbatim entries (name, params, hypothesis) are in `registry.jsonl` (26 entries, timestamped before
the run; registry is append-only). One-line versions:

- **B1_vol_k{1,2,3}** — vol-scaled discount k·NATR14 makes 3% "cheap" in calm markets, binding in
  crashes; registered risk: widens at V-bottoms.
- **B2_loss_k{05,10}** — severity-proportional waiting (1% + k·|price return|); should free the
  −$143-class episodes and restrain cascade re-entries.
- **B2_inverse** — severe loss ⇒ market already fell ⇒ demand less (3% − 0.5·|pr|, floor 0.5%).
- **B3_entry_anchor_{3,5}** — "better than the failed ENTRY" reading of the objective.
- **B4_credit_{50,100}** — the failed trade's own price decline credits toward the 3%.
- **B5_shallow3_deep{15,6}** — regime split at dd252 = 20%, relax vs tighten when deep (both
  directions tested without prejudging).
- **B6_up / B6_down** — correction failure-count ladder, escalating vs de-escalating.
- **B7_decay120 / B7_stall** — time decay of the requirement; stall version keyed to the episode low
  going stale, not to elapsed restriction time.
- **B8_first_entry_ladder / B8_min_entry** — correction-level anchors (first entry with ladder;
  cheapest failed entry −3%).
- **B9_atr_below_entry_k{1,2}** — ATR-denominated improvement below the failed entry.
- **B10_near_low** (agent) — never demand a price the market has not approximately printed: accept a
  close within 1% of the episode's running minimum close, provided ≥1% below the failed exit;
  registered risk: ~1% rule near grinding-bear lows.
- **B10_fresh_crash** (agent) — relax to 1.5% only when ≥20% below a 252-session high set within the
  last ~90 sessions (fast crash from a fresh high); registered risk: the first leg of every bear
  looks fresh.
- **B10_ref_high_{12,15}** (agent) — correction-top anchor: level = frozen ref_high × (1−d); the
  structurally meaningful anchor of a correction is its top, and cascades ratchet it via re-freezing.
- **B10_persist2** (agent) — two consecutive closes ≥1% below the failed exit substitute for one
  close 3% below (persistence as the guard instead of depth); registered risk: degrades toward a 1%
  rule mid-bear.
- **B10_deeper_signal** (agent) — require the dip itself to deepen: level = 0.97·0.90·rolling-90 high
  (a ~12.7% dip vs the 10% signal); anchors to market structure, ignores trade prices.

## 2. Exact mechanism definitions

Implementation `strategies.py` (components ~15 lines each). Common conventions: level compared to
CLOSES; discounts off the frozen loss-exit price unless stated; computed discounts clipped to
[1%, 10%] for B1/B2_loss; B2_inverse clips to [0.5%, 3%], B4 floors at 0%, B7 decays to 0% — each as
the spec states; B3/B8/B9/B10 level-anchored configs have no discount clip. Indicator NaN ⇒ fall
back to 3%-off-exit and count (`indicator_fallbacks`). **Observed fallback count: 0 in all 104 runs**
(NATR14/ATR14/dd252 are NaN only in the first sessions of a file; no restriction was ever active
that early).

| Config | required_level(ctx, st, i) |
|---|---|
| B1_vol_k{1,2,3} | exit × (1 − clip(k·NATR14[i], 1%, 10%)) |
| B2_loss_k{05,10} | exit × (1 − clip(1% + k·\|price_return\|, 1%, 10%)) |
| B2_inverse | exit × (1 − clip(3% − 0.5·\|price_return\|, 0.5%, 3%)) |
| B3_entry_anchor_{3,5} | losing entry × (1 − 3%/5%) |
| B4_credit_{50,100} | exit × (1 − max(0, 3% − c·max(0, −price_return))), c = 0.5/1.0 |
| B5_shallow3_deep{15,6} | exit × (1 − (3% if dd252[i] < 20% else 1.5%/6%)) |
| B6_up / B6_down | exit × (1 − d[n_failed]), d = 3/5/8% or 5/3/2% for 1st/2nd/≥3rd |
| B7_decay120 | exit × (1 − 3%·max(0, 1 − sessions_restricted/120)) |
| B7_stall | exit × (1 − 3%) while (i − min_close_i) < 20, then 3%·max(0, 1 − (age−20)/60) |
| B8_first_entry_ladder | correction first entry × (1 − 3%·n_failed) |
| B8_min_entry | min(entry prices of the correction's armed losses) × 0.97 |
| B9_atr_below_entry_k{1,2} | losing entry − k·ATR14[i] |
| B10_near_low | max(exit×0.97, min(exit×0.99, min_close×1.01)) — min_close through session i |
| B10_fresh_crash | exit × (1 − (1.5% if dd252[i] ≥ 20% and rhp90[i] == rhp252[i] else 3%)) |
| B10_ref_high_{12,15} | frozen ref_high × (1 − 12%/15%) |
| B10_persist2 | exit×0.99 if close[i−1] ≤ exit×0.99, else exit×0.97 |
| B10_deeper_signal | 0.97 × 0.90 × roll_high_prev(90)[i] |

`B8_min_entry` reads the minimum entry price over `ctx.events` restricted to the current correction
(`entry_i ≥ correction.first_entry_i`) — point-in-time (only past armed losses), no framework change.

## 3. Results per dataset

Full tables in the Appendix (standard metrics; both matched controls; bear windows; recovery
windows). Headlines (net / max DD; Δ vs existing 3%):

| Config | VGT 2005–2015 | QQQ 1999–2015 | VGT 2016–2026 | QQQ 2016–2026 |
|---|---:|---:|---:|---:|
| existing 3% (ref) | 26,384 / 54,279 | 40,258 / 91,469 | 182,094 / 28,687 | 132,242 / 23,564 |
| B7_stall | 26,384 / 54,279 (=) | **61,425 / 70,302** (+21,167) | 182,094 / 28,687 (=) | 132,242 / 23,564 (=) |
| B7_decay120 | 22,457 / 56,219 (−3,927) | 41,231 / 88,318 (+973) | **231,156 / 28,687** (+49,062) | 132,242 / 23,564 (=) |
| B2_inverse | 26,602 / 52,761 (+218) | 54,819 / 72,722 (+14,561) | 228,043 / 28,687 (+45,949) | 93,608 / 29,423 (−38,634) |
| B10_persist2 | 8,030 / 61,530 (−18,354) | **71,142 / 73,081** (+30,883) | 201,058 / 28,687 (+18,964) | 125,454 / 26,141 (−6,789) |
| B5_shallow3_deep15 | −4,708 / 52,750 (−31,092) | 32,846 / 84,975 (−7,413) | 212,343 / 28,687 (+30,249) | **140,255 / 26,141** (+8,012) |
| B6_up | 10,874 / 53,853 (−15,510) | 43,612 / 88,115 (+3,354) | 189,825 / 28,687 (+7,731) | 135,770 / 23,564 (+3,527) |
| B3_entry_anchor_3 | 30,839 / 62,118 (+4,455) | **−118,054 / 182,189** (−158,312) | 210,882 / 32,979 (+28,788) | 103,398 / 35,117 (−28,844) |

Matched-exposure verdicts (Appendix §2; "beats" = better on net AND max DD):

- vs the **matched 3% control** (the hardest, ex-post test): B7_stall beats it on QQQ99-15
  (+19,773 / −24,334) and is the control itself elsewhere (identical trades). B2_inverse beats it on
  VGT05-15 (+271/−1,408), QQQ99-15 (+2,164/−46,914), VGT16-26 (+4,788/−6,485); fails QQQ16-26.
  B7_decay120 beats it on QQQ99-15 (+776/−3,598) and VGT16-26 (+8,106/−6,452); marginally fails
  VGT05-15. B10_persist2 beats it only on QQQ99-15 (+17,568/−48,641), hugely.
- vs the **matched baseline control**: all of the above beat it on the two QQQ datasets and VGT16-26;
  on VGT05-15 the usual deleveraging caveat applies (drawdown deltas positive for most configs).

Counters are internally consistent for all 104 runs (lower-price re-entry and reset counts equal the
events tables; blocked-session counts reconcile; zero reset-priority blocks anywhere). The only
`unresolved_at_end` episodes are the known trivial VGT 2005–2015 tail (one 9-session stub per config
for the 21 configs still restricted at the 2015-10-07 file end).

## 4. Bear and recovery windows

Appendix §3–4 has all windows for all configs. The decisive episodes:

**QQQ 2000–2002** (baseline −91,629; existing 3% −11,471): held or improved by B7_stall (**+9,718**),
B7_decay120 (−8,320), B2_inverse (−8,691), B10_near_low (−8,421), B1_vol_k2/k3 (+28,356/+31,853 —
by blunt exposure cuts), B5_deep6 (+12,591). Re-opened by every entry/correction-top anchor:
B3_3 −102,703 (164,369 window DD), B8_ladder −87,271, B10_ref_high_12 −91,629 (baseline-identical),
B10_deeper_signal −91,629, B6_down −43,014, B4_credit −43/46k (the 0% floor admits re-entries at
any price ≤ exit mid-cascade; B2_inverse's 0.5% floor is what saves it — this floor is load-bearing).

**March 2009**: kept identically (+57,832 QQQ trade) by all exit-anchored configs; **lost** by the
entry anchors (B3_3/B8s/B9k1: 2009 window −4,911 on QQQ) and by deep-tighteners that reproduce the
old −8% failure: B5_deep6 missed 2009-03-09 by 0.735% (near-miss diagnostic), B1_vol_k2/k3 and
B2_loss missed it too (window 0).

**VGT 2020-03/04** (+50,533 baseline; existing 3% captured it): kept (+55,455) by every config whose
effective discount stayed ≤3% in the crash. **Re-created as a miss** by B1_vol_k1/k2/k3 (window +21:
NATR ≈ 7% in late March ⇒ requirement clipped toward 10%), B6_up (the 2020-03-16 loss was the
correction's second failure ⇒ 5% ⇒ level 22.0067 vs minimum close 22.2320 — the exact old C-config
miss, verified in the states log), B5_deep6, B9_atr_k2, B2_loss_k10 on QQQ (2020-03-19 +52,700
missed by 0.566%).

**VGT 2023-01** (+28,006 blocked under the 3% rule by a −$143-loss restriction): **fixed** by
B2_inverse/B4_credit (severity-scaled level 38.3949 admitted the 2023-01-05 close 38.1436 —
spot-verified), B7_decay120, B5_deep15, B3_3/B8_min_entry, B10_persist2, B10_near_low (partial,
45,527 window), B10_ref_high_12, B10_deeper_signal, B6_up (path-dependent route). **Not fixed** by
B7_stall, B1_* (k1 missed 2023-01-04 by 0.197%), B2_loss_*, B5_deep6, B6_down (first-failure 5%
blocked it by 1.6%), B9_*, B10_fresh_crash (the Nov-2022 high was not "fresh" — as predicted).

**VGT 2026-03** (existing 3% +51,712): kept by most; degraded by B1_vol_k3 (−239 — the old D-miss
re-created, 2026-03-26 missed by 0.571%), B1_vol_k2/B9_atr_k2 (33,828), B3_5/B6_down (36,423),
B10_ref_high_15 (33,828).

**QQQ 2003 basing** (baseline +18,291; every fixed threshold missed it): fixed ONLY by the
market-structure/correction-top anchors — B10_ref_high_12 (+18,291, including the 2003-03-06
re-entry at 20.7669 under level 21.4805 = 0.88 × 24.4097, verified), B10_ref_high_15 (+20,948),
B10_deeper_signal (+18,291) — and by B1_vol_k2 / B9_atr_k2 (+22,162; low 2003 volatility shrank
their requirements). Every exit-anchored config still missed it; B7_stall came closest and still
missed 2003-03-06 by 0.833%. The price of those fixes: the same four configs have no 2000–02
protection (window ≈ baseline).

## 5. Family-specific questions

**Which anchor matches "a materially better purchase than the last failed one"?** The loss-exit
price. Structural finding: because engine loss exits execute below entries (median price return of
arming trades −2% to −8%), `entry × (1−3%)` sits **above** the failed exit in half the hard-period
episodes (27/53 for B3 on QQQ99-15), so the entry anchor licenses re-buying at prices *worse than
the last liquidation* — 16 of B3's 44 QQQ re-entries filled above the failed exit, median re-entry
discount vs exit only −1.45% (vs −3.2% to −4.3% for exit-anchored configs). That is what produced
−$118k/$182k DD. The correction-top anchor (ref_high −12/15%) barely binds at all (2 and 15 blocked
sessions on QQQ16-26) because the 10% entry signal already implies ~10% below the rolling high. The
correction-memory anchors added nothing: B8_min_entry equals B3_entry_anchor_3 trade-for-trade on
all four datasets (in every realized correction the latest failed entry was already the cheapest).
Inference: anchor to what you last *salvaged* (the exit), not what you last *paid* (the entry).

**Which mechanisms survive both grinding bears and V-bottoms?** None fully; the closest are the two
time-decay variants and B2_inverse. B7_stall is never worse than the existing 3% anywhere (bears:
2000–02 +9,718; V-bottoms: identical captures) but leaves the 2023-01-class failures unfixed.
B7_decay120 and B2_inverse fix the 2023-01 class and hold 2000–02 near the 3% rule's level, but each
pays somewhere (VGT05-15 −3.9k; QQQ16-26 −38.6k respectively). Mechanisms that decisively fix the
basing/V-bottom class (ref-high, deeper-signal, vol-k2-style) surrender bear protection roughly one
for one. The trade-off frontier moved, it did not disappear.

**Does loss-magnitude scaling help, and in which direction?** Inverse. B2_inverse ≥ B2_loss on every
dataset (e.g. QQQ99-15 54,819 vs 12,079/13,979; VGT16-26 228,043 vs 185,294/206,895), and B2_loss is
worse than the plain 3% rule on both old datasets. Economic reading (inference): the trade's own
realized loss already measures spent correction depth; demanding *additional* depth proportional to
it double-counts, which is why proportional severity reproduces the −5/−8% V-bottom misses. Two
honest caveats: B4 (same idea, 0% floor) shows the benefit disappears without a floor — QQQ99-15
24,365/107,541 (B4_credit_50) vs 54,819/72,722 (B2_inverse, 0.5% floor); and B2_inverse's QQQ16-26
loss (−38.6k vs 3%) comes from early re-entries after big 2022/2025 losses (its 2025 window −3,301
vs +26,779) — the inverse direction is genuinely harmful there.

**Does time decay degenerate into a cooldown?** Not in realized behavior. Across all datasets,
B7_decay120 made 66 restricted re-entries, B7_stall 66: **zero** at a realized discount under 1% of
the loss exit, medians 3.4–4.3%; the longest restriction (148 sessions, VGT05-15) still resolved at
a real discount. Structurally B7_decay120's level does reach the exit price at 120 sessions, but the
10%-signal requirement plus "close ≤ frozen exit" still gates entries, which in these data always
arrived below the decayed level, not at it. B7_stall is further from a cooldown by construction:
decay runs only while no new episode low has formed for 20+ sessions — it behaved as a *basing
detector* (its two decisive entries: 2002-09-19 at a 2.4%-decayed level, and the 2002-10-07 follow-on
that caught the +21,285 October 2002 rebound winner).

**Knife-edge sensitivity at the known near-miss episodes?** Unsolved — relocated. New decisive
sub-2% events created by the adaptive rules themselves: B10_persist2 missed VGT 2006-08-15 (+12,293)
by **0.033%**; B7_decay120's entire VGT16-26 edge entered at 2022-10-12 with 0.09% to spare (level
36.8463 vs fixed-3% 36.7800, close 36.8109); B7_stall's 2002-09-19 entry cleared by 0.018%;
B5_deep15 missed VGT 2009-03-11 (+21,725) by 0.436% (its relaxation made VGT05-15 *worse* than the
3% rule); B1_vol_k1 missed VGT 2023-01-04 (+28,006) by 0.197%. Full lists:
`results/events/*.csv` (`min_gap_to_required`) and `near_miss_blocked_winners` in summary.json.

## 6. Failure cases (named)

- **B3_entry_anchor_3 / B8_min_entry, QQQ 2000–02**: 28 losing trades in-window, −102,703, window DD
  164,369; re-entries above the failed exit throughout the cascade (e.g. episodes re-arming within
  1–3 sessions at closes above the prior exit). The single worst configuration family outcome.
- **B1_vol_*, VGT 2020-03**: restriction from the 2020-03-16 −$2,432 exit; NATR14 ≈ 5–8% ⇒ required
  discount clipped near 10% ⇒ the entire April recovery forgone (window +21 vs +55,455 for the 3%
  rule); same mechanism degraded 2023 and (k3) 2026.
- **B6_up, VGT 2020-03**: second-failure escalation to 5% reproduced the known C-miss by 1.02%
  (level 22.0067, minimum close 22.2320), forgoing +50,533.
- **B5_shallow3_deep6, QQQ 2009-03**: deep-drawdown tightening to 6% missed 2009-03-09 (+57,832) by
  0.735% — the old D-failure rebuilt by conditioning.
- **B2_inverse / B4, QQQ 2016–2026**: relaxed levels after the large 2022-04/05 and 2025-03 losses
  re-admitted losing entries (2022 window −18,497 vs −9,942; 2025 window −3,301 vs +26,779), and a
  divergent 2025-04 path never re-qualified for the +25,424 April 17 winner (B1_vol_k3's near-miss
  log shows the 0.08% gap for that class of configs).
- **B10_fresh_crash**: inert where it was meant to help (identical to the 3% rule on three datasets —
  at 2020/2026 the 3% rule already captured the rebounds, so the relaxation had nothing to add) and
  harmful where predicted (QQQ99-15 −10,307 vs 3%: relaxed into the fresh-high first legs of
  2000/2001).
- **B10_persist2, VGT 2006-08-15**: two-consecutive-closes test failed by 0.033% of price on a
  +12,293 rebound — the sharpest knife-edge in the family; VGT05-15 net fell to 8,030.

## 7. Dependence on few trades

Every positive headline above decomposes into 1–3 episodes (matching CSVs in `results/matching/`):

- B7_decay120 VGT16-26 (+49,062 vs 3%): one 0.09% knife-edge entry 2022-10-12 at 36.8109 — the exact
  closing low of the 2022 bear — rerouted Nov-22 through Jan-23; window 2023 +50,581 vs +18,901.
- B7_stall QQQ99-15 (+21,167): the 2002-09-19 decay entry (cleared by 0.018%) plus the 2002-10-07
  +21,285 follow-on. Remove those two and the config is the 3% rule.
- B2_inverse VGT16-26 (+45,949): the 2022-10-10 floor entry (level 37.9444 after the −6.8% September
  loss) plus the 2023-01-05 severity-scaled entry.
- B10_persist2 QQQ99-15 (+30,883): persistence entries during 2001–02 improved the cascade path and
  2009 was held; its VGT05-15 collapse is likewise one 0.033% miss.

Conclusion unchanged from the fixed-threshold study: single sub-1% price events decide tens of
thousands per dataset. The adaptive rules change *which* events, not *whether*.

## 8. Per-config classification

Historical observation (these four files) first; inference in parentheses.

| Config | Class | Basis |
|---|---|---|
| B7_stall | **Promising** | Weakly dominates the existing 3% in-sample (=, =, =, +21k/−21k DD); beats both matched controls where it differs. (Inference: basing-detector decay is economically coherent; but the edge sits on two 2002 entries and one 0.018% margin.) |
| B2_inverse | **Promising** | Beats 3% and both matched controls on 3 of 4 datasets; cleanest 2023-01 fix; 0.5% floor preserves 2000–02. (Inference: direction is right; QQQ16-26 shows the failure mode — early re-entry after big losses in slow bears.) |
| B7_decay120 | Promising / Inconclusive | ≥3% rule on three datasets, +49k on the fourth; no cooldown degeneration observed. (Inference: the VGT edge is one knife-edge trade — treat the +49k as luck-adjacent until validated.) |
| B5_shallow3_deep15 | Inconclusive | Best QQQ16-26 of the family (+8k) and +30k VGT16-26, but −31k VGT05-15 (0.436% miss of 2009-03-11) and −7k QQQ99-15. (Regime-conditioning direction is right at V-bottoms, wrong at 2008-class bottoms.) |
| B10_persist2 | Inconclusive | Best QQQ99-15 of the family (+30.9k, −18.4k DD vs 3%; beats both controls) but −18.4k VGT05-15 on a 0.033% miss; slightly worse on QQQ16-26. (Persistence is a real alternative guard; too knife-edged as specified.) |
| B10_near_low | Inconclusive | +5.4k/+12.9k vs 3% on the old datasets, beats both QQQ99-15 controls, zero false resets VGT16-26; −33.6k QQQ16-26. (The "only demand printed prices" idea worked — its blocked-winner near-miss list is empty on VGT16-26 — but the 1% floor re-admits 2022/2025-class losers.) |
| B6_up | Inconclusive | Survives all bears, +3.4k/+7.7k/+3.5k vs 3% on three datasets; re-created the 2020 V-bottom miss (−50.5k forgone) via second-failure escalation. |
| B1_vol_k1 | Inconclusive | Large QQQ99-15 DD cut (70,066) beating both controls; fails every 2016–26 V-bottom (2020 forgone, 2023 missed by 0.197%). (Vol scaling has the wrong sign at crash bottoms.) |
| B4_credit_50/100 | Inconclusive | Twin of B2_inverse on the new era; QQQ99-15 DD 107–109k shows the 0% floor re-admits cascade entries. (Dominated by B2_inverse; the floor, not the credit, is the active ingredient.) |
| B1_vol_k2/k3 | Unpromising | VGT16-26 47–54k (vs 182k); 2009 missed (k2/k3); the QQQ-old DD cuts are blunt exposure reduction. |
| B2_loss_k05/k10 | Unpromising | Worse than the 3% rule on 7 of 8 old-era comparisons; reproduces deep-threshold misses (2009, 2020-QQQ). Severity-proportional direction rejected. |
| B3_entry_anchor_3/5 | Unpromising | Entry anchor is structurally looser than the exit after real losses; −118k/−25k QQQ99-15; 2009 lost. (Keep only as the anchor-question diagnostic.) |
| B5_shallow3_deep6 | Unpromising | Deep-tightening re-created the March 2009 miss (0.735% gap to +57,832). |
| B6_down | Unpromising | First-failure 5% blocks single-loss episodes (2023-01 by 1.6%); de-escalation re-admits cascades (QQQ99-15 DD 119k). |
| B7 — none | — | (No separate config; see B7_stall/B7_decay120 rows.) |
| B8_first_entry_ladder | Unpromising | −61.6k/146k QQQ99-15; the stable-but-high anchor plus ladder never catches falling prices. |
| B8_min_entry | Unpromising | Identical to B3_entry_anchor_3 on all datasets — correction-min-entry memory added nothing. Negative finding worth keeping. |
| B9_atr_below_entry_k1 | Unpromising | Entry anchor again: −52k QQQ99-15. |
| B9_atr_below_entry_k2 | Inconclusive / Unpromising | One of only five 2003 fixes (+22.2k) and good QQQ windows, but VGT16-26 68.6k (vol-widening misses 2023-10 by 0.47%, 2020 forgone). |
| B10_fresh_crash | Unpromising | Inert on three datasets, harmful on QQQ99-15 (fresh-high first legs), exactly as the registered risk stated. The recency idea failed because the 3% rule already captures fresh-crash rebounds. |
| B10_ref_high_12/15 | Unpromising (as strategies) | Barely-binding guard; 2000–02 ≈ baseline. **But**: the only mechanism class that fixed QQQ 2003 (+18.3k/+20.9k) while keeping 2009 — keep as the correction-top diagnostic for Family C/G work. |
| B10_deeper_signal | Unpromising | Same profile as ref_high (fixes 2003, no bear protection, QQQ99-15 −26.5k, DD 166.9k). |

## 9. Parameters flagged for the validation stage (not explored here)

1. **B7_stall**: fresh-low age 20 and decay span 60 — the 2002-09-19 entry cleared by 0.018%, so
   both parameters are knife-edge-adjacent; sensitivity bands needed. Also its interaction with a
   C-family rebound reset (both target stale episodes).
2. **B2_inverse**: the 0.5% floor (load-bearing vs B4's 0%) and the 0.5 slope; and whether a floor
   nearer 1% retains the 2023-01 fix while shrinking the QQQ16-26 giveback.
3. **B7_decay120**: horizon 120; and whether the VGT16-26 edge survives a ±1-session / ±0.2% level
   perturbation (suspected no).
4. **B5_shallow3_deep15**: the dd252 = 20% split point sat on the wrong side of the 2008-12/2009-03
   VGT episodes; 25–30% splits belong to validation, not here.
5. **For Family G**: B7_stall + B2_inverse-style small-loss relaxation are structurally complementary
   (stale-episode decay vs severity scaling); B10_near_low's `max(base, min(exit×0.99, low×1.01))`
   form composes with any base discount as a bolt-on "printed-price" rescue.

## 10. Verification performed

- Calibration gate: framework baseline and REF_lower3 equal the frozen results trade-for-trade on
  all four datasets (enforced by the runner before any config ran).
- Counter/episode consistency for all 104 runs: re-entry/reset counters equal events-table
  resolutions; blocked-session counters reconcile; zero reset-priority blocks; only the known 2015
  VGT tail is `unresolved_at_end`.
- Spot checks against raw prices (`tmp/inspect_episode.py`):
  1. **B7_decay120, VGT 2022-10-03 episode**: exit 37.9175 (−$7,101, pr −6.59%); at 2022-10-12
     sessions_restricted = 7 ⇒ level = 37.9175 × (1 − 3%·(1−7/120)) = 36.8463 (matches the logged
     36.846331); close 36.8109 ≤ level, entered; fixed 3% level 36.7800 would have blocked; raw
     closes 10-03…10-12 confirm 36.8109 is the episode (and bear) low.
  2. **B7_stall, QQQ 2002-08-05 episode**: exit 18.7474; episode min close 18.1787 set on the exit
     session (confirmed lowest raw close through 09-19); at 2002-09-19 age = 32 ⇒ discount
     3%·(1−12/60) = 2.4% ⇒ level 18.29746 (matches logged); close 18.2941 entered with 0.018% to
     spare; fixed 3% (18.185) would have blocked.
  3. **B2_inverse, VGT 2022-09-30 and 2023-01-03 episodes**: pr −6.76% ⇒ floor 0.5% ⇒ level
     38.1351 × 0.995 = 37.9444 (matches logged 37.944424), entry 2022-10-10 at 37.5543; and the
     −$143 episode: pr +0.31% ⇒ discount 2.845% ⇒ level 39.5194 × 0.97155 = 38.3949 (matches logged
     38.39490), entry 2023-01-05 at 38.1436 — the direct fix of the known failure. Also verified
     arithmetically: the 2020-03-11 episode level 26.7480 = 26.8824 × 0.995.
  4. **B6_up, VGT 2020-03-16 episode** (failure case): states log confirms n_failed = 2 ⇒ level
     22.006655 = 23.1649 × 0.95 against minimum close 22.2320 — the reproduced C-miss.

## Appendix — full tables

(Generated from `results/summary.json` by `tmp/mk_tables.py`.)

### Standard metrics per dataset

Net profit / max DD / P-to-DD / closed trades (W-L) / blocked signal sessions / lower-price re-entries / resets (false) / vs baseline net / vs existing-3% net.


**VGT_2005_2015**

| Config | Net | Max DD | P/DD | Trades (W/L) | Blocked | Re-entries | Resets (false) | vs base | vs 3% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1_vol_k1 | 16,611 | 57,882 | 0.29 | 21 (6/15) | 303 | 9 | 6 (5) | 5,009 | -9,773 |
| B1_vol_k2 | 4,818 | 47,435 | 0.10 | 19 (5/14) | 279 | 7 | 6 (4) | -6,784 | -21,566 |
| B1_vol_k3 | 24,922 | 39,109 | 0.64 | 21 (9/12) | 265 | 6 | 5 (4) | 13,320 | -1,462 |
| B2_loss_k05 | 5,626 | 53,056 | 0.11 | 23 (6/17) | 263 | 11 | 6 (4) | -5,977 | -20,758 |
| B2_loss_k10 | -8,522 | 48,604 | -0.18 | 23 (5/18) | 240 | 11 | 7 (5) | -20,124 | -34,906 |
| B2_inverse | 26,602 | 52,761 | 0.50 | 22 (7/15) | 273 | 9 | 5 (4) | 14,999 | 218 |
| B3_entry_anchor_3 | 30,839 | 62,118 | 0.50 | 31 (11/20) | 112 | 15 | 4 (3) | 19,237 | 4,455 |
| B3_entry_anchor_5 | -26,700 | 59,444 | -0.45 | 23 (6/17) | 240 | 9 | 7 (5) | -38,302 | -53,084 |
| B4_credit_50 | 26,602 | 52,761 | 0.50 | 22 (7/15) | 273 | 9 | 5 (4) | 14,999 | 218 |
| B4_credit_100 | 36,515 | 55,131 | 0.66 | 26 (9/17) | 170 | 12 | 4 (3) | 24,912 | 10,131 |
| B5_shallow3_deep15 | -4,708 | 52,750 | -0.09 | 21 (6/15) | 284 | 8 | 6 (4) | -16,311 | -31,092 |
| B5_shallow3_deep6 | 3,466 | 47,555 | 0.07 | 21 (7/14) | 248 | 7 | 6 (4) | -8,136 | -22,918 |
| B6_up | 10,874 | 53,853 | 0.20 | 21 (7/14) | 301 | 7 | 6 (5) | -729 | -15,510 |
| B6_down | 31,598 | 54,524 | 0.58 | 21 (7/14) | 256 | 8 | 5 (4) | 19,996 | 5,214 |
| B7_decay120 | 22,457 | 56,219 | 0.40 | 22 (8/14) | 266 | 8 | 5 (4) | 10,854 | -3,927 |
| B7_stall | 26,384 | 54,279 | 0.49 | 22 (8/14) | 274 | 8 | 5 (4) | 14,782 | 0 |
| B8_first_entry_ladder | 4,546 | 72,427 | 0.06 | 32 (10/22) | 138 | 16 | 5 (4) | -7,056 | -21,838 |
| B8_min_entry | 30,839 | 62,118 | 0.50 | 31 (11/20) | 112 | 15 | 4 (3) | 19,237 | 4,455 |
| B9_atr_below_entry_k1 | 20,177 | 61,553 | 0.33 | 31 (10/21) | 105 | 16 | 4 (3) | 8,575 | -6,207 |
| B9_atr_below_entry_k2 | 28,607 | 51,147 | 0.56 | 24 (8/16) | 231 | 10 | 5 (4) | 17,004 | 2,223 |
| B10_near_low | 31,751 | 55,343 | 0.57 | 28 (7/21) | 180 | 16 | 5 (4) | 20,148 | 5,367 |
| B10_fresh_crash | 26,384 | 54,279 | 0.49 | 22 (8/14) | 274 | 8 | 5 (4) | 14,782 | 0 |
| B10_ref_high_12 | 11,198 | 69,208 | 0.16 | 45 (12/33) | 7 | 30 | 2 (2) | -405 | -15,187 |
| B10_ref_high_15 | 23,077 | 66,459 | 0.35 | 37 (12/25) | 82 | 21 | 3 (3) | 11,474 | -3,308 |
| B10_persist2 | 8,030 | 61,530 | 0.13 | 23 (7/16) | 265 | 10 | 6 (5) | -3,572 | -18,354 |
| B10_deeper_signal | 16,609 | 68,314 | 0.24 | 42 (12/30) | 21 | 27 | 2 (2) | 5,007 | -9,775 |

**QQQ_1999_2015**

| Config | Net | Max DD | P/DD | Trades (W/L) | Blocked | Re-entries | Resets (false) | vs base | vs 3% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1_vol_k1 | 64,996 | 70,066 | 0.93 | 59 (23/36) | 516 | 26 | 10 (7) | 67,882 | 24,738 |
| B1_vol_k2 | 43,900 | 46,857 | 0.94 | 49 (20/29) | 673 | 19 | 10 (6) | 46,786 | 3,642 |
| B1_vol_k3 | 47,266 | 44,630 | 1.06 | 47 (21/26) | 711 | 15 | 11 (8) | 50,151 | 7,007 |
| B2_loss_k05 | 12,079 | 76,255 | 0.16 | 55 (19/36) | 599 | 28 | 8 (5) | 14,965 | -28,179 |
| B2_loss_k10 | 13,979 | 69,096 | 0.20 | 56 (23/33) | 600 | 24 | 9 (6) | 16,865 | -26,279 |
| B2_inverse | 54,819 | 72,722 | 0.75 | 81 (34/47) | 257 | 39 | 8 (6) | 57,705 | 14,561 |
| B3_entry_anchor_3 | -118,054 | 182,189 | -0.65 | 76 (23/53) | 274 | 44 | 9 (7) | -115,168 | -158,312 |
| B3_entry_anchor_5 | -25,067 | 140,935 | -0.18 | 70 (24/46) | 370 | 34 | 12 (8) | -22,182 | -65,326 |
| B4_credit_50 | 24,365 | 107,541 | 0.23 | 63 (24/39) | 463 | 31 | 8 (6) | 27,250 | -15,893 |
| B4_credit_100 | 19,080 | 109,460 | 0.17 | 63 (24/39) | 479 | 31 | 8 (6) | 21,966 | -21,178 |
| B5_shallow3_deep15 | 32,846 | 84,975 | 0.39 | 77 (29/48) | 313 | 38 | 10 (7) | 35,731 | -7,413 |
| B5_shallow3_deep6 | 12,780 | 68,809 | 0.19 | 52 (20/32) | 625 | 22 | 10 (7) | 15,666 | -27,478 |
| B6_up | 43,612 | 88,115 | 0.49 | 57 (24/33) | 584 | 24 | 9 (6) | 46,498 | 3,354 |
| B6_down | 26,264 | 119,375 | 0.22 | 53 (20/33) | 626 | 22 | 11 (7) | 29,150 | -13,994 |
| B7_decay120 | 41,231 | 88,318 | 0.47 | 70 (29/41) | 412 | 31 | 10 (7) | 44,116 | 973 |
| B7_stall | 61,425 | 70,302 | 0.87 | 73 (30/43) | 378 | 33 | 10 (7) | 64,311 | 21,167 |
| B8_first_entry_ladder | -61,611 | 146,326 | -0.42 | 91 (34/57) | 163 | 50 | 7 (5) | -58,725 | -101,869 |
| B8_min_entry | -118,054 | 182,189 | -0.65 | 76 (23/53) | 274 | 44 | 9 (7) | -115,168 | -158,312 |
| B9_atr_below_entry_k1 | -51,964 | 151,411 | -0.34 | 80 (30/50) | 266 | 42 | 8 (6) | -49,079 | -92,223 |
| B9_atr_below_entry_k2 | 47,784 | 107,427 | 0.44 | 61 (24/37) | 500 | 29 | 8 (4) | 50,670 | 7,526 |
| B10_near_low | 53,198 | 84,752 | 0.63 | 82 (32/50) | 265 | 43 | 7 (4) | 56,084 | 12,940 |
| B10_fresh_crash | 29,951 | 91,469 | 0.33 | 67 (26/41) | 450 | 31 | 10 (7) | 32,837 | -10,307 |
| B10_ref_high_12 | -7,554 | 149,561 | -0.05 | 104 (37/67) | 25 | 63 | 4 (3) | -4,668 | -47,812 |
| B10_ref_high_15 | -9,150 | 122,831 | -0.07 | 94 (33/61) | 124 | 51 | 10 (7) | -6,265 | -49,409 |
| B10_persist2 | 71,142 | 73,081 | 0.97 | 75 (33/42) | 349 | 35 | 7 (5) | 74,027 | 30,883 |
| B10_deeper_signal | -26,485 | 166,872 | -0.16 | 102 (36/66) | 40 | 60 | 6 (4) | -23,599 | -66,743 |

**VGT_2016_2026**

| Config | Net | Max DD | P/DD | Trades (W/L) | Blocked | Re-entries | Resets (false) | vs base | vs 3% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1_vol_k1 | 117,686 | 28,687 | 4.10 | 29 (11/18) | 192 | 13 | 5 (3) | -44,087 | -64,408 |
| B1_vol_k2 | 54,148 | 24,347 | 2.22 | 24 (8/16) | 262 | 8 | 8 (4) | -107,625 | -127,946 |
| B1_vol_k3 | 47,502 | 24,347 | 1.95 | 23 (9/14) | 240 | 6 | 8 (5) | -114,270 | -134,592 |
| B2_loss_k05 | 185,294 | 28,436 | 6.52 | 33 (14/19) | 128 | 17 | 2 (1) | 23,522 | 3,200 |
| B2_loss_k10 | 206,895 | 28,208 | 7.33 | 34 (15/19) | 113 | 17 | 2 (1) | 45,122 | 24,801 |
| B2_inverse | 228,043 | 28,687 | 7.95 | 35 (16/19) | 76 | 17 | 2 (1) | 66,271 | 45,949 |
| B3_entry_anchor_3 | 210,882 | 32,979 | 6.39 | 38 (16/22) | 65 | 20 | 2 (1) | 49,109 | 28,788 |
| B3_entry_anchor_5 | 160,521 | 32,620 | 4.92 | 32 (13/19) | 116 | 14 | 5 (2) | -1,252 | -21,573 |
| B4_credit_50 | 228,069 | 28,687 | 7.95 | 36 (17/19) | 63 | 17 | 2 (1) | 66,297 | 45,975 |
| B4_credit_100 | 220,724 | 30,893 | 7.14 | 36 (17/19) | 63 | 17 | 2 (1) | 58,952 | 38,630 |
| B5_shallow3_deep15 | 212,343 | 28,687 | 7.40 | 34 (15/19) | 97 | 16 | 3 (1) | 50,571 | 30,249 |
| B5_shallow3_deep6 | 135,326 | 28,687 | 4.72 | 29 (11/18) | 197 | 13 | 5 (3) | -26,447 | -46,768 |
| B6_up | 189,825 | 28,687 | 6.62 | 32 (14/18) | 117 | 15 | 3 (2) | 28,052 | 7,731 |
| B6_down | 115,682 | 23,134 | 5.00 | 30 (12/18) | 138 | 11 | 7 (3) | -46,090 | -66,412 |
| B7_decay120 | 231,156 | 28,687 | 8.06 | 36 (17/19) | 77 | 17 | 2 (1) | 69,384 | 49,062 |
| B7_stall | 182,094 | 28,687 | 6.35 | 32 (13/19) | 138 | 15 | 4 (2) | 20,322 | 0 |
| B8_first_entry_ladder | 167,787 | 35,444 | 4.73 | 34 (12/22) | 127 | 19 | 3 (2) | 6,014 | -14,307 |
| B8_min_entry | 210,882 | 32,979 | 6.39 | 38 (16/22) | 65 | 20 | 2 (1) | 49,109 | 28,788 |
| B9_atr_below_entry_k1 | 114,124 | 31,565 | 3.62 | 31 (12/19) | 172 | 16 | 3 (2) | -47,649 | -67,970 |
| B9_atr_below_entry_k2 | 68,568 | 28,687 | 2.39 | 27 (9/18) | 201 | 11 | 7 (4) | -93,205 | -113,526 |
| B10_near_low | 188,044 | 29,320 | 6.41 | 37 (15/22) | 90 | 20 | 2 (0) | 26,272 | 5,950 |
| B10_fresh_crash | 182,094 | 28,687 | 6.35 | 32 (13/19) | 138 | 15 | 4 (2) | 20,322 | 0 |
| B10_ref_high_12 | 184,371 | 43,557 | 4.23 | 42 (16/26) | 18 | 25 | 1 (0) | 22,599 | 2,277 |
| B10_ref_high_15 | 158,758 | 37,677 | 4.21 | 37 (14/23) | 53 | 19 | 4 (1) | -3,014 | -23,336 |
| B10_persist2 | 201,058 | 28,687 | 7.01 | 35 (15/20) | 95 | 17 | 3 (1) | 39,286 | 18,964 |
| B10_deeper_signal | 186,289 | 43,557 | 4.28 | 40 (15/25) | 30 | 23 | 2 (1) | 24,516 | 4,194 |

**QQQ_2016_2026**

| Config | Net | Max DD | P/DD | Trades (W/L) | Blocked | Re-entries | Resets (false) | vs base | vs 3% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1_vol_k1 | 102,163 | 23,564 | 4.34 | 26 (11/15) | 121 | 10 | 5 (1) | -14,225 | -30,079 |
| B1_vol_k2 | 80,292 | 23,564 | 3.41 | 19 (9/10) | 259 | 5 | 5 (2) | -36,097 | -51,951 |
| B1_vol_k3 | 79,970 | 23,564 | 3.39 | 19 (10/9) | 200 | 4 | 5 (2) | -36,418 | -52,272 |
| B2_loss_k05 | 99,149 | 25,760 | 3.85 | 26 (11/15) | 126 | 10 | 5 (1) | -17,240 | -33,094 |
| B2_loss_k10 | 79,548 | 25,760 | 3.09 | 24 (11/13) | 162 | 8 | 5 (2) | -36,840 | -52,694 |
| B2_inverse | 93,608 | 29,423 | 3.18 | 27 (11/16) | 102 | 11 | 5 (1) | -22,780 | -38,634 |
| B3_entry_anchor_3 | 103,398 | 35,117 | 2.94 | 31 (13/18) | 52 | 14 | 4 (1) | -12,990 | -28,844 |
| B3_entry_anchor_5 | 129,546 | 28,840 | 4.49 | 27 (13/14) | 108 | 10 | 4 (1) | 13,157 | -2,697 |
| B4_credit_50 | 93,608 | 29,423 | 3.18 | 27 (11/16) | 102 | 11 | 5 (1) | -22,780 | -38,634 |
| B4_credit_100 | 101,719 | 30,335 | 3.35 | 29 (12/17) | 83 | 13 | 4 (1) | -14,669 | -30,523 |
| B5_shallow3_deep15 | 140,255 | 26,141 | 5.37 | 30 (15/15) | 69 | 12 | 3 (1) | 23,866 | 8,012 |
| B5_shallow3_deep6 | 129,014 | 26,049 | 4.95 | 24 (12/12) | 185 | 8 | 4 (1) | 12,626 | -3,228 |
| B6_up | 135,770 | 23,564 | 5.76 | 26 (13/13) | 132 | 9 | 4 (1) | 19,382 | 3,527 |
| B6_down | 137,545 | 23,564 | 5.84 | 26 (13/13) | 129 | 9 | 4 (1) | 21,157 | 5,303 |
| B7_decay120 | 132,242 | 23,564 | 5.61 | 27 (13/14) | 111 | 10 | 4 (1) | 15,854 | 0 |
| B7_stall | 132,242 | 23,564 | 5.61 | 27 (13/14) | 111 | 10 | 4 (1) | 15,854 | 0 |
| B8_first_entry_ladder | 97,329 | 37,691 | 2.58 | 32 (13/19) | 43 | 15 | 4 (1) | -19,059 | -34,913 |
| B8_min_entry | 103,398 | 35,117 | 2.94 | 31 (13/18) | 52 | 14 | 4 (1) | -12,990 | -28,844 |
| B9_atr_below_entry_k1 | 102,029 | 32,041 | 3.18 | 28 (12/16) | 96 | 12 | 4 (1) | -14,359 | -30,213 |
| B9_atr_below_entry_k2 | 131,119 | 30,823 | 4.25 | 25 (13/12) | 169 | 9 | 3 (1) | 14,730 | -1,124 |
| B10_near_low | 98,596 | 32,865 | 3.00 | 30 (13/17) | 65 | 13 | 4 (1) | -17,792 | -33,646 |
| B10_fresh_crash | 132,242 | 23,564 | 5.61 | 27 (13/14) | 111 | 10 | 4 (1) | 15,854 | 0 |
| B10_ref_high_12 | 119,197 | 39,237 | 3.04 | 34 (15/19) | 2 | 17 | 2 (1) | 2,808 | -13,046 |
| B10_ref_high_15 | 131,958 | 35,988 | 3.67 | 33 (15/18) | 15 | 16 | 2 (1) | 15,569 | -285 |
| B10_persist2 | 125,454 | 26,141 | 4.80 | 27 (13/14) | 117 | 10 | 4 (1) | 9,065 | -6,789 |
| B10_deeper_signal | 121,826 | 38,804 | 3.14 | 34 (15/19) | 6 | 17 | 2 (1) | 5,437 | -10,417 |

### Matched-exposure controls (deltas: net / max DD; positive net good, negative DD good)

`mBase` = baseline scaled to equal margin dollar-days; `mL3` = existing 3% strategy scaled likewise (ex-post control, not deployable).


**VGT_2005_2015**

| Config | vs matched baseline | vs matched 3% |
|---|---:|---:|
| B1_vol_k1 | 11,247 / 23,946 | -2,897 / 17,748 |
| B1_vol_k2 | -1,918 / 4,814 | -19,683 / -2,970 |
| B1_vol_k3 | 18,459 / -1,780 | 1,416 / -9,249 |
| B2_loss_k05 | -417 / 14,824 | -16,352 / 7,841 |
| B2_loss_k10 | -14,160 / 12,938 | -29,025 / 6,424 |
| B2_inverse | 19,362 / 6,957 | 271 / -1,408 |
| B3_entry_anchor_3 | 21,269 / 1,572 | -3,967 / -9,487 |
| B3_entry_anchor_5 | -31,961 / 26,157 | -45,835 / 20,077 |
| B4_credit_50 | 19,362 / 6,957 | 271 / -1,408 |
| B4_credit_100 | 27,321 / -3,035 | 3,077 / -13,659 |
| B5_shallow3_deep15 | -11,342 / 10,778 | -28,836 / 3,113 |
| B5_shallow3_deep6 | -3,695 / 2,246 | -22,580 / -6,030 |
| B6_up | 5,510 / 19,918 | -8,635 / 13,719 |
| B6_down | 24,168 / 7,515 | 4,574 / -1,071 |
| B7_decay120 | 15,153 / 10,013 | -4,105 / 1,574 |
| B7_stall | 19,130 / 8,383 | 0 / 0 |
| B8_first_entry_ladder | -2,874 / 25,480 | -22,442 / 16,905 |
| B8_min_entry | 21,269 / 1,572 | -3,967 / -9,487 |
| B9_atr_below_entry_k1 | 11,770 / 8,362 | -10,400 / -1,352 |
| B9_atr_below_entry_k2 | 21,040 / 3,273 | 1,086 / -5,471 |
| B10_near_low | 24,223 / 7,715 | 4,372 / -983 |
| B10_fresh_crash | 19,130 / 8,383 | 0 / 0 |
| B10_ref_high_12 | 74 / -1,167 | -29,258 / -14,021 |
| B10_ref_high_15 | 13,164 / 3,749 | -12,973 / -7,704 |
| B10_persist2 | 2,359 / 25,647 | -12,597 / 19,094 |
| B10_deeper_signal | 5,612 / -1,257 | -23,385 / -13,964 |

**QQQ_1999_2015**

| Config | vs matched baseline | vs matched 3% |
|---|---:|---:|
| B1_vol_k1 | 66,612 / -13,685 | 26,952 / -16,373 |
| B1_vol_k2 | 45,110 / -15,812 | 15,433 / -17,823 |
| B1_vol_k3 | 48,319 / -9,989 | 22,455 / -11,741 |
| B2_loss_k05 | 13,518 / 1,673 | -21,800 / -721 |
| B2_loss_k10 | 15,272 / 2,095 | -16,456 / -55 |
| B2_inverse | 57,056 / -43,194 | 2,164 / -46,914 |
| B3_entry_anchor_3 | -116,103 / 81,074 | -163,986 / 77,829 |
| B3_entry_anchor_5 | -23,642 / 67,075 | -58,619 / 64,705 |
| B4_credit_50 | 26,379 / 3,141 | -23,060 / -210 |
| B4_credit_100 | 21,066 / 6,540 | -27,672 / 3,237 |
| B5_shallow3_deep15 | 34,653 / -8,704 | -9,708 / -11,710 |
| B5_shallow3_deep6 | 14,022 / 4,407 | -16,475 / 2,340 |
| B6_up | 45,099 / 11,042 | 8,601 / 8,569 |
| B6_down | 27,574 / 51,508 | -4,565 / 49,330 |
| B7_decay120 | 42,949 / -740 | 776 / -3,598 |
| B7_stall | 63,194 / -21,391 | 19,773 / -24,334 |
| B8_first_entry_ladder | -59,421 / 32,829 | -113,168 / 29,186 |
| B8_min_entry | -116,103 / 81,074 | -163,986 / 77,829 |
| B9_atr_below_entry_k1 | -50,046 / 51,956 | -97,142 / 48,764 |
| B9_atr_below_entry_k2 | 49,496 / 18,694 | 7,477 / 15,846 |
| B10_near_low | 55,337 / -26,074 | 2,855 / -29,631 |
| B10_fresh_crash | 31,621 / 4,938 | -9,356 / 2,161 |
| B10_ref_high_12 | -4,803 / 7,003 | -72,311 / 2,428 |
| B10_ref_high_15 | -7,123 / 17,744 | -56,886 / 14,372 |
| B10_persist2 | 73,417 / -44,856 | 17,568 / -48,641 |
| B10_deeper_signal | -24,016 / 38,898 | -84,618 / 34,791 |

**VGT_2016_2026**

| Config | vs matched baseline | vs matched 3% |
|---|---:|---:|
| B1_vol_k1 | 12,500 / 3,769 | -44,495 / 3,137 |
| B1_vol_k2 | -15,887 / 7,756 | -53,836 / 7,335 |
| B1_vol_k3 | -27,392 / 6,605 | -67,975 / 6,154 |
| B2_loss_k05 | 48,154 / -4,052 | -26,156 / -4,876 |
| B2_loss_k10 | 69,155 / -4,422 | -5,480 / -5,250 |
| B2_inverse | 83,247 / -5,615 | 4,788 / -6,485 |
| B3_entry_anchor_3 | 65,486 / -1,465 | -13,297 / -2,338 |
| B3_entry_anchor_5 | 49,078 / 6,219 | -11,309 / 5,550 |
| B4_credit_50 | 82,141 / -5,883 | 3,069 / -6,759 |
| B4_credit_100 | 75,062 / -3,614 | -3,865 / -4,489 |
| B5_shallow3_deep15 | 76,201 / -3,564 | 2,432 / -4,382 |
| B5_shallow3_deep6 | 30,540 / 3,864 | -26,239 / 3,234 |
| B6_up | 56,679 / -2,855 | -15,467 / -3,655 |
| B6_down | 26,208 / 1,938 | -22,274 / 1,400 |
| B7_decay120 | 86,493 / -5,583 | 8,106 / -6,452 |
| B7_stall | 63,993 / 710 | 0 / 0 |
| B8_first_entry_ladder | 43,961 / 6,110 | -23,135 / 5,366 |
| B8_min_entry | 65,486 / -1,465 | -13,297 / -2,338 |
| B9_atr_below_entry_k1 | -9,436 / 2,294 | -76,387 / 1,551 |
| B9_atr_below_entry_k2 | -14,249 / 9,068 | -59,124 / 8,571 |
| B10_near_low | 39,919 / -5,770 | -40,343 / -6,660 |
| B10_fresh_crash | 63,993 / 710 | 0 / 0 |
| B10_ref_high_12 | 23,131 / 5,360 | -64,237 / 4,391 |
| B10_ref_high_15 | 28,075 / 6,718 | -42,736 / 5,933 |
| B10_persist2 | 64,717 / -3,612 | -9,161 / -4,431 |
| B10_deeper_signal | 38,097 / 8,451 | -42,202 / 7,561 |

**QQQ_2016_2026**

| Config | vs matched baseline | vs matched 3% |
|---|---:|---:|
| B1_vol_k1 | 16,931 / -5,169 | -13,969 / 2,871 |
| B1_vol_k2 | 3,409 / -2,354 | -24,464 / 4,898 |
| B1_vol_k3 | 1,799 / -2,789 | -26,542 / 4,585 |
| B2_loss_k05 | 14,421 / -2,803 | -16,296 / 5,189 |
| B2_loss_k10 | -6,132 / -3,124 | -37,195 / 4,958 |
| B2_inverse | 6,639 / 105 | -24,891 / 8,308 |
| B3_entry_anchor_3 | 10,433 / 3,777 | -23,271 / 12,547 |
| B3_entry_anchor_5 | 32,266 / -3,955 | -3,002 / 5,221 |
| B4_credit_50 | 6,639 / 105 | -24,891 / 8,308 |
| B4_credit_100 | 10,827 / -306 | -22,125 / 8,268 |
| B5_shallow3_deep15 | 37,035 / -8,657 | -387 / 1,080 |
| B5_shallow3_deep6 | 38,290 / -4,536 | 5,399 / 4,022 |
| B6_up | 40,171 / -8,664 | 5,513 / 354 |
| B6_down | 42,283 / -8,551 | 7,746 / 435 |
| B7_decay120 | 35,187 / -9,155 | 0 / 0 |
| B7_stall | 35,187 / -9,155 | 0 / 0 |
| B8_first_entry_ladder | 3,692 / 6,124 | -30,256 / 14,957 |
| B8_min_entry | 10,433 / 3,777 | -23,271 / 12,547 |
| B9_atr_below_entry_k1 | 12,146 / 1,740 | -20,440 / 10,219 |
| B9_atr_below_entry_k2 | 36,865 / -952 | 2,694 / 7,939 |
| B10_near_low | 6,079 / 1,676 | -27,462 / 10,403 |
| B10_fresh_crash | 35,187 / -9,155 | 0 / 0 |
| B10_ref_high_12 | 4,769 / 661 | -36,715 / 11,455 |
| B10_ref_high_15 | 18,707 / -2,191 | -22,351 / 8,492 |
| B10_persist2 | 28,622 / -6,503 | -6,483 / 2,631 |
| B10_deeper_signal | 7,959 / 417 | -33,322 / 11,158 |

### Bear windows (P&L / in-window max DD / closed trades (losing))


**VGT_2005_2015** — windows: 2007-2009

| Config | 2007-2009 |
|---|---:|
| B1_vol_k1 | -1,858 / 43,679 / 8 (5) |
| B1_vol_k2 | -28,995 / 47,435 / 7 (5) |
| B1_vol_k3 | -18,917 / 34,833 / 8 (5) |
| B2_loss_k05 | -32,058 / 40,785 / 7 (5) |
| B2_loss_k10 | -27,607 / 42,575 / 9 (7) |
| B2_inverse | -5,246 / 52,761 / 10 (6) |
| B3_entry_anchor_3 | -15,544 / 62,118 / 17 (11) |
| B3_entry_anchor_5 | -43,153 / 47,979 / 11 (8) |
| B4_credit_50 | -5,246 / 52,761 / 10 (6) |
| B4_credit_100 | -9,868 / 55,131 / 12 (8) |
| B5_shallow3_deep15 | -37,290 / 51,712 / 9 (6) |
| B5_shallow3_deep6 | -29,115 / 47,555 / 9 (5) |
| B6_up | -3,243 / 41,612 / 9 (5) |
| B6_down | -2,991 / 54,524 / 9 (5) |
| B7_decay120 | -10,125 / 56,219 / 10 (5) |
| B7_stall | -6,198 / 54,279 / 10 (5) |
| B8_first_entry_ladder | -23,091 / 60,157 / 16 (11) |
| B8_min_entry | -15,544 / 62,118 / 17 (11) |
| B9_atr_below_entry_k1 | -10,023 / 50,849 / 14 (10) |
| B9_atr_below_entry_k2 | -5,535 / 51,147 / 12 (7) |
| B10_near_low | -5,270 / 46,834 / 12 (9) |
| B10_fresh_crash | -6,198 / 54,279 / 10 (5) |
| B10_ref_high_12 | -34,300 / 69,208 / 22 (16) |
| B10_ref_high_15 | -30,701 / 66,459 / 21 (14) |
| B10_persist2 | -10,267 / 46,375 / 9 (5) |
| B10_deeper_signal | -32,792 / 68,314 / 22 (16) |

**QQQ_1999_2015** — windows: 2000-2002, 2007-2009

| Config | 2000-2002 | 2007-2009 |
|---|---:|---:|
| B1_vol_k1 | 9,870 / 59,632 / 29 (16) | 49,160 / 44,706 / 10 (6) |
| B1_vol_k2 | 28,356 / 46,857 / 26 (12) | -16,464 / 41,074 / 6 (5) |
| B1_vol_k3 | 31,853 / 44,630 / 26 (12) | -6,743 / 33,663 / 8 (4) |
| B2_loss_k05 | -5,129 / 66,459 / 26 (17) | -18,009 / 42,058 / 7 (4) |
| B2_loss_k10 | 14,923 / 56,213 / 29 (14) | -18,009 / 42,058 / 7 (4) |
| B2_inverse | -8,691 / 72,722 / 49 (26) | 32,600 / 60,384 / 11 (7) |
| B3_entry_anchor_3 | -102,703 / 164,369 / 38 (28) | -49,791 / 73,322 / 16 (11) |
| B3_entry_anchor_5 | -47,025 / 116,224 / 40 (24) | 27,741 / 57,080 / 13 (9) |
| B4_credit_50 | -43,510 / 107,541 / 31 (18) | 36,965 / 56,019 / 11 (7) |
| B4_credit_100 | -46,372 / 109,460 / 31 (18) | 36,965 / 56,019 / 11 (7) |
| B5_shallow3_deep15 | -15,455 / 72,429 / 47 (28) | 42,966 / 44,706 / 10 (6) |
| B5_shallow3_deep6 | 12,591 / 57,312 / 29 (16) | -18,009 / 42,058 / 7 (4) |
| B6_up | -10,806 / 62,155 / 32 (17) | 47,970 / 42,017 / 8 (4) |
| B6_down | -43,014 / 92,485 / 25 (15) | 54,749 / 42,565 / 11 (7) |
| B7_decay120 | -8,320 / 58,100 / 43 (23) | 42,966 / 44,706 / 10 (6) |
| B7_stall | 9,718 / 61,066 / 44 (24) | 45,281 / 44,706 / 10 (6) |
| B8_first_entry_ladder | -87,271 / 146,326 / 52 (34) | -28,101 / 51,632 / 15 (9) |
| B8_min_entry | -102,703 / 164,369 / 38 (28) | -49,791 / 73,322 / 16 (11) |
| B9_atr_below_entry_k1 | -59,154 / 127,785 / 40 (24) | -40,648 / 66,073 / 15 (11) |
| B9_atr_below_entry_k2 | -36,965 / 107,427 / 32 (19) | 54,983 / 37,944 / 10 (6) |
| B10_near_low | -8,421 / 65,395 / 47 (26) | 27,822 / 60,838 / 10 (7) |
| B10_fresh_crash | -21,778 / 61,251 / 40 (23) | 45,281 / 44,706 / 10 (6) |
| B10_ref_high_12 | -91,629 / 149,561 / 56 (36) | 22,579 / 68,923 / 20 (14) |
| B10_ref_high_15 | -63,775 / 122,831 / 56 (35) | 24,783 / 67,028 / 18 (12) |
| B10_persist2 | -24,108 / 68,119 / 44 (24) | 45,932 / 44,706 / 11 (6) |
| B10_deeper_signal | -91,629 / 149,561 / 56 (36) | 12,692 / 76,393 / 18 (13) |

**VGT_2016_2026** — windows: 2022

| Config | 2022 |
|---|---:|
| B1_vol_k1 | -9,314 / 21,995 / 8 (6) |
| B1_vol_k2 | 1,562 / 19,471 / 6 (5) |
| B1_vol_k3 | 4,354 / 18,399 / 6 (4) |
| B2_loss_k05 | -14,371 / 21,995 / 8 (7) |
| B2_loss_k10 | -1,835 / 20,570 / 9 (7) |
| B2_inverse | -9,934 / 26,556 / 9 (6) |
| B3_entry_anchor_3 | -14,959 / 32,843 / 12 (9) |
| B3_entry_anchor_5 | -15,560 / 30,305 / 10 (8) |
| B4_credit_50 | -9,908 / 26,530 / 10 (6) |
| B4_credit_100 | -10,315 / 26,482 / 10 (6) |
| B5_shallow3_deep15 | -5,296 / 23,539 / 9 (6) |
| B5_shallow3_deep6 | -92 / 18,074 / 8 (6) |
| B6_up | 3,719 / 20,570 / 9 (6) |
| B6_down | 4,269 / 20,324 / 9 (6) |
| B7_decay120 | -3,848 / 21,995 / 10 (6) |
| B7_stall | -3,865 / 20,570 / 9 (7) |
| B8_first_entry_ladder | -20,679 / 35,307 / 10 (9) |
| B8_min_entry | -14,959 / 32,843 / 12 (9) |
| B9_atr_below_entry_k1 | -17,848 / 31,411 / 8 (7) |
| B9_atr_below_entry_k2 | -10,150 / 25,475 / 8 (7) |
| B10_near_low | -13,018 / 23,356 / 10 (8) |
| B10_fresh_crash | -3,865 / 20,570 / 9 (7) |
| B10_ref_high_12 | -28,877 / 35,448 / 13 (11) |
| B10_ref_high_15 | -22,997 / 34,654 / 12 (9) |
| B10_persist2 | -7,172 / 21,995 / 10 (7) |
| B10_deeper_signal | -28,877 / 35,448 / 13 (11) |

**QQQ_2016_2026** — windows: 2022

| Config | 2022 |
|---|---:|
| B1_vol_k1 | -9,942 / 21,397 / 9 (7) |
| B1_vol_k2 | -9,106 / 11,426 / 4 (4) |
| B1_vol_k3 | 905 / 17,950 / 6 (4) |
| B2_loss_k05 | -9,861 / 21,397 / 9 (7) |
| B2_loss_k10 | -6,706 / 18,839 / 8 (6) |
| B2_inverse | -18,497 / 28,030 / 10 (8) |
| B3_entry_anchor_3 | -19,286 / 33,001 / 12 (9) |
| B3_entry_anchor_5 | -12,687 / 27,446 / 10 (8) |
| B4_credit_50 | -18,497 / 28,030 / 10 (8) |
| B4_credit_100 | -17,094 / 28,219 / 11 (9) |
| B5_shallow3_deep15 | -11,326 / 24,747 / 10 (7) |
| B5_shallow3_deep6 | -13,171 / 22,534 / 6 (5) |
| B6_up | -7,598 / 19,847 / 8 (6) |
| B6_down | -4,687 / 21,586 / 9 (7) |
| B7_decay120 | -9,942 / 21,397 / 9 (7) |
| B7_stall | -9,942 / 21,397 / 9 (7) |
| B8_first_entry_ladder | -24,172 / 33,241 / 13 (10) |
| B8_min_entry | -19,286 / 33,001 / 12 (9) |
| B9_atr_below_entry_k1 | -16,784 / 30,648 / 10 (8) |
| B9_atr_below_entry_k2 | -17,821 / 29,177 / 7 (6) |
| B10_near_low | -18,051 / 27,161 / 11 (8) |
| B10_fresh_crash | -9,942 / 21,397 / 9 (7) |
| B10_ref_high_12 | -26,320 / 33,932 / 13 (10) |
| B10_ref_high_15 | -23,071 / 34,342 / 12 (9) |
| B10_persist2 | -13,263 / 24,747 / 9 (7) |
| B10_deeper_signal | -25,887 / 34,354 / 13 (10) |

### Recovery windows (P&L; extended set incl. 2026)


**VGT_2005_2015** — windows: 2009

| Config | 2009 |
|---|---:|
| B1_vol_k1 | 33,093 |
| B1_vol_k2 | 0 |
| B1_vol_k3 | 0 |
| B2_loss_k05 | 0 |
| B2_loss_k10 | 0 |
| B2_inverse | 33,093 |
| B3_entry_anchor_3 | 29,314 |
| B3_entry_anchor_5 | -6,207 |
| B4_credit_50 | 33,093 |
| B4_credit_100 | 29,642 |
| B5_shallow3_deep15 | 0 |
| B5_shallow3_deep6 | 0 |
| B6_up | 29,642 |
| B6_down | 33,093 |
| B7_decay120 | 27,654 |
| B7_stall | 29,642 |
| B8_first_entry_ladder | 29,314 |
| B8_min_entry | 29,314 |
| B9_atr_below_entry_k1 | 29,314 |
| B9_atr_below_entry_k2 | 27,167 |
| B10_near_low | 33,093 |
| B10_fresh_crash | 29,642 |
| B10_ref_high_12 | 15,518 |
| B10_ref_high_15 | 15,518 |
| B10_persist2 | 27,381 |
| B10_deeper_signal | 15,518 |

**QQQ_1999_2015** — windows: 2003, 2009

| Config | 2003 | 2009 |
|---|---:|---:|
| B1_vol_k1 | -23 | 69,817 |
| B1_vol_k2 | 22,162 | 0 |
| B1_vol_k3 | 0 | 0 |
| B2_loss_k05 | -63 | 0 |
| B2_loss_k10 | -63 | 0 |
| B2_inverse | -1,210 | 69,817 |
| B3_entry_anchor_3 | -87 | -4,911 |
| B3_entry_anchor_5 | -1,187 | 57,889 |
| B4_credit_50 | -1,210 | 69,817 |
| B4_credit_100 | -87 | 69,817 |
| B5_shallow3_deep15 | -1,251 | 63,623 |
| B5_shallow3_deep6 | 0 | 0 |
| B6_up | 0 | 65,938 |
| B6_down | 0 | 69,817 |
| B7_decay120 | 0 | 63,623 |
| B7_stall | -23 | 65,938 |
| B8_first_entry_ladder | -87 | -4,911 |
| B8_min_entry | -87 | -4,911 |
| B9_atr_below_entry_k1 | -87 | -4,911 |
| B9_atr_below_entry_k2 | 22,162 | 63,623 |
| B10_near_low | -1,251 | 69,817 |
| B10_fresh_crash | 0 | 65,938 |
| B10_ref_high_12 | 18,291 | 66,522 |
| B10_ref_high_15 | 20,948 | 66,522 |
| B10_persist2 | 0 | 63,718 |
| B10_deeper_signal | 18,291 | 66,522 |

**VGT_2016_2026** — windows: 2020, 2023, 2025, 2026

| Config | 2020 | 2023 | 2025 | 2026 |
|---|---:|---:|---:|---:|
| B1_vol_k1 | 21 | 18,901 | 42,693 | 48,739 |
| B1_vol_k2 | 21 | -503 | 850 | 33,828 |
| B1_vol_k3 | 21 | -503 | 850 | -239 |
| B2_loss_k05 | 55,455 | 16,723 | 36,993 | 45,820 |
| B2_loss_k10 | 56,515 | 16,723 | 44,749 | 45,820 |
| B2_inverse | 55,455 | 50,581 | 42,023 | 51,712 |
| B3_entry_anchor_3 | 55,455 | 50,581 | 32,425 | 51,712 |
| B3_entry_anchor_5 | 55,455 | -503 | 42,023 | 36,423 |
| B4_credit_50 | 55,455 | 50,581 | 42,023 | 51,712 |
| B4_credit_100 | 55,455 | 50,581 | 37,623 | 51,712 |
| B5_shallow3_deep15 | 55,455 | 50,581 | 42,023 | 51,712 |
| B5_shallow3_deep6 | 21 | 18,901 | 46,915 | 51,712 |
| B6_up | 21 | 50,581 | 42,023 | 51,712 |
| B6_down | 55,455 | 295 | 850 | 36,423 |
| B7_decay120 | 55,455 | 50,581 | 42,023 | 48,739 |
| B7_stall | 55,455 | 18,901 | 42,023 | 51,712 |
| B8_first_entry_ladder | 49,759 | 18,901 | 32,425 | 51,712 |
| B8_min_entry | 55,455 | 50,581 | 32,425 | 51,712 |
| B9_atr_below_entry_k1 | 21 | 18,901 | 34,852 | 48,739 |
| B9_atr_below_entry_k2 | 21 | -503 | 2,688 | 33,828 |
| B10_near_low | 55,455 | 45,527 | 36,993 | 45,820 |
| B10_fresh_crash | 55,455 | 18,901 | 42,023 | 51,712 |
| B10_ref_high_12 | 49,759 | 47,704 | 39,671 | 45,820 |
| B10_ref_high_15 | 49,759 | 28,301 | 36,993 | 33,828 |
| B10_persist2 | 55,455 | 47,704 | 36,993 | 51,712 |
| B10_deeper_signal | 49,759 | 47,704 | 39,671 | 54,307 |

**QQQ_2016_2026** — windows: 2020, 2023, 2025, 2026

| Config | 2020 | 2023 | 2025 | 2026 |
|---|---:|---:|---:|---:|
| B1_vol_k1 | 63,172 | 17,473 | -3,301 | 32,918 |
| B1_vol_k2 | 10,338 | 17,473 | 26,779 | 32,918 |
| B1_vol_k3 | 10,338 | 17,473 | 0 | 32,918 |
| B2_loss_k05 | 63,172 | 17,473 | -3,301 | 32,918 |
| B2_loss_k10 | 10,338 | 17,473 | 26,779 | 32,918 |
| B2_inverse | 63,172 | 17,473 | -3,301 | 32,918 |
| B3_entry_anchor_3 | 63,172 | 26,869 | -3,301 | 32,918 |
| B3_entry_anchor_5 | 63,172 | 17,473 | 26,779 | 32,918 |
| B4_credit_50 | 63,172 | 17,473 | -3,301 | 32,918 |
| B4_credit_100 | 63,172 | 24,181 | -3,301 | 32,918 |
| B5_shallow3_deep15 | 63,172 | 26,869 | 26,779 | 32,918 |
| B5_shallow3_deep6 | 63,172 | 17,473 | 26,779 | 32,918 |
| B6_up | 63,172 | 17,473 | 26,779 | 32,918 |
| B6_down | 63,172 | 17,473 | 26,779 | 32,918 |
| B7_decay120 | 63,172 | 17,473 | 26,779 | 32,918 |
| B7_stall | 63,172 | 17,473 | 26,779 | 32,918 |
| B8_first_entry_ladder | 63,172 | 26,869 | -3,301 | 32,918 |
| B8_min_entry | 63,172 | 26,869 | -3,301 | 32,918 |
| B9_atr_below_entry_k1 | 63,172 | 24,181 | -3,301 | 32,918 |
| B9_atr_below_entry_k2 | 63,172 | 24,181 | 26,779 | 32,918 |
| B10_near_low | 63,172 | 25,111 | -3,301 | 32,918 |
| B10_fresh_crash | 63,172 | 17,473 | 26,779 | 32,918 |
| B10_ref_high_12 | 63,172 | 25,111 | 19,964 | 32,918 |
| B10_ref_high_15 | 63,172 | 25,111 | 22,161 | 32,918 |
| B10_persist2 | 63,172 | 17,473 | 26,779 | 32,918 |
| B10_deeper_signal | 63,172 | 25,111 | 22,161 | 32,918 |
