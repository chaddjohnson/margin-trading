# Study 9 Phase B — recommendation

**Research only — NOT DEPLOYED. No margin order is proposed. Nothing here changes Study 8's VG #2 balanced, B1, B5 or
the prospective system. No Phase B holder showed an advantage over Study 8 VG #2 balanced.** None out-earned it on
the 2025–2026 window, and the primary nominee earned significantly less. The closest holders' differences are
inconclusive in either direction. **VG #2 remains the user's preferred configuration.**

Sources: the sealed records of chain entries 10–18 — the five one-time test records, the F24 confirmation, the
2026-10-30 slice, `results/diagnostics/diagnostics.json` and `results/preference/preference.json` — and the tables
generated from them (`results/tables/`). The three decisions below are computed by the sealed report-only stage
`preference` (`preference-decisions.md`); this report explains them and adds no new selection.

## 1. Mechanical protocol nomination (sealed; no judgment)

- **Primary one-time evaluation (F24):** trained on the projection 2016-01-04 → 2024-12-31. Tested once, as one
  continuous causal run through 2026-10-29, on the 2025-01-02 → 2026-10-29 window. The F24 test door opened once, at 2026-11-03T07:44:40Z (`results/doors.jsonl`).
  - Outcome class **qualified**.
  - **13 research nominations** among the 32 sealed F24 role holders, in the sealed training-only order: #2, #3, #4,
    #5, #6 G4-EWW; #8, #12 G4-ILF; #10 VG3-IWM (ambiguous); #14 N2-SMH; #15, #16 VG3-IWM; #23, #25 V3-IWM. That is
    12 pass and 1 ambiguous.
  - **The training-only #1, the exploratory VG3-IWM profit, failed** (T2, T2b: only 80.5% of 384 test neighbours
    stayed below $35k).
  - **Primary nominee: #2 G4-EWW profit**: `KRE:d1-f119614fc6` + `EWW:d1-b73a3b8a94` + `GDX:d1-35ae2734f6` +
    `MTUM:d1-9675728e96`. Config `config/research-pools/study9-phase-b/S9B-G4-EWW-F24-1.json`; run it with
    `npm run study9b-run -- run s9b-nominee`.
- **Per track:** the track's top-ranked non-failed holder (PROTOCOL.md §8.4). Both EDV tracks have none; their rows
  show the top-ranked failed holder for reference only, never as a candidate.

  | Track | Membership | Holder | T | Test net | Run minute DD | Test share |
  |---|---|---|---|---:|---:|---:|
  | G4-EWW | KRE+EWW+GDX+MTUM | #2 profit | pass | $31,530 | $22,975 | 98.4% |
  | G4-ILF | KRE+GDX+ILF+MTUM | #8 balanced | pass | $22,750 | $27,857 | 99.7% |
  | VG3-IWM (exploratory) | VGT+GDX+IWM | #10 extra | ambiguous | $55,229 | $31,098 | 92.7% |
  | N2-SMH | SMH+XHB | #14 profit | pass | $76,540 | $30,112 | 100.0% |
  | V3-IWM | VGT+IWM+XLF | #23 profit | pass | $26,081 | $21,267 | 99.5% |
  | N3-EDV | EDV+IWM+XLF | #20 profit (every holder failed) | FAIL (T3, T6) | $5,194 | $19,053 | 98.4% |
  | N2-EDV | EDV+XHB | #22 profit (every holder failed) | FAIL (T3) | $3,882 | $17,373 | 99.0% |

  Both EDV pools failed on economics: too little test-window profit and activity (0–7 new lots).
- **Procedure folds** (`CHRONOLOGICAL_VALIDATION.md` §1): holders not failed F19 0/22, F20 0/24, F21 1/31, F23 6/29.
  Every holder failed on the windows containing a drawdown regime absent from its training: 2020 for F19, 2022 for
  F20; on F21, 28 of 42 members breached $35k. F23 failures were economic (the nearly inactive 2024).

## 2. Economic comparison with VG #2 balanced (the primary comparator)

**Same continuous run, costs and Phase B test families** (`test-F24-controls.md`, `F24-tracks.md`):

