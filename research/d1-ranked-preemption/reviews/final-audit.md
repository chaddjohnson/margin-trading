# Final audit: D1 ranked preemption (`research/d1-ranked-preemption/`)

Auditor: an independent, read-only subagent. Audit date 2026-10-26. I edited no files and ran no stage command.

## Verdict

**The "no advancement" decision is sound.** It follows mechanically from the frozen rules and the sealed figures:
- I recomputed every fold gate from `results/walkforward/*/VALIDATION.json`. All four procedures fail GP (B-R1 and B-R2 fail F2 in fold-b; D-R1 and D-R2 fail F2 in both folds and F1 in fold-b).
- Even with GP set aside, every candidate fails N3 in `FROZEN_SELECTION.json`.
- The chronology and the data doors held. Every fold-a training stage records the same truncated bar hashes. Fold-a's validation load equals fold-b's training load, and fold-b's validation load equals the final window's training load.
- `PICKS.json` was sealed before each validation door opened (18:35:49Z before 18:35:59Z; 18:54:47Z before 18:54:48Z). Fold-b started after fold-a's VALIDATION was sealed. The final window started after PROCEDURE_GATE.
- No code path, CLI path included, can put a research pool or a new configuration on bars after 2023-12-29. Nothing references the diverse-d1 finalists.

**The reports are accurate enough to rely on.** I checked several hundred figures against the sealed records and found no numeric error beyond $1 rounding. The findings below are labelling, wording and coverage problems. **None is MATERIAL.** The most substantive is that the year attribution in CHRONOLOGICAL_VALIDATION is mislabelled (finding 1). There are also two unsupported causal sentences, and a few brief items that are covered only in the records or only nominally.

## Findings

**1. minor: the year attribution is mark-to-market, not "lot nets by exit year", and the years do sum to V.**
- **Where:** `CHRONOLOGICAL_VALIDATION.md` lines 118–143.
- **Report says:** the heading reads "lot nets by exit year". Lines 120–122 say "A lot entered before the boundary is counted in its exit year with its whole net, so the years do not sum exactly to V". The bullets say "2022 exits" and "lots exiting in 2022 lost $38.5k".
- **What the code does:** the pool `yearly` field (`src/d1-ranked-preemption/evaluate.ts` 373–377, `attribute` at line 90) is marks[last day of the year] − marks[previous year end]. Marks are realized plus open-lot mark (`replay.ts` 933). So it is a calendar-year mark-to-market change. The comment "trade nets by the exit (or end) year" at line 119 belongs to the *standalone* metrics only.
- **Evidence:** for every fold-b configuration, yearly 2022 + 2023 equals V to within the boundary lot's exit friction. A: $170,944.92 against V $170,997.21 (difference $52.29). D-R1: −$39,911.84 against −$39,908.62. D-R2: $9,267.21 against $9,322.53. C-R1: difference $77.19. B1 and C-R2: difference $0.00. If the figures were by exit year, the differences would be the pre-boundary P&L of the open lot.
- **Correction:** relabel as "calendar-year change of the fixed pool's marked P&L". Delete "the years do not sum exactly to V". Change "exits" to "mark change". The figures and the qualitative conclusions do not change.

**2. minor: the training range quoted against validation includes a window that was never validated.**
- **Where:** `README.md` line 13 and `FINAL_COMPARISON_AND_RECOMMENDATION.md` line 103.
- **Report says:** "$300k–$543k on training … −$40k…+$24k in validation".
- **Evidence:** $543,069 is the final window's D-R1, which has no validation. The validated fold picks earned $303,618–$434,184 on training (fold-a D-R2 and fold-b D-R1 in the CONTROLS records).
- **Correction:** say "$304k–$434k on their fold training windows, −$40k…+$24k in validation". The $543k figure can stay as a separate, in-sample-only number.

**3. minor: an unsupported causal claim about why B trails A on training.**
- **Where:** `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md` lines 67–69.
- **Report says:** "That is why B-R1/B-R2 trail A on training."
- **Evidence:** the hindsight continuation neither equals nor bounds the shortfall:

