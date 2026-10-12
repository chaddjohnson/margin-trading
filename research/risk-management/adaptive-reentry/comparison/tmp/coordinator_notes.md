# Coordinator notes — standalone family results (accumulated as agents return)

## Family A — loss classification (COMPLETE)

- Calibration gate passed; 10 configs, 40 runs, 300 checks OK. Report: loss-classification/LOSS_CLASSIFICATION.md.
- Financing-only restrictions under A0: 15/88 episodes (17%); only ONE major winner blocked outright
  (QQQ 2010-08-26 +$19,221, armed by a −$295 interest-only loss). On VGT16-26 financing-only
  restrictions were net PROFITABLE (incl. +$21.9k better 2026 window via the 2026-02-05 restriction).
- KEY REFRAME: VGT 2023-01 miss is NOT the −$143 loss on the 3% path — arming loss was 2022-11-03,
  −$1,306, price return −0.49% (real price loss). A1 (price-loss-only) does NOT fix it. All A2 cutoffs
  (−0.5%..−3%) decline that trigger by 0.0076pp (knife edge!) and recover VGT 2023 (+$44,468 vs A0
  +$18,901). A3 dollar bands ($500/$1k) fail; A4 fails.
- 2000–02 protection survives material-loss floors up to −2% (~$5–6k cost vs A0). A2_material_3
  re-opens the cascade (−28.8k window, DD 95.4k). A4 proportional = family-best old-era DD but misses
  Mar-2009 both old datasets (like old −8%); worse than lower3 in 7/8 net comparisons.
- No config dominates A0 on all 4. Promising: A2_material_05 (≥A0 on 3 of 4, −1.4k VGT16),
  A2_material_1 (QQQ-old +26.9k net/−13.1k DD vs A0, beats both matched controls there). Inconclusive:
  A2_material_2 (old-era star 52.1k/54.3k VGT05, 70.1k/77.2k QQQ99; new-era negative). Unpromising:
  A1, A2_material_3, A3_a, A3_b, A4_05, A4_10 (A4_10 = drawdown-only tool; G idea: clip severity at 3%).
- QQQ 2003 unfixed by every trigger config — discount/reset failure, not trigger failure.
- Flag for validation: cutoff sensitivity around the −0.4924% knife edge (A2 cutoffs).
- Headline (net/DD): A2_material_05: 28,363/54,279 | 51,812/93,720 | 180,663/29,336 | 133,745/29,106.
  A2_material_1: 28,363/54,279 | 67,162/78,370 | 184,948/29,336 | 122,206/29,106.

## Family C — recovery resets (COMPLETE)

- 22 configs (incl. 6 C12 proposals), 88 runs, calibration passed. Report: recovery-resets/RECOVERY_RESETS.md.
- WINNERS: C11_graduated (stage-2: 1.5% discount after 8% rebound off episode low; full reset via C1):
  never below C1 anywhere; +16,153/+15,196/0/0 vs C1; 2000-02 window POSITIVE (+5,926); 0 false resets
  in-window; caught Oct-2002 bottom (+$21,285). C6_retrace_38 (reset at 38% retrace of ref-high→low
  decline): best aggregate (Σ437k vs C1 381k), rescues VGT 2023-01 (+31.7k) and half of QQQ 2003
  (+15.4k); beats ex-post lower3 control both dims on QQQ-old; cost −3.4k on VGT-old.
  C5_atr_rebound_3 promising-leaning-inconclusive (+40.7k VGT-new; −21.4k VGT-old via 2008 resets).
- C0 (no reset): catastrophic — one −$2,903 loss (2019-01-03, 0.52% miss) sidelined VGT ~8 years
  (−$153,661 vs baseline); QQQ episode dead 13 years. Resets are mandatory.
- C2_exit_price recreates the repeated-entry problem (QQQ 2000-02 −57,079, DD 114,608). C8 breakout:
  82% false-reset rate. Time-only resets (C10, timeout120) fail.
