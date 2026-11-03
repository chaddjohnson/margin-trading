# Study 9 Phase B — chronological validation (one-time test doors)

The five test records are `results/test/<FOLD>/test.json` (chain entries 10–14); F24's deterministic confirmation is
`results/test/F24/confirm.json` (entry 15). Tables: `results/tables/test-*.md`, `folds-*.md`, `F24-*.md`
(`tools/build_tables.py test folds tracks`).

**What these runs are.** Every test is one continuous causal run from the close of 2016-01-04 to the fold's test end;
nothing is reset at the cut (open lots, highs, continuation and shadow state, interest, drawdown peaks carry over). The
shortlists, roles, ranks, the comparator identities and every rule were sealed before any test door opened (selection
06:09:03Z, audit 06:26:42Z), and the doors opened once each, in Study 8's order (`results/doors.jsonl`, 2026-11-03):
F19 06:27:18Z, F20 06:39:32Z, F21 06:54:59Z, F23 07:17:40Z, F24 07:44:40Z. Each stage started at its predecessor's
seal (06:26:48Z, 06:38:59Z, 06:54:25Z, 07:17:05Z, 07:43:56Z). Test outcomes only vetoed. Each test stage first passed its
test-door allocator parity (TP1: 71, …, 109 production-path comparisons, 0 differences); F24 also reproduced Study 8's
13 sealed F24 test centres to the cent (TP2).

**Status of the evidence.** All of 2016-01-04 → 2026-10-29 was inspected before Phase B (Studies 5–9); the KRE and GDX
2025–2026 paths are especially familiar. The F24 window is an **algorithmically closed door on previously inspected
history: retrospective chronological persistence, not an untouched holdout.** The folds are procedural diagnostics on
overlapping windows. Two further hindsight sources: Phase A chose the seven memberships on 2016–2024 (so F19–F23 are
in-sample with respect to membership), and Study 8 chose VG #1/#2 on 2016–2024 (so they are in-sample on every F19–F23
window; their passes there are descriptive only). Two further exposures favour the comparators on F24: VG #2 became the
user's preferred configuration after Study 8's 2025–2026 results were seen, and B1 and B5 were chosen with 2024–2026
hindsight (PROTOCOL.md §9.1).

## 1. Fold by fold (every shortlist member and role holder; `folds-persistence.md`)

| Fold | Test window | yTest | Holders not failed | Members not failed | Members with run DD ≥ $35k | Median member test net | Gates failed most (members) | VG #2 (in-sample before F24) |
|---|---|---:|---:|---:|---:|---:|---|---|
| F19 | 2020-01-02 → 2021-12-31 | 2.00 | **0/22** | 0/42 | 31/42 | $3,120 | T2 42, T2b 42, T4 37, T3 32, T1 31 | pass, $132.7k |
| F20 | 2021-01-04 → 2022-12-30 | 2.00 | **0/24** | 0/42 | 21/42 | −$9,531 | T3 40, T2b 38, T2 37, T4 35, T5 24 | pass, $52.7k |
| F21 | 2022-01-03 → 2023-12-29 | 1.99 | **1/31** | 1/42 | 28/42 | −$4,694 | T4 36, T3 36, T2 35, T2b 35, T1 28 | pass, $63.2k |
| F23 | 2024-01-02 → 2024-12-31 | 1.00 | **6/29** | 7/42 | 0/42 | −$1,773 | T3 32, T4 31, T6 23 | pass, $28.6k |
| **F24** | **2025-01-02 → 2026-10-29** | 1.82 | **13/32** | 17/42 | 0/42 | $16,662 | T3 21, T6 10, T4 6, T2b 5, T2 4 | **pass, $79.9k** |

Study 7-equivalent gates (report-only), members passing: F19 0/42, F20 1/42, F21 3/42, F23 8/42, F24 30/42. No fold is
"insufficient evidence".