| Window, procedure | Shortfall vs A | Hindsight continuation |
|---|---:|---:|
| fold-a B-R1 | $47,284 | $15,913 |
| fold-a B-R2 | $42,654 | $64,014 |
| fold-b B-R1 | $23,328 | $14,862 |
| fold-b B-R2 | $13,623 | $57,807 |
| final B-R1 | $53,994 | $26,355 |
| final B-R2 | $33,529 | $52,257 |

  The replacement lots' nets and the changed downstream funding sequence are part of the gap.
- **Correction:** keep the descriptive figure. Replace "That is why" with "the gap also reflects the replacements' nets and every later funding change (path dependence)".

**4. minor: speculative and imprecise sentences in the evidence section.**
- **Where:** `FINAL_COMPARISON_AND_RECOMMENDATION.md` lines 96–99.
- **Report says:** "(B5's GDX was not needed; switching toward higher-priority books paid)".
- **Evidence against it:**
  - B-R1's only executed switch in the fold-a window was KRE→GDX on 2021-09-28 (`VALIDATION.json` `engine["B-R1"].validationPreemptions`).
  - B-R1's V minus its 2021 mark change ($70,462 − $23,997 = $46,465) equals B4's ($62,161 − $15,696 = $46,465) to the dollar. The fold-a edge came from the holding state carried across 2020-06-30, which CHRONOLOGICAL_VALIDATION §6 says correctly. It was not shown to come from switching.
- **Also:** "same-minute competition never occurred among B5's books" is imprecise. DIAGNOSTIC final records 2 same-minute ties for B5, but only while the slot was held. OVERLAP_AND_PREEMPTION_DIAGNOSTIC §4 has the correct wording ("while the slot was free").
- **Correction:** drop the parenthesis, or replace it with the boundary-state fact. Reuse the §4 wording.

**5. minor: wrong description of what the $250/$500 buffers did.**
- **Where:** `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md` lines 82–83.
- **Report says:** "For B it helps a little (fewer costly switches of B5's books), for the optimized D pools it hurts".
- **Evidence:** B-R1's executed switch count is unchanged by the buffers: 1→1 in fold-a, 2→2 in fold-b, 5→5 in final (CONTROLS). The buffer declined one switch and a different one executed. D is not uniformly hurt: fold-a D-R2 under B500 made $304,295 against $303,618 under P1.
- **Correction:** "a different set of switches executed".

**6. minor: Spearman figures are mislabelled.**
- **Where:** `FROZEN_PRIORITY_RANKINGS.md` line 48 ("over all ranked symbols"), repeated in FINAL_COMPARISON line 17 and §4.
- **Evidence:** the figures (0.47/0.42/0.18, 0.75/0.62/0.61, and 0.49/0.49/0.41 for R1 vs R2) are computed by `scripts/summary.py` over all 61 positions. That includes the unrankable IEF and SHY, which sit in fixed tail positions. Over ranked symbols only:
  - R1 across windows: 0.41, 0.39, 0.10
  - R2 across windows: 0.72, 0.60, 0.57
  - R1 vs R2 within a window: 0.44, 0.46, 0.38
- **Correction:** relabel the figures, or quote the ranked-only values. R1's instability is then stronger: 0.10 between fold-a and final.

**7. minor: inaccurate statements in the ranking and screening reports.**
- `FROZEN_PRIORITY_RANKINGS.md` lines 14–15 say screened-down symbols' representatives are "the best-J_s vector … labelled non-credible". Only rejected symbols get a non-credible representative. Screened-down representatives are credible (for example DBC in final, `credible: true`). "All 61 symbols are ranked" also overlooks the unrankable tail.
- `STANDALONE_SCREENING.md` lines 22–25 say "every screened-down ETF scored 0". Final VGK's idle share is 0.0220 (`STAGE_A.json`).
- `STANDALONE_SCREENING.md` line 38 lists XRT as "survivor". In fold-a XRT is a survivor (uncertain): 9 trades, and line 26 of the same report says so.

**8. minor: "every gate input" overstates the engine cross-check.**
- **Where:** `CHRONOLOGICAL_VALIDATION.md` lines 30–33 ("recomputed every gate input … for every configuration").
- **Evidence:** `walkforward.ts` 205–218 cross-checks V at 5 and 10 bps, the windowed *daily* drawdown and the lot count. F1's input, the windowed *minute* drawdown, comes from the replay only. The continuity check covers the 9 incumbent and procedure configurations, not the ablations.
- **Why it does not matter here:** the engine-verified daily drawdowns for D-R1 and D-R2 in fold-b ($54,869 and $39,322) already exceed $35,000, and minute drawdown is always at least daily drawdown.
- **Correction:** say "V, the windowed daily drawdown and the lots", and "for the 9 incumbent and procedure configurations".