- KEY INVERSION: under the fixed 3% discount the 2020/2026 V-bottom misses don't exist on the C-family
  path (discount catches them) — permissive resets can only BREAK those entries by firing while a
  discount is pending (C10's 2009-02-24 reset cost ~$58k vs C1). Genuine rescue (2023-01) was indirect
  via lower exit anchors from extra Nov-Dec 2022 trades.
- Diagnostic subtlety: overall false-reset rate (59-69%) ≈ losing-trade base rate — only in-bear-window
  counts discriminate mechanisms.
- C7_rolling95: 52% of its resets were decay-earned (rolling high fell below frozen) — confirms the
  obsolescence concern but caps episodes at 69 sessions.
- Flags for validation: C11 sensitivity (1.08 rebound/1.5% stage-2), C6 retrace 0.30-0.50, C5 k 2-4.
- Dependence severe: 2 trades carry C11's edge; 1 reset destroys C10.

## Family B — adaptive discounts (COMPLETE)

- 26 configs, 104 runs, calibration passed, 0 indicator fallbacks. Report: adaptive-discounts/ADAPTIVE_DISCOUNTS.md.
- B7_stall (3% until episode low is 20 sessions old, then decay over 60): trade-IDENTICAL to existing
  3% on three datasets; QQQ99 61,425/70,302 (+21,167 net, −21,167 DD vs 3%), beats both matched
  controls there. The family's only never-worse config. PROMISING.
- B2_inverse (severe loss ⇒ LESS waiting; floor 0.5%): 26,602/52,761 | 54,819/72,722 | 228,043/28,687 |
  93,608/29,423 — beats 3% + both controls on 3 of 4; −38,634 QQQ16 (early re-entries after big 2022/
  2025 losses). PROMISING. Floor is load-bearing (0% floor → DD 107k).
- B7_decay120: best VGT16 (231,156/28,687) but whole +49k edge = ONE 0.09% knife-edge entry at the
  exact 2022 low. Did NOT degenerate into cooldown (0/66 re-entries <1% realized discount). P/I.
- ANCHOR VERDICT: loss-EXIT price wins decisively. Entry anchors structurally looser (B3: level above
  the failed exit in 27/53 QQQ episodes → −118,054 net, DD 182,189 — worse than baseline). B8_min_entry
  degenerated to B3 identically (correction memory added nothing). Correction-top anchors barely bind.
- DIRECTION: inverse loss-scaling wins everywhere (B2_inverse ≥ B2_loss); proportional severity
  rebuilds the −5/−8% misses (consistent with A4).
- QQQ 2003: fixed ONLY by correction-top/market-structure anchors (B10_ref_high etc.) which surrender
  2000-02 entirely — a fundamental anchor trade-off, consistent with C's finding (2003 is the one
  episode where exit-anchoring itself is the failure).
- Knife edge NOT solved, relocated (new decisive gaps 0.018-0.44% created by adaptive rules).
- B1_vol recreates the 2020 miss (NATR widens in crashes — volatility scaling is procyclical). B6_up
  recreates it via 2nd-failure 5%.
- Flags: B7_stall age/decay sensitivity; B2_inverse floor/slope; B5 dd-split.

## Family F — intraday execution feasibility (COMPLETE)

- Verdict: substantially a MIRAGE; full minute-bar backtest NOT warranted. Report:
  execution-feasibility/INTRADAY_FEASIBILITY.md.
- 114 low<=level<close occurrences: 76 class-(a) legitimately executable; 0 class-(b) (frozen levels
  always sat <= 0.90 x prev-90 high, so the intraday-unknowable close signal never binds); 27
  gap-through; 11 ambiguous (all arming-day; ZERO reset-vs-fill conflicts).
- Known misses: 7 of 9 named config-episodes NEVER printed the level intraday (VGT 2023-01 all three;
  VGT 2020 lower8; VGT 2026 lower8; QQQ 2003 B/D). ERRATUM: lower-price-reentry REPORT §10 claimed
  "three of the four decisive misses had intraday lows through the trigger" — WRONG; record the
  correction in COMPARISON.md (do not edit the frozen report).
- The one real rescue: VGT 2020 lower5 limit-fill 2020-03-18 @22.0067 → tiny +$1,029 trade whose
  PROFITABLE exit clears the restriction → normal 03-24 entry +$48.5k (chain delta +$49.6k) — but
  knife-edge (~1% from re-arming) and destroyed in the full-sequence variant by an earlier gap-fill.
- Resting-limit execution model overall: WORSE on 10/12 pairs (e.g. QQQ-old 5%: −$99k; 21 bear-rally
  limit fills −$59k). The same-close approximation has been SUBSIDIZING the strategy (close entries
  fill through the level in cascades). Bright spots: VGT-old 8% 2009-03-09 print (+$33.8k; D's missed
  VGT 2009 WAS printable), VGT-new 5% 2025-04-21 gap-fill (+$42.6k).
- QQQ 2003 is a signal failure, not execution. QQQ 2009 for 8% stays missed even intraday.
- Minute data: no free source covers 1999-2026; FirstRateData ~$100/yr from 2000; value bounded to ~9
  marginal touches + 11 arming-day cases (<$9k each). Not justified.