| Configuration | T | Run net | Test net | 2025 | 2026 YTD | Run minute DD | Test share | Test median | Test p10 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Study 8 VG #2 balanced** | pass | $340,148 | **$79,925** | $47,239 | $32,685 | $21,304 | 98.2% | $72,081 | $59,741 |
| #2 G4-EWW profit (nominee) | pass | $291,397 | $31,530 | $2,123 | $29,407 | $22,975 | 98.4% | $38,424 | $25,025 |
| #3 G4-EWW extra | pass | $360,468 | $45,407 | $15,531 | $29,876 | $21,967 | 95.1% | $44,446 | $31,563 |
| #14 N2-SMH profit | pass | $294,679 | $76,540 | $75,993 | $548 | $30,112 | 100.0% | $73,777 | $66,406 |
| #15 VG3-IWM robust | pass | $214,928 | $67,039 | $50,317 | $16,721 | $19,172 | 100.0% | $58,098 | $41,881 |
| #16 VG3-IWM extra | pass | $288,284 | $64,837 | $44,921 | $19,916 | $19,717 | 99.2% | $66,071 | $52,057 |
| Study 8 VG #1 profit | ambiguous | $308,742 | $64,166 | $50,865 | $13,302 | $31,225 | 94.3% | $66,386 | $28,907 |
| B1 | FAIL (T5) | $176,260 | $40,901 | $47,463 | −$6,561 | $19,534 | 99.5% | $41,823 | $36,987 |
| B5 | FAIL (T2, T2b) | $484,637 | $71,986 | $45,679 | $26,307 | $26,510 | 26.8% | $52,935 | $33,125 |

- **No Phase B holder out-earned VG #2 in the test window.** The closest, #14 N2-SMH profit, made $76.5k: almost all of
  it in 2025, from four lots, with a run DD of $30.1k. Its XHB book adds $2.0k (`POOL_COMPLEMENTARITY_AND_LEDGER.md`).
  The nominee made $31.5k, $48.4k less than VG #2.
- **Confirmatory test (predeclared; the primary nominee only):** nominee − VG #2 daily P&L on the F24 window, paired
  stationary block bootstrap (block 21, 5,000 resamples). Observed **−$48,394**; 5% / 50% / 95% of the resampled total
  **−$93,738 / −$47,429 / −$9,108**; share above zero 2.1%. **Verdict: no advantage.** The whole interval is below
  zero: the nominee earned less than VG #2 on this one inspected window (a 90% two-sided interval that excludes zero).
- **Family-wise test** (max-T on common indices; 32 comparisons — every F24 holder, including the nominee and the 19
  failed ones): every adjusted p is ≥ 0.958, the smallest #14 N2-SMH profit (Δ −$3,384). **No holder shows an
  advantage over VG #2.**
- **The closest three holders are inconclusive, not shown worse.** For #14 (Δ −$3,384, SE $41,801), #15 (−$12,886,
  SE $29,622) and #16 (−$15,088, SE $33,023), the differences are small against their bootstrap standard errors. The
  protocol's label is "no advantage", but these data cannot tell whether VG #2 or these holders earned more on this
  window.
- **Whole run (descriptive only: 2016–2024 is training for both):** #3 G4-EWW extra (+$20,320) and #6 G4-EWW extra
  (+$8,614) exceed VG #2's $340,148. That is in-sample and not evidence of advantage.
- **Training economics under identical labels** (G4-EWW track): the nominee's confirmation median $33,461/yr, p10
  $28,587/yr and robust $31,024/yr exceed VG #2's $29,493, $23,778 and $26,635 (+$4.4k robust). Its centre net
  $34,485/yr misses VG #2's $34,532 by $47/yr. These are in-sample, selection-biased optima for both.
- **Against the other controls** (unadjusted per-holder bootstraps of the test stage, `test.json`): the nominee is
  −$32.6k against VG #1 (5–95%: −$85.3k to +$16.6k), −$9.4k against B1 (−$70.6k to +$54.6k) and −$40.5k against B5
  (−$86.0k to +$1.7k) in the test window. All are inconclusive or negative, never an advantage.

**Comparator exposure, which favours the controls on this window:**
- VG #2 was selected by Study 8 on 2016–2024. It became the user's preferred configuration only after Study 8's
  2025–2026 results were seen.
- B1 and B5 were chosen with 2024–2026 hindsight (PROTOCOL.md §9.1).
- VG #1 is *ambiguous* under Phase B's test families (one family at 89.8% below $35k) but *pass* under Study 8's own
  (93.2%). The runner's `list` shows Study 8's status, labelled S8.

**Why the G4-EWW pools lagged in 2025–2026.**
- GDX carried them: Shapley GDX $172k of the nominee's $291k run net, and only GDX and KRE earned in the test window.
- In the 2025 tariff episode they missed VGT's rebound, which made $47.2k for VG #2's VGT book.
- In 2026 YTD they earned about what VG #2 did ($26.5–29.9k against $32.7k). The G4-ILF holders made −$1.3k to
  $11.8k.