**9. minor: brief coverage that is only partial (material to no conclusion).**
- **(a) Exploration reserve.** The reserve was empty in every window by construction. The frozen rule measures idle share against the union of all 49–54 survivors' holdings, so no screened-down ETF could qualify. Brief §3 item 3 is therefore met only nominally. This is a design defect the pre-freeze reviews missed. It is disclosed, and it is very unlikely to change GP: D missed F2 by $37,952–$210,906.
- **(b) Switching costs and interest.** Brief §6 asks for "costs/interest attributable to switching" (PROTOCOL §12: "switching friction and interest"). No report or table gives them. They exist per switch only in the engine records and the CLI `preemptions.json`.
- **(c) Diagnostic detail.** OVERLAP_AND_PREEMPTION_DIAGNOSTIC line 45 points to `results/tables/diagnostic-<window>.md` for "per-regime counts". Those tables contain none. The counts exist in `DIAGNOSTIC.json` `pools[*].regimes`. Time since the last funded entry and the trading days involved are also in the records only.
- **(d) Validation attribution.** There are no per-symbol contributions for the validation windows and no regime split. Line 145 says computing the regime split "would mean a new pass over the validation bars". In fact a read-only CLI run on the already sealed fold windows is permitted (`allowedEndOf`).
- **(e) Multiple testing.** FINAL_COMPARISON and README never mention it. It appears only in PROTOCOL §0(d) and CHRONOLOGICAL_VALIDATION §6. README also omits the latency caveat and the B4/B5 hindsight caveat.

**10. minor: labels in the executable pool configs are wrong.**
- Every one of the 20 `config/research-pools/d1-ranked-preemption/*/*.json` has `evidence.grade: "E0/E1 training only"`. That includes the fold pools, which were evaluated in sealed E2 validation and failed. Their validation status is not recorded, although brief §8 asks for "frozen validation/evidence status".
- The C pools have `role: "procedure"`, but PROTOCOL §13.4 defines C as a control.
- **Correction:** record the fold, the V figure and the gate outcome, and set the C pools' role to "control".

**11. minor: CLI and README text inconsistencies.**
- For research pools and new configurations, the ledger header says "refused shadow signals are in signals.csv". `runTarget` writes no signals.csv; it writes report.txt, trades.csv, trades.json and preemptions.json (`cli.ts` 380–402).
- The portfolio ledger header prints "  per trade, never compounded" (`results/logs/cli-portfolio-RP-final-D-R1.log`). The notional is blank, and the 20% portfolio does compound.
- `README.md` line 117 lists preemptions.json as written by every run. B4/B5 under P0 write the pools file set instead, which has no preemptions.json.
- `README.md` line 115 says `--end` can "never extend a research pool past its window". After a fold's validation is sealed, fold pools may run through the validation end (`data.ts` 224–235, as PROTOCOL §4.4 intends).

**12. minor: IMPLEMENTATION_AUDIT inaccuracies.**
- Lines 81–83 say the guards are "recorded in each record's `guard`". `results/parity/PARITY.json` has no guard field.
- Line 128 quotes the amendment "hash `40a936a4…`". That is the chained record hash; the file's sha256 is `2a17325d…`, while the report's convention says unlabelled hashes are file hashes.
- The disclosed stale `parity.ts` header has a second stale item: (iii) lists "P0R, P1 and P1-B250", but the code runs all five policies.
- §9 is unfilled, and §7, README line 42 and the reviews table cite `reviews/final-audit.md` and `FINAL_AUDIT_DISPOSITIONS.md`, which do not exist yet. This is expected.

**13. minor: the checkpoint is stale.**
- `RESEARCH_RECOVERY.md` line 24 says "Amendment chain: empty", which contradicts line 11 (amendment 1).
- Line 44's next action ("write IMPLEMENTATION_AUDIT.md and README.md") is already done.
- §4 still shows the protocol freeze, parity and code freeze as "not started", and §6 says "Disclosures: None yet".
- This needs the planned rewrite.