**Reading it (as in Study 8):**
- **Every holder failed on test windows containing a drawdown regime absent from its training** (F19: the 2020 crash;
  F20: the 2022 bear market) — 31 and 21 of 42 members breached $35k on the run through the test window. Study 8's
  H1 (drawdown control does not carry over to a drawdown regime absent from training) is supported descriptively
  again; on F21, whose test window also holds 2022, 28 of 42 breached. The one F21 survivor (#28 N2-SMH robust) is an exception, not a pattern.
- **Once training contained 2020 and 2022, drawdown control persisted:** on F23 and F24, 0 of 42 members breached the
  ceiling. Failures moved to economics: on F23 (the nearly inactive 2024) 32 members failed T3 (test net < $10k ×
  yTest); on F24, 21 failed T3 and 10 failed T6 (too few new test-window lots).
- **Training rank carried weak, positive information on F24** (`folds-return-rank.md`): Spearman(selection robust/yr,
  test centre net) 0.57 and (…, test median) 0.65 over 42 members, against 0.08 / 0.19 / 0.44 / −0.14 on F19–F23.
  Within tracks it is noisy (−0.60 to +0.31 on F24). Given PBO 0.61–0.92 in training, the F24 order is a selection
  rule, not a forecast.

**Lots carried across the test boundary** (`results/tables/test-inherited.md`, from the sealed per-lot ledgers). The
run is continuous, so a lot open at the cut enters the test window with its position, interest and stop state; only its
marked change after the boundary counts in the test-window net.

| Fold | Configurations with a carried lot (of role holders + controls) |
|---|---|
| F19 | 21 of 27: mostly IWM, GDX, MTUM and KRE lots entered October–November 2019 (B1, B5 and frozen VG carried the same VGT lot, 2019-08-05 → 2020-02-24) |
| F20 | 15 of 29: IWM, VGT, SMH, XLF, XHB and EDV lots (VG #1 and VG #2 carried a VGT lot into 2021) |
| F21 | 18 of 36: mostly GDX and KRE lots from December 2021; three V3-IWM holders carried a VGT lot from May 2021 |
| F23 | 11 of 34: EDV, EWW, SMH and VGT lots from October–November 2023 |
| F24 | 3 of 45: #7, #8 and #17 G4-ILF carried an ILF lot entered 2024-12-19 (exits 2025-02-26 +$7,067; 2025-01-14 −$365 and −$365). No nominee other than #8 and no comparator carried a lot into 2025. |

## 2. The primary one-time evaluation (F24)

**Mechanical result (sealed): outcome class _qualified_; 13 research nominations (12 pass, 1 ambiguous) among 32
role holders, in the sealed training order. The training-only #1, the exploratory VG3-IWM profit, failed (T2, T2b);
the primary nominee is #2 G4-EWW profit** — KRE:d1-f119614fc6 + EWW:d1-b73a3b8a94 + GDX:d1-35ae2734f6 +
MTUM:d1-9675728e96. Each survivor passed a sequential veto among 32 holders on a closed, inspected window; a few
survivors are expected even by chance.

| Rank | Track / role | T status | Run net | Test net | 2025 | 2026 YTD | New lots | Run minute DD | Test-window minute DD | Test share (n) | Test median |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | VG3-IWM profit | FAIL (T2, T2b) | $306,403 | $47,536 | $41,687 | $5,849 | 11 | $32,022 | $32,022 | 80.5% (384) | $56,712 |
| **2** | **G4-EWW profit** | **PASS** | $291,397 | **$31,530** | $2,123 | $29,407 | 14 | $22,975 | $22,188 | 98.4% (384) | $38,424 |
| 3 | G4-EWW extra | PASS | $360,468 | $45,407 | $15,531 | $29,876 | 14 | $21,967 | $21,967 | 95.1% (384) | $44,446 |
| 4 | G4-EWW robust | PASS | $312,616 | $39,128 | $10,110 | $29,018 | 14 | $26,287 | $26,287 | 99.2% (384) | $39,689 |
| 5 | G4-EWW balanced | PASS | $303,026 | $26,228 | −$1,193 | $27,420 | 11 | $26,287 | $26,287 | 99.5% (384) | $33,294 |
| 6 | G4-EWW extra | PASS | $348,762 | $33,318 | $6,820 | $26,498 | 11 | $27,193 | $27,193 | 98.4% (384) | $36,893 |
| 7 | G4-ILF profit | FAIL (T3) | $282,388 | $9,483 | $8,838 | $645 | 6 | $28,537 | $25,683 | 95.3% (384) | $11,403 |
| 8 | G4-ILF balanced | PASS | $252,004 | $22,750 | $19,573 | $3,176 | 10 | $27,857 | $27,294 | 99.7% (384) | $18,713 |
| 9 | VG3-IWM balanced | FAIL (T2, T2b) | $269,751 | $56,891 | $44,921 | $11,970 | 10 | $27,061 | $27,061 | 87.2% (384) | $61,646 |
| 10 | VG3-IWM extra | AMBIGUOUS | $337,937 | $55,229 | $47,601 | $7,628 | 11 | $31,098 | $31,098 | 92.7% (384) | $55,376 |
| 12 | G4-ILF extra | PASS | $199,310 | $19,307 | $11,545 | $7,762 | 18 | $23,419 | $19,055 | 98.4% (384) | $24,461 |
| 14 | N2-SMH profit | PASS | $294,679 | $76,540 | $75,993 | $548 | 4 | $30,112 | $24,678 | 100.0% (384) | $73,777 |
| 15 | VG3-IWM robust | PASS | $214,928 | $67,039 | $50,317 | $16,721 | 10 | $19,172 | $19,172 | 100.0% (384) | $58,098 |
| 16 | VG3-IWM extra | PASS | $288,284 | $64,837 | $44,921 | $19,916 | 10 | $19,717 | $19,717 | 99.2% (384) | $66,071 |
| 23 | V3-IWM profit | PASS | $172,161 | $26,081 | $26,103 | −$22 | 4 | $21,267 | $19,857 | 99.5% (384) | $25,405 |
| 25 | V3-IWM extra | PASS | $214,167 | $40,784 | $30,930 | $9,854 | 7 | $21,826 | $19,857 | 96.4% (384) | $25,237 |

(Every holder, including the 19 failures, is in `results/tables/test-F24-holders.md`. The other failures: #11 and
#17 G4-ILF (T3), #13 N2-SMH extra (T2, T2b), #18/#19/#24 N2-SMH (T3, some T4), every N3-EDV and N2-EDV holder (T3, most
also T6: 0–7 new lots), and #26/#30 V3-IWM (T3, T6).)

**The comparators on the same run and the same Phase B test families** (`test-F24-controls.md`):

| Configuration | T status | Run net | Test net | 2025 | 2026 YTD | Run minute DD | Test share (n) | Test median |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **Study 8 VG #2 balanced** | **PASS** | $340,148 | **$79,925** | $47,239 | $32,685 | $21,304 | 98.2% (384) | $72,081 |
| Study 8 VG #1 profit | AMBIGUOUS | $308,742 | $64,166 | $50,865 | $13,302 | $31,225 | 94.3% (384) | $66,386 |
| B1 (VGT `primary`) | FAIL (T5) | $176,260 | $40,901 | $47,463 | −$6,561 | $19,534 | 99.5% (384) | $41,823 |
| B5 | FAIL (T2, T2b) | $484,637 | $71,986 | $45,679 | $26,307 | $26,510 | 26.8% (384) | $52,935 |
| Frozen VG | FAIL (T2, T2b) | $278,266 | $70,420 | $47,463 | $22,957 | $25,774 | 69.5% (384) | $65,395 |

## 3. Reading the F24 result

- **No Phase B holder out-earned VG #2 balanced in the test window.** VG #2 made $79.9k (run DD $21.3k, 98.2%); the
  best Phase B test nets were #14 N2-SMH profit $76.5k (almost all in 2025: four lots), #15 VG3-IWM robust $67.0k
  and #16 VG3-IWM extra $64.8k. The nominee made $31.5k, $2.1k of it in 2025.
- **Where the KRE + GDX pools lost ground:** in 2025 the G4-EWW holders made −$1.2k to $15.5k while VG #2, B1 and
  B5 made $45–48k (the 2025 tariff rebound was a VGT event; the G4 pools hold no VGT). In 2026 YTD they made
  $26.5–29.9k, about VG #2's $32.7k.
- **Whole-run (in-sample-dominated) totals** are not evidence of advantage: #3 G4-EWW extra's $360.5k exceeds VG #2's
  $340.1k, but 2017–2024 is training for both.
- **The exploratory VG3-IWM pool** — added to test whether Phase A's generic screen missed a strong VG economy — did
  produce the training #1 ($31.1k/yr robust), but its two most profitable configurations lost neighbourhood breadth on
  the run through 2026 (80.5% and 87.2%). Its conservative holders (#15 robust, #16 extra) passed at 99–100% with
  $65–67k test nets, below VG #2's $79.9k and ranked 15th and 16th in training.
- The VG #2 comparison with uncertainty (confirmatory and family-wise bootstraps) is in the sealed preference record
  (RECOMMENDATION.md).

## 4. Test-window drawdowns versus cumulative drawdowns

The run minute DD is cumulative over 2016 → 2026-10-29; the test-window minute DD resets the peak to the mark before
2025-01-02 (`periodMinuteDrawdown`). For the nominee they are $22,975 and $22,188 (its worst drawdown is the March 2020
crash; its worst test-window drawdown is 2026-06-17 → 07-31); for VG #2 both are $21,304 (2026-04-01 → 07-17), so
its worst drawdown is inside the test window. A neighbourhood pass rate over the whole run does not make the 2025–2026
drawdowns independent of 2016–2024.

## 5. The 2026-10-30 slice

Reported separately (`results/slice/slice-2026-10-30.json`; RECOMMENDATION.md): one elapsed session, not a gate, not a
holdout, never used to amend anything.

## 6. Confirmation

`s9b.sh test F24 --confirm` repeated the F24 stage deterministically in a fresh memory cache
(`results/test/F24/confirm.json`, chain entry 15): **IDENTICAL** to `test.json` in every evaluated field, with
byte-identical lot ledgers. It can only detect computational mistakes.