## 3. User-preference assessment (descriptive; does not change the mechanical order)

The user's preference bands (`preference-holders.md`; band = the lower of the training confirmation and the F24
test-family band):
- **Preferred band (≥ 95%), 12 holders:** #2, #3, #4, #5, #6 G4-EWW; #8, #12 G4-ILF; #14 N2-SMH profit; #15, #16
  VG3-IWM; #23, #25 V3-IWM.
- **Diagnostic band (90–93%):** #10 VG3-IWM extra (92.7%), qualifies mechanically but is never the preferred
  selection.
- **Conditional band (93–95%):** no non-failed holder.

**Versus VG #2, every preferred-band holder is "no advantage", and none is economically compelling.** PROTOCOL.md
§9.3 requires, among other things, a meaningful, uncertainty-aware advantage over VG #2, positive contributions and
credible fills:
- **No holder shows an advantage.** The nominee's confirmatory interval lies wholly below zero, and every
  family-wise adjusted p is ≥ 0.958.
- **#8 G4-ILF balanced and #12 G4-ILF extra also fail the fill criterion.** 12.8% and 27.2% of their fills printed
  on bars below the $100k notional (`EXECUTION_RISK_AND_LIQUIDITY.md` §3). #12 also fails the contribution criterion
  (KRE's leave-one-out contribution is −$32.6k).
- **The conditional-band compelling case (§9.2) is moot.** It would admit a 93–95% holder, and no non-failed holder is
  in that band. The preference record evaluates its six items for every row anyway: item 1 (training economics against
  VG #2) and item 6 (the test window against VG #2) are false for all 32 holders. For the nominee, item 1 fails only
  on the centre net, by $47/yr.

**Descriptive reading for the user (not a selection):**
- **VG #2 balanced stays the preferred configuration.** It had the best 2025–2026 test net of every evaluated
  configuration that did not fail ($79.9k). It had the lowest run DD ($21.3k) of the configurations that made at
  least $70k in the test window, and a 98.2% test share. It is itself in-sample on 2016–2024, was inspected on
  2025–2026 by Study 8, and became the favourite after that inspection.
- **Phase B produced stable but less profitable alternatives, not a better pool.**
  - **#15 VG3-IWM robust:** the most robust high earner (100% / 100% shares, $67.0k test net, run DD $19.2k, Δ
    −$12.9k against VG #2, family-wise p 0.987). It ranked 15th in training. It adds IWM to VG #2's VGT + GDX
    architecture.
  - **#14 N2-SMH profit:** a different economy (SMH; 100% / 100%, $76.5k). It is essentially a single-book SMH pool
    that earned almost everything in 2025, with a run DD of $30.1k.
  - **The G4-EWW pools:** broad plateaus (95–99.5%), with test nets of $26.2–45.4k, well below VG #2. Only the
    passing G4-ILF holders earned less (#8 $22.8k, #12 $19.3k).

## 4. Evidence confidence

- **Training is strongly selected and overfit-prone.**
  - 498,579 configurations at rung 1 and 11.4 million fresh neighbourhood evaluations, on overlapping windows from
    2016.
  - F24 PBO 0.61–0.92 in every track (G4-ILF 0.86, G4-EWW 0.84, N3-EDV 0.92, N2-SMH 0.76, V3-IWM 0.70, N2-EDV 0.61,
    VG3-IWM 0.82).
  - The training winner, VG3-IWM profit, failed its first test.
- **Training rank carried weak, positive information on F24** (Spearman 0.57 against test net over 42 members) and
  little on F19–F23 (0.08 / 0.19 / 0.44 / −0.14; only F21's is material). The order is a selection rule, not a
  forecast.
- **No genuinely unseen history.**
  - Every session through 2026-10-29 had been inspected before Phase B (Studies 5–9), the KRE and GDX 2025–2026 paths
    especially.
  - Phase A chose the seven memberships on 2016–2024.
  - The F24 pass is **retrospective chronological persistence, not an untouched holdout.**
  - 13 survivors of a sequential veto among 32 holders on a closed, inspected window: a few are expected by chance.
- **The procedure folds are the strongest negative evidence.** Every holder failed when its test window held a
  drawdown regime absent from its training (F19, F20). Training through 2024 contains 2020 and 2022, but a future
  regime unlike both could break these configurations the same way. A neighbourhood pass rate is not a probability
  of future safety.
- **Concentration** (`EXECUTION_RISK_AND_LIQUIDITY.md` §5):
  - 2020 is the best year of every nominee and control shown; the 2020 crash and rebound (Feb–Apr 2020) gave 23% of
    the nominee's run net.
  - GDX leads the worst drawdown of 10 of the 15 GDX holders and of VG #1 and VG #2; the 2026 GDX episodes are
    shared. KRE leads it in the G4-ILF holders and in B5.
- **Execution:**
  - ILF and EDV are not credibly executable at $100k on minute liquidity.
  - EWW and MTUM are marginal: a 10% participation cap would have allowed a median $46k (EWW) and $32k (MTUM) per
    fill for the nominee, and $46–62k and $32–79k across the G4-EWW holders.
  - The ceiling is a backtest screen, not a broker stop. The user's core portfolio is not modelled.
- **Reproducibility:**
  - The F24 confirmation reproduced the test record identically in a fresh cache.
  - The runner reproduced 36 configurations and 1,854 funded lots to the cent with 0 mismatches
    (`results/runner/reconcile-2026-10-29.txt`; B1 and B5 against Study 7's sealed door).
  - The amendments (AMENDMENTS.md E1–E5) changed no rule, input or result.

## 5. The 2026-10-30 slice (reported separately)

One later local session, run as a sealed report-only stage after the F24 confirmation (`slice-2026-10-30.md`). It is
**not a gate, not a holdout, not prospective, and was never used to amend anything.**

| Configuration | Session P&L | Entered / exited / open at close | Session minute DD |
|---|---:|---|---:|
| #2 G4-EWW profit (nominee) | −$4,276 | 0 / 1 / 0 | $4,276 |
| VG #2 balanced | −$5,236 | 0 / 0 / 1 | $6,734 |
| VG #1 profit | −$5,236 | 0 / 0 / 1 | $6,734 |
| B5 | −$5,173 | 0 / 0 / 1 | $6,652 |
| B1 | $0 | 0 / 0 / 0 | $0 |

No configuration's cumulative run DD changed on the slice. One session carries no evidential weight.

## 6. The three decisions

1. **Mechanical protocol nomination: #2 G4-EWW profit** (primary nominee), with the other 12 non-failed F24 holders
   as the research set (#10 VG3-IWM extra labelled ambiguous). Retrospective, research-only, NOT DEPLOYED.
2. **User-preference assessment:**
   - 12 preferred-band holders and 1 diagnostic-band holder; none is conditional.
   - **None has an advantage over VG #2 and none is economically compelling.**
   - **No Phase B pool showed an advantage over Study 8 VG #2 balanced, which remains the preferred candidate.** The
     nominee earned significantly less; the closest holders (#14, #15, #16) are inconclusive in either direction. The
     ex-post reading in §3 is descriptive, not an untouched selection.
3. **Deployment decision: RESEARCH ONLY — NOT DEPLOYED.** No margin orders, no change to margin borrowings, no
   change to the prospective system or its frozen benchmarks.

## 7. Prospective follow-up plan

A new, separate study; nothing here authorises it, and the user decides whether it proceeds.

1. **Freeze before the first unseen session:**
   - VG #2 balanced as the reference;
   - as challengers, at most the mechanical nominee #2 G4-EWW profit, #15 VG3-IWM robust and #14 N2-SMH profit;
   - B1 and B5 as controls.
   Use the research configs under `config/research-pools/study9-phase-b/` and Study 8's `S8-VG-F24-3`. Exclude ILF
   and EDV pools at $100k.
2. **Run forward only on sessions after 2026-10-30** (the slice has been seen). Use the unchanged pools engine at
   5 bps and 11%, with `npm run study9b-run -- compare s9b-nominee s9b-vg3-iwm-robust s9b-n2-smh-profit
   s8-vg-balanced vgt-primary b5-frozen` into new output directories.
3. **Predeclare before the first new session:**
   - a minimum horizon (e.g. 12 months);
   - the comparison: paired forward daily P&L against VG #2, with the same block bootstrap;
   - kill rules: minute DD ≥ $35k, or a fresh-seed neighbourhood share below 0.90 on the forward window;
   - that the forward window will not be used to re-select or re-tune.
4. **Measure execution where minute bars cannot:** record would-be fills against real quotes (spread, decision-to-fill
   delay, opening-auction fills) for EWW, MTUM and GDX, without broker orders unless the user separately requests
   them.
5. **Mark 2016-01-04 → 2026-10-30 as exposed** for any future optimisation study, and model the slot together with
   the user's 60% VOOG / 40% VGT core portfolio before any margin decision.