**14. minor (trivial): $1 rounding in the gate table.**
- `CHRONOLOGICAL_VALIDATION.md` line 96: D-R1 is −$39,217; exact −$39,216.44 rounds to −$39,216.
- Line 97: D-R2 is −$161,674; exact −$161,674.68 rounds to −$161,675.
- `JOINT_SEARCH_AND_DIVERSITY.md` line 82 gives "across windows 0.12–0.27". That covers consecutive windows only; fold-a vs final under R2 is 0.36.

**15. note: frozen design choices and pre-freeze history.**
- The fold gates contain no portfolio-drawdown or concentration test (brief §7 lists "drawdown/borrowing-efficiency constraints"). In fold-b validation the 20% portfolio's daily drawdown was 36.76% for C-R1, 39.24% for D-R1 and 36.94% for D-R2. This is reported, never gated, and irrelevant here because GP failed anyway.
- Universe eligibility uses data through 2026, so the early folds carry mild survivorship. The brief inherited this.
- The B4-as-comparator fix was made after the confirmatory review (18:04Z) and before the freeze (18:09Z) without a re-review. I verified that `walkforward.ts` 226 and `final.ts` 78–84 use max(B5, B4) in F2, N2, N3, N4 and the historical check.

## Checked and found correct

- **Gates.** I recomputed them from the sealed values:
  - Fold-a better incumbent = B4 at $62,160.78 (10 bps: $60,889.04). B-R1 +$8,301.64 (10 bps +$8,192.61), B-R2 +$8,901.44 (+$7,497.88): both succeed. D-R1 −$39,216.44 and D-R2 −$37,952.03: both fail F2.
  - Fold-b better incumbent = B5 at $170,997.21 (10 bps: $166,613.58). B −$49,233.26 and −$63,456.88. D −$210,905.84 and −$161,674.68, and D also fails F1 ($55,955 and $42,833).
  - F3 lots: 13/26/23/21 in fold-a, 43/53/54/44 in fold-b. GP fails for all four.
  - N-gates: N3 shares 0.359/0.297/0.344/0.578, medians $195,519–$230,029 against $388,489. N2 fails for B-R1 and B-R2. N4 productivity floor 2,792: B-R1 2,644 and D-R2 2,558 fail. No nominee. The historical check was refused and no registration exists.
- **Final window, every cell of FINAL_COMPARISON §2–§3:**
  - Nets, minute DD and 0/2/10 bps nets. For example A $388,489 / $26,510 / $396,715 / $393,667 / $379,867; D-R2 $431,110 / $22,410 / $389,625 / $385,393 / $409,114.
  - Portfolio end equity, daily DD and productivity (A $2,270,264 / 29.67% / 3,102 … D-R2 $2,497,756 / 27.27% / 2,558).
  - All 46 per-symbol nets. DB-R1 $487,572 and DB-R2 $586,644.
  - Switch counts 5/11/0 … 44/27/0; same-minute purchases 5/13/4/7/20/43.
  - Preempted and replacement nets. Paired differences −$53,994, −$33,529, +$24,391, +$25,282, +$190,061, +$262,212.
- **Validation (FINAL §2, README, CHRONOLOGICAL §2–§4):**
  - All V figures, minute and daily DDs, lot counts and V at 10 bps for 9 configurations in both folds. In-window switch counts (for example D-R1 fold-b 17 executed, 1 aborted).
  - Every cell of the 18-row portfolio segment table.
  - Ablations: D-R1-P0 −$5,135 / −$53,694 (DD $77,118); D-R2-P0 $22,745 / $55,572; buffer effects at most $4.4k; B-R1-B500 fold-b $124,433.
  - The 8×2 comparison table, the 16 training nets and the per-year rates. The year figures match the records (only their label is wrong, finding 1).