- G/validation flags: gap-through-only execution decomposition; trigger entanglement (a +$1,029 exit
  clears what a −$143 loss re-arms — links to Family A's material-loss cutoff).

## Family D — recovery opportunity preservation (COMPLETE)

- 15 configs, 60 runs, calibration + anchors exact. Report: recovery-opportunities/RECOVERY_OPPORTUNITIES.md;
  per-episode D6_FAILURE_MECHANISMS.csv (150 rows).
- D6 TAXONOMY (the program's key diagnostic): dominant DIRECT mechanisms are small_loss_trigger
  (7/13/15 @3/5/8%) and signal_lapsed-after-reset (8/6/11; incl. QQQ 2009 +57.8k at 8%), NOT price
  proximity (never_reached_level 3/10/10; intraday-only 1/2/2). ~45% of raw misses = holding-overlap
  artifacts, not restriction failures.
- D7_tiny_loss_exit_anchor (|loss|<$2k ⇒ required level = loss exit price, no extra 3%): the family
  best — 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 (Σ +41.4k vs lower3); QQQ-old
  beats BOTH matched controls by wide margins; 2000-02 bill only −$1,891 (3 alt entries) — cheapest
  rescue of any path in the program. Weakness: QQQ-new −9.5k from one 2018-12 trade. PROMISING.
- D3_tolerance_deep (2% tolerance only while dd252 ≥ 25%): Σ +29.7k, rescued 2023 windows, 2000-02
  BETTER than REF; vs a plain fixed 1.06%-smaller threshold the dd gate's only demonstrable value is
  protecting shallow regimes (QQQ-new +43k swing). Promising (narrowly).
- ALL rebound/turn-gated alt paths bought 2001-style rallies: D4_score 23 alts −$65k; confirm_near
  −$56k; fresh_leg −$27k ("fresh legs" kept falling). D1_reset_only_rebound12 = family worst
  (Σ −153.6k; destroyed 2009 on both old datasets) — consistent with C's finding that permissive
  resets break pending discounts. D2_window near-unsatisfiable as specified (fired once in 26 yrs).
- D5_stabilized_relax: null result (changed one entry ever).
- First real dual-trigger/reset-priority cases in the program occurred under D1_reset_only.
- Flags: D7_tiny $2k bound overlaps Family A bands (G ablation needed: tiny-loss-exit-anchor vs
  A2-material-cutoff — functional near-duplicates); D3 gate; C-scoring by signal-alive-at-reset.

## Family E — correction memory (COMPLETE)

- 5 configs, 20 runs, calibration passed; 26/26 raw-price spot checks. Report: state-memory/CORRECTION_MEMORY.md.
- CROSS-CHECK: E2_entry_only ≡ B3 results EXACTLY (−118,054/182,189 QQQ-old) — independent
  implementations agree; integrity signal for the whole program.
- Verdict: exit-price memory (E1) most economically sensible (recent → below market → actually spaces
  re-entries); entry anchoring principled but PERVERSE (E2 re-entered 4.1% ABOVE its own loss exit;
  −$102.7k through 2000-02). Richer state lost: E1 (2 quantities) beats every 3-quantity machine on
  3 of 4 datasets and E5 on all 4; each added quantity added a failure mode.
- E4_cum_loss: right quantity, wrong form — family-best bear windows (2000-02 −6,074) but clip
  saturates at 8% once a correction loses $7k → becomes D_lower8 exactly where D_lower8 fails
  (missed Mar-2009 both old sets). Inconclusive; flagged: uncapped E4 + rebound reset.
- IMPORTANT NUANCE vs A/D: micro-loss armings are net POSITIVE more often than not (E5 "never rearm
  <2% cumulative" loses to E1 on ALL FOUR datasets; micro-arming cost 2023-01 +28k but earned +21.9k
  in 2026 + +3.3k 2023-10). The −$143 intuition does NOT generalize → favor "arm but anchor gently"
  (D7_tiny) over "don't arm" (E5); A2's per-trade material cutoff sits between — G must ablate.
- Blunt profit-erasure flagged (a +$41 trade erased a −$7.7k correction) but no better rule found.
- No E machine beats the 3% exposure control on both dims anywhere (E4 QQQ-new cell is 1/20 — replay
  before believing).

## G-stage candidates suggested by A, B and C

- Material-loss trigger (−0.5% or −1%) as the trigger component in combinations.
- A4-style severity clipped at 3% (agent's suggestion) — register as G ablation only if combined with
  a V-bottom-preserving reset.
- C11 graduated restriction and C6_retrace_38 as the reset components in combinations.
- C-agent's proposed reset guard: "no reset while close <= required level x (1+x)" — fixes the
  reset-priority inversion (a reset surrendering a pending discount entry). Strong G candidate.
- B-agent: B7_stall + B2_inverse-style small-loss relaxation are complementary; B10_near_low's
  max(base, min(exit x 0.99, low x 1.01)) composes as a bolt-on rescue.

## Pending: B (discounts), C (resets), D (recovery opps), E (state memory), F (intraday).