- **Stage A:** evaluations 144,782 / 146,211 / 147,689; credible floors 4/5/7; counts 49(22)/8/0/4/2, 54(11)/3/0/4/1, 53(5)/6/0/2/1; the rejected, screened-down and uncertain lists; all 15 B5-member standalone cells; phenotype file counts 130/142/156; library sizes 1–4; C assemblies.
- **Rankings:** all 60 top-ten entries, all 30 B5 positions, rechecks 59/59, 60/60 and 60/60 with 0 failures.
- **Diagnostic:** every cell of the 12-row table, the B4/B5 collision matrices for all three windows, and materiality (all windows at 100%).
- **Stage D:**
  - All 14 arm rows (evaluations, feasible %, best J_pool). Distinct memberships, effective symbols and median size recomputed from `archive.jsonl.gz` for fold-a R1 and final R2.
  - The pick table. Refinement 42 kept candidates, 15 accepted, 12 removals, 3 parameter moves, 5 at exactly $2,500.
  - L1 distances 1–127 (median 42) and 150–464. Jaccard similarities. Medians $110k–$312k below the centres.
  - The pick rule holds in all 6 branches.
- **Parity:** 16 / 40 / 200 / 1 / 20 / 20 checks with 0 differences; 31 runs with a preemption; 245/11/315, 230/14/348, 220/12/386; anchors to the cent ($284,244.74, $28,659.34, 76; $3,608,484.05, 34.65%; $486,207.77, $26,509.97, 94; $5,410,976.72, 29.67%).
- **Hashes quoted in the reports, all recomputed:** PROTOCOL.md `154ef7d7`, context.ts `1e6cf762`, PROTOCOL_FREEZE `3713ec3f`/`e7f6f5fa`, code_freeze `117bcac6`/`ca324dfe`, PARITY `0ebb80c6`/`adb60092`, PROCEDURE_GATE `c6f218d8`/`d2bd6ebd`, FROZEN_SELECTION `450e6f7f`/`ee251d7a`, brief `e784c557` (46,444 characters), universe `26e71c4c`, tier `9eb2af22`, fold-a VALIDATION/PICKS/CONTROLS/JOINT, and final STAGE_A. The study code at the protocol freeze equals the study code at the code freeze (`ac6ab00a`).
- **Guards and code state:** every stage record's guard reads protocol `e7f6f5fa`, code digest `71c0a9e3`, Node v24.21.0, testMode false. The only file changed since the code freeze is `src/d1-ranked-preemption/tables.ts` (reporting amendment 1).
- **Compute times:** 5.5/6.6/7.9, 3.2/3.9/6.0 (43,759 / 43,903 / 101,697 pool evaluations), 1.2/1.7/2.1, 1.4/2.0 and 6.8 minutes.
- **Frozen artifacts:** the only tracked change is `package.json` (+1 `ranked-preemption` script without `--env-file`). The tracked index hash `eede9f2d` equals the baseline. All 64 `data/*/data.csv` and every baseline config file match (package.json differs, as intended). The diverse-d1, prospective, pools and engine paths are unchanged. `verify` reports all ok. `forward status`: the freeze `407a669b` verifies and the observation count is 0.
- **CLI behaviour:** the study's B4/B5 ledgers match `npm run pools -- fixed B4|B5` apart from the header and output path. Research-pool reruns match the sealed controls ($344,192; $179,839). Every abort I inspected is "replacement filled first".

## Commands run (repository root, Node v24.21.0)

```
git status --short; git diff; git diff --stat; git rev-parse HEAD
git ls-files -s | shasum -a 256; git ls-files -s | diff - research/d1-ranked-preemption/results/baseline/git-ls-files-stage.txt
git diff --quiet -- config/research-pools/diverse-d1-2026-10-26 research/d1-diverse-pool-discovery research/prospective-b4-b5-shadow src/portfolio-aware-d1 src/pools src/app.ts
shasum -a 256 -c research/d1-ranked-preemption/results/baseline/data-csv.sha256
shasum -a 256 -c research/d1-ranked-preemption/results/baseline/config.sha256
shasum -a 256 <sealed records listed above>
npm run ranked-preemption -- verify
npm run ranked-preemption -- list
npm run ranked-preemption -- compare
npm run ranked-preemption -- prospective
npm run ranked-preemption -- preemptions RP-final-C-R2
npm run ranked-preemption -- preemptions RP-fold-a-D-R1
npm run pools -- forward status
python3 -I one-liners reading the sealed JSON records, the joint archive.jsonl.gz files, the code-freeze manifest (re-hashing src files) and the research-pool configs; cat/sed/grep/diff over reports, src/d1-ranked-preemption/*.ts and results/logs/*.log
```

Only the two `preemptions` runs wrote anything, and only into the git-ignored `evaluations/ranked-preemption/`.
