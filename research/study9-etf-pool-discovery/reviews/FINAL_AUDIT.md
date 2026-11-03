# Final audit: Study 9, Phase A (S0–S3)

Independent, read-only audit, done 2026-11-02 around 19:57Z (UTC). The only study command run was `npm run study9 -- verify-chain`. Everything else came from read-only shell or Python reads of the sealed JSON under `results/`. I read nothing under `data/`. I created, modified and committed nothing. Code snapshots were compared with `tar -xzOf` to stdout.

## Verdict

**Pass, with report corrections needed before the `report-*` seal. No blocker.**

- The hash chain, integrity pins and door log verify.
- The chronology is clean. No stage record holds any real post-2024 period.
- Every key number I re-derived from the sealed records matches the reports, apart from the misstatements listed below.
- An independent recomputation of the nominations, Batch A, Batch B and the queue reproduces `nominations.json` exactly.
- Two issues are rated major. Both are wording or disclosure problems, not data or method errors: one sentence in `RECOMMENDATION.md` reads like a Study 8 gate pass, and the N-family SMH exposure is not disclosed.
- About 25 issues are minor. None needs a rerun.

## Chain and integrity

Output of `npm run study9 -- verify-chain`:

```
chain verified: protocol → code-E1 → parity → s1 → s2 → s3-screen → s3-high → s3-nominate; head ca143ba63bc01d5c; code ac85445227353ee0, data b498e7c1885c40c5; door log 76 openings, all ≤ 2024-12-31 on the projection
```

- **What the command checks.** Each entry's hash and link, every sealed file's sha256, and the door-log prefix at each phase. Through `requireIntegrity` it also checks:
  - the live code digest against the `code-E1` digest (`ac85445…`);
  - the data digest against the freeze (`b498e7c1…`);
  - the numeric-rulebook digest against the freeze;
  - that every door-log line ends ≤ 2024-12-31 on `data/vintages/study9-train-2024`;
  - that only `door.ts` and `parity.ts` call the loader. A grep confirms there is no other `loadNUniverse` call in any form.
- **Chain entries** (UTC):

  | Phase | Sealed | Door-log lines | Files |
  |---|---|---:|---:|
  | `protocol` | 19:14:16.854 | 1 | 12 |
  | `code-E1` | 19:15:24.218 | 1 | 3 |
  | `parity` | 19:21:48.430 | 5 | 1 |
  | `s1` | 19:24:50.371 | 66 | 61 |
  | `s2` | 19:27:43.073 | 67 | 1 |
  | `s3-screen` | 19:36:45.982 | 71 | 16 |
  | `s3-high` | 19:50:44.411 | 76 | 10 |
  | `s3-nominate` | 19:50:51.788 | 76 | 1 |

- **Hashes I recomputed:**
  - `PROTOCOL.md` a3d84a2b26fa683f… (equals the chain);
  - `brief/ASSIGNMENT.md` b53be1166ae95c4a…;
  - `AMENDMENTS.md` 237525526cee31a8…, byte-identical to `results/freeze/AMENDMENTS-E1.md`;
  - `nominations.json` 2f97de53…;
  - `parity.json` ef282568….

## Chronology and leakage

- **Door log** (`results/doors.jsonl`): 76 openings, all with root `data/vintages/study9-train-2024` and first session 2016-01-04.
  - 75 end on 2024-12-31 with lastDate 2024-12-31. One (parity N1) ends 2019-12-31.
  - Order: pilot 17:31:26Z (before the freeze; `pilot.json` holds timings and memory only); parity 19:18:10–19:21:43Z; S1 19:22:09–19:24:22Z (61 doors); S2 19:27:40Z; S3 screen 19:30:40–43Z; mid/high 19:39:38–39Z.
- **No real post-2024 data in the records.** I scanned every string in `parity.json`, `s1/etf/*.json`, `s2.json`, `s3/screen/*.json`, `mid-*.json`, `high-*.json` and `nominations.json`. The only 2025+ dates are:
  - the `at` timestamps;
  - parity N2's synthetic injected sessions (2025-01-02 … 01-08) and its `pastLastDate`.

  No period key is after 2024; the period keys are 2017…2024, TO-F19…F24, half-years, EARLY, LATE, M2020 and R2022. The N2 leak copies are built from projection bytes plus synthetic −10%/day bars (`parity.ts` lines 352–381), not from real data.
- **Freeze came first.** The protocol was frozen at 19:14:16Z. That is before the refused parity attempt (log mtime 19:14:26Z, before any door), the first post-freeze door (19:18:10Z) and every S1 timestamp.
- **E1 was acknowledged before parity and is a non-substantive code fix.**
  - Order: AMENDMENTS E1 at 19:15:16Z, chain `code-E1` at 19:15:24Z, parity door at 19:18:10Z.
  - The door log held one line (the pilot) at `code-E1`.
  - E1 does not appear in the freeze snapshot `AMENDMENTS-protocol.md`.
  - Comparing the freeze and E1 code pins, the only changed file is `src/study9-etf-pool-discovery/records.ts`.
  - The diff of the two tarballs replaces `.includes('loadNUniverse(')` with the regex `load`+`NUniverse\s*\(\s*\{`, assembled from parts. The live `records.ts` equals the E1 tarball.
  - The new pattern is narrower in principle, but no other caller exists.
- **Pre-freeze exposure is disclosed in AMENDMENTS A0.** The smoke runs opened real training data at toy budgets. Their door logs were deleted. Coarse outcome information was seen. None of this involves post-2024 data.

## Re-derived numbers

| Claim (report) | Sealed-record value | Match? |
|---|---|---|
| S1 funnel: 61 eligible, 55 with a plausible vector, 0/0 feasible at 16 points / final | 61; 55 (no plausible vector: AGG, EWZ, IEF, SHY, XLE, XOP); 0; 0 | yes |
| 3,904 vectors, 99,584 points | 3,904; 99,584 | yes |
| Violations: C7lot 3,892, C7exBest 3,785, C5median 3,779, C7year 3,404, C6 2,807, C2 ≈ 2,460; best vector C5 57, C7lot 53 | same (C2share 2,467 / C2p90 2,450) | yes |
| 519 re-measured; Δ median −$14 (mean −$39); Spearman 0.95; EARLY–LATE median 0.10 | −14.3 / −39.3; 0.952; 0.0999 | yes |
| S1 TD3 medians −0.00 / 0.17 / −0.11 / −0.03 / 0.12; percentiles 42 / 59 / 30 / 33 / 25 | same (TO-F23 0.13 by my rounding) | yes |
| STANDALONE per-ETF table (61 rows) | every row checked | yes (IEF −$1,487 vs −$1,488, rounding) |
| S2: 26 edges; 12 non-trivial groups; 14-member single-linkage component; refused merges 8 / 3 / 1 | same | yes |
| S2 events: 868 decisions, 99 families, 26 market-wide holding 607 (70%), 18 solo; largest 45 ETFs / 83 decisions | 868 / 99 / 26 / 607 (69.9%) / 18; 45 / 83 | yes |
| S2 events by year: "2020 twelve, 2022 eleven, one each Q4 2018, Mar 2023, Oct 2023" | 2020: **11**; 2022: **10**; **2021: 2** (01-20, 02-22); 2018: 1; 2023: 2 (03-06, 09-27→10-09) | **no** |
| Median ETF 72% market-wide; VGT 63%, GDX 54% | 71.7%; 62.5%; 53.6% | yes |
| N seeds XLF, IWM, XLB | recomputed from the S1 order (KBE skipped: same cluster as XLF) | yes |
| 718 contention replays; anchor α net / DD; candidates adding net 31 / 27 / 28 / 30 / 43 / 35; best five per policy | same | yes |
| Contention medians (5/5, 2, 28%, 63%, etc.) | reproduce **α-only** (DD share uses ΔDD > 0) | yes (unlabelled α-only) |
| Candidate lists V / G / VG / N | same | yes |
| 62 pairs with ρ ≥ 0.90, of which 18 match ≥ 50%; KRE–GDX α match 0.22 / 0.32, ρ 0.06 | 62; 18; 0.22 / 0.32; ρ 0.055 | yes |
| S3: 1,303 proposals (175 exhaustive, 264 exhaustive-C, 384 beam, 192 swap, 288 exploratory) | same | yes |
| 11,427 unique configurations; V 3,036, G 2,883, VG 2,204, N 3,304; 576 null pools; 327,306 points / 333,458 replays | same | yes |
| Pool-size LOO table (size 2–5 counts, refusals, displaced) | same | yes |
| 103 high-precision + 4 references + 13 incumbents; 21 feasible + Q7; 6 qualified | same | yes |
| High-precision stratum table (all 16 rows) | same | yes |
| Six nominations: robust/yr, median/p10, share (Wilson lower bound), band, p90 DD, centre net/yr, centre DD, minimum I1 margin, null percentile | every value matches `nominations.json` and `high-*.json` | yes |
| G4 nominee activity, time split, concentration, contributions | 60 lots, 17 episodes, occupancy 48.6%, interest $38,184, costs $6,128, 49 refused; EARLY $26,636, LATE $24,852; ex-2020 $18,353; best year 35.2%, top lot 16.4%, M2020 21.6%, market-wide 54.4%; Shapley GDX 12,909 / KRE 8,052 / ILF 5,162 / MTUM 2,895; I1 KRE 10,647, GDX 14,639, MTUM 2,141; Q2b 83.2% / $42,557; worst neighbour DD $58,021 | yes |
| Q7: worst stressed net ≥ 92% of base, stressed DD ≤ $30k | minimum 92.2% (IWM+SMH); maximum DD $29,763 | yes |
| Comparators: VG #2 $34,532 / $17,281 / $26,844 / 97.7% / $24,314; VG #1 $32,456 / $27,343 / $29,428 / 94.8% / $29,021; B1 $17,962 / $19,534 / $8,019 / 100% / $28,141; B5 $54,759 / $26,510 / $19,177 / 27.6% / $56,411; #3, #8, #12, #15, VG and VXRKG sets | same | yes |
| Generic-to-optimized lift ×1.45–×5; ρ ≈ 0.26 | ×1.45–×5.22; Spearman 0.257 (n = 6) | yes |
| Fidelity: 16 → 384 median −$20 (mean −$9), 50.5% fall; 16 → 64 +$156 | same | yes |
| Null percentiles 98 / 98 / 94 / 98 / 98 / 100; null medians $3.4–8.4k | same | yes |
| PBO G4 0.18, G5 0.24, G3 0.26, others 0.50–0.94; TD2 and TD3 values quoted | same | yes |
| Queue: 96 entries; KRE+EWW+GDX+MTUM loses only on MTUM's I1 of $383; EWW −$842, ILF −$1,887 | same | yes |
| Parity: P1 56 runs (598 / 1,308); P3 61 centres plus #1 / #2 384-point confirmations; N1 15/15; N2 21 rows (12 hold a lot open at the cut, power true); E1 64/64 + 5 pins; 373 s | same | yes |

## Nomination and batch recomputation

**Nominations.** I applied PROTOCOL §8.6 to the 103 high-evaluated proposals:

- feasible = decisive violation 0, centre DD < $35,000 and Q7;
- qualified = feasible and `complementarity.pass` (the I1/I2 flags re-derived independently agree);
- Study 8 track sets excluded (only VGT+GDX occurs);
- slots 1–2 by decisive robust/yr; slot 3 = the qualified exploratory-stream pool with the most clusters, then share, then robust/yr, otherwise the third by robust/yr.

The result: 21 feasible, 6 qualified, and the same six nominations, slots and assignments as `nominations.json`:

- N2: SMH+XHB (profit-1), EDV+XHB (profit-2), IWM+SMH (profit-3; N2 has no qualified exploratory-stream pool);
- N3: EDV+IWM+XLF;
- V3: VGT+IWM+XLF;
- G4: KRE+GDX+ILF+MTUM.

VG is negative. Bands and uncertainty flags re-derive from the Wilson bounds.

**Batch A.** The family bests in robust order are G, then N (EDV+IWM+XLF, $10,030.88), then V (VGT+IWM+XLF). V is skipped: its symmetric difference with EDV+IWM+XLF is 2. Next by robust/yr, SMH+XHB is added; EDV+XHB and IWM+SMH are skipped (symmetric difference 2 with SMH+XHB). Result: {KRE+GDX+ILF+MTUM, EDV+IWM+XLF, SMH+XHB}, which matches.

**Batch B.** Ordered by cluster count (4, 3, 3, 2, 2, 2) then robust/yr, the first pass reproduces A. The ≥ 2-pool difference rule then replaces SMH+XHB with EDV+XHB and EDV+IWM+XLF with VGT+IWM+XLF. Result: {KRE+GDX+ILF+MTUM, VGT+IWM+XLF, EDV+XHB}, which matches.

**Sensitivity.** Batch A's composition turns on a $1.07/yr difference: EDV+IWM+XLF $10,030.88 against SMH+XHB $10,029.81. If they were reversed, A would be {G4, SMH+XHB, VGT+IWM+XLF}. Option C (the union) is unaffected.

**Queue.** The 96 entries reproduce only under one reading: in the 10 strata with no nomination, the "at least as profitable as the stratum's best nomination" test is vacuous. The queue then equals every non-nominated, non-control high-evaluated proposal (103 − 6 − 1).

## Report accuracy and completeness

### Major

1. **`RECOMMENDATION.md:12`** says "It passes Study 8's full feasibility on 384 points". Brief §7 forbids claiming a pass of the 384-point gate, and PROTOCOL §2.2 says no Phase A figure passes or fails it.
   - Fix: "Its fixed generic configuration meets Study 8's C1–C7 constraints on Phase A's 384-point decisive neighbourhood (a screening measurement, not Study 8's qualification gate, which only Phase B can apply)".
2. **SMH in the N ("neither") family is not disclosed.** Two of the three N2 nominees and Batch A's N2 pool contain SMH.
   - SMH is in VGT's cluster (us-tech-growth), with daily-return ρ 0.901 to VGT and decision match 0.50 (α) / 0.56 (β).
   - It is below the frozen edge thresholds, so it is not a proxy and no rule was broken. But brief §5 asks that VGT not be smuggled into N.
   - Locations: `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md:95-105`, `POOL_MARGINAL_CONTRIBUTION.md:87,120,123`, `RECOMMENDATION.md:26,92`.
   - Fix: add a sentence stating SMH's VGT similarity, and that the N family excludes only VGT's direct proxies (XLK, IWF, VOOG).

### Minor

3. **`SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md:114-117`.** The event years are wrong.
   - Fix: "2020: eleven families (02-27 → 11-09); 2022: ten (04-29 → 11-08); 2021: two (01-20, 02-22); one each in Q4 2018 (21 ETFs), March 2023 and late September–October 2023". The total of 26 is correct.
4. **`SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md:133-140`.** Every median column is computed under α only, but only one column is labelled "mean of α, β". The idle shares quoted at lines 149–151 are also α (29–71%, 74–90%).
   - Fix: label the columns "α".
5. **`SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md:77` and `STANDALONE_SCREEN.md:176`.** The VGT–GDX match of 0.14 is the minimum; the other direction is 0.25.
   - Fix: write "0.14 / 0.25".
6. **`STANDALONE_SCREEN.md:142-143`.** The rates, credit and non-US equity sentence is wrong.
   - INDA ($894) and EWJ ($272) have positive medians.
   - Besides EDV, ILF, EWW, FXI and EWY, these also have positive best vectors: EEM, IEMG, EFA, VGK, EWJ, INDA, EWZ and EMB.
   - Fix: rewrite the sentence.
7. **`STANDALONE_SCREEN.md:144-145`.** The list of ETFs with ≥ 50% of net in March–April 2020 omits VGK (54%) and XBI (52%).
8. **`POOL_MARGINAL_CONTRIBUTION.md:66-67`.** "Refusals double from four to five books" is wrong: 29–37 becomes 44–56, about ×1.5. The doubling happens between sizes 2, 3 and 4.
9. **`POOL_MARGINAL_CONTRIBUTION.md:100` and `PHASE_B_OPTIMIZATION_PROPOSAL.md:193-194`.** Two overstatements:
   - "Everything else (V, VG, N): $8–11k/yr" omits VG pools at $12.3–18.4k and the non-KRE G pools (GDX+SMH $17.7k, GDX+MTUM+SMH $18.0k).
   - "No generic-vector pool above about $11k/yr" outside the core is likewise wrong as stated.
   - Both hold only for Study 8-feasible pools. Fix: insert "Study 8-feasible".
10. **`POOL_MARGINAL_CONTRIBUTION.md:217-219`.** "The screen's top pools are not mostly noise" over-reads the low re-measurement shrinkage.
    - Fix: "not mostly neighbourhood-sampling noise". Time persistence is weak (PBO, TD3).
11. **`POOL_MARGINAL_CONTRIBUTION.md:236`.** The queue filter admitted all 96 non-nominated, non-control high-evaluated pools, because the threshold is vacuous in the 10 strata without a nomination.
    - Fix: say so.
12. **`POOL_MARGINAL_CONTRIBUTION.md:116-129`.** Non-dominated status is not reported, although PROTOCOL §8.6 says each nominee carries it.
    - IWM+SMH is four-objective dominated by SMH+XHB. `s3-nominations.md` shows this; the report does not.
13. **`POOL_MARGINAL_CONTRIBUTION.md:171-187` and `RECOMMENDATION.md:54-60`.** The incumbent figures use Phase A's per-pool 384-point seeds, so they differ from Study 8's own sealed confirmations, which P3 reproduces:
    - #1: 96.4% / $29.3k in Study 8, against 94.8% / $29.4k here;
    - #2: 97.9% / $27.1k in Study 8, against 97.7% / $26.8k here.
    - Fix: disclose this. The roughly 1.6 pp seed variation also matters for G4's 90.9%.
14. **`RECOMMENDATION.md:18`.** "The study's lowest overfitting probability (PBO 0.18)" omits that G4 is an adaptive beam stratum where PBO is only a lower bound (PROTOCOL §4.3; `pboNote`).
15. **`RECOMMENDATION.md:26-30`.** Two wording issues:
    - "Broad, safe": EDV+XHB has a Wilson bound of 89.6% (< 90%), and all five pools have p90 DD of $31.8–33.1k, only $1.9–3.2k below the ceiling.
    - "Less than half of the optimized Study 8 holders" is false against #12 ($19.9k) and #15 ($17.2k).
16. **`RECOMMENDATION.md:3-4` and the end of the file.**
    - "Every stage is sealed" is not yet true of the reports.
    - "(§6)" points to no section.
    - Brief §8.7 asks for an explicit closing request for approval to proceed to Phase B; there is none.
    - Brief §8.7 also asks why each best pool appears complementary; this is explained only for G4.
17. **`RECOMMENDATION.md:145-148` against `PROTOCOL.md:21`.** The frozen protocol says "no design choice depended on" the smoke test. AMENDMENTS A0 §3 records that fail-safes were added after smoke run 2. Because no ETF turned out feasible, those fail-safes are what chose the N seeds and the protected list.
    - Fix: state this in the RECOMMENDATION disclosures. The data involved was training only.
18. **`PHASE_B_OPTIMIZATION_PROPOSAL.md:21`.** "In N, V and N3" is garbled; it should read "in N2, N3 and V3".
19. **`PHASE_B_OPTIMIZATION_PROPOSAL.md:33-37`.** The Batch A rationale implies each nominating family's best is included, but V's best was skipped by the near-identical rule.
    - Fix: say so, and state the $1/yr tie that decides A.
20. **`PHASE_B_OPTIMIZATION_PROPOSAL.md:147-150`.** The exposure note covers GDX only. KRE is also a B5 / VXRKG book whose 2025–2026 path Study 8 inspected.
    - Fix: extend the note to KRE.
21. **`PHASE_B_OPTIMIZATION_PROPOSAL.md:154` and `DATA_MANIFEST.md:3-4`.** "Byte-identical to every earlier vintage" goes beyond what was checked: the pre-refresh snapshot (64 files) and Study 8's pins (5 files). PROTOCOL §14.4 says other studies' vintages of the 59 files were not re-checked.
22. **`DATA_AND_UNIVERSE_AUDIT.md:176-177`.** The post-2024 slices "do not exist in any Phase A process, cache or log". In fact the S0 audit and parity E1 read post-2024 bytes for integrity checks, and `symbols.json` holds post-2024 aggregates.
    - Fix: "in no strategy computation, cache or door log".
23. **`README.md:33`.** The paths are stale: the files are `results/s3/mid-<part>.json` and `high-<part>.json`.
24. **`RESEARCH_RECOVERY.md` is stale below the top screen.**
    - Line 29 lists three reports.
    - The stage table (lines 64–71) shows Freeze through Reports as "not started".
    - The Methodology review row says "verification pass running".
    - Line 62 says "4 runs"; A0 describes five.
    - Line 77 says "6 assignments"; there are nine.
    - Guards line 98 is out of date.
    - The Disclosures omit E1.
25. **`RUN_COMMANDS.md:79`.** Two issues:
    - "Each ends exit 0", but `parity-refused-E1.log` ends `exit 1` (expected).
    - `results/logs/` is git-ignored by the root `.gitignore:13` (`logs/`), so the logs cited as evidence would not go into a commit.
26. **`PROTOCOL.md:83` (frozen; informational).** It says y = 7.524, but the records use y = 7.5357 (Study 8's `yearsOfRun`). The thresholds are unchanged (⌈1.5y⌉ = 12, ⌈0.5y⌉ = 4, ⌈0.4y⌉ = 4).
    - Fix: disclose as a non-substantive note.

### Completeness

- **Deliverables present.** Brief §8.4 files: DATA_AND_UNIVERSE_AUDIT, STANDALONE_SCREEN, SIGNAL_OVERLAP_AND_COMPLEMENTARITY, POOL_MARGINAL_CONTRIBUTION, PHASE_B_OPTIMIZATION_PROPOSAL, RECOMMENDATION, RUN_COMMANDS and the CSV/JSON tables. Brief §2 files: PROTOCOL, DATA_MANIFEST, AMENDMENTS, README and RESEARCH_RECOVERY.
- **Phase B proposal (brief §7).** All required items are present: ≤ 8 pools plus a reserve, the missing VG family explained, per-D cost from the pilot (the arithmetic checks: 34 / 34 / 49 / 68 CPU-h), seeds and restart plan, the unchanged fitness, data doors, vintage comparability, the reporting list, and the decision gates.
- **Executive summary (brief §8.5).** Covered. Limitations and negative findings are stated plainly, and there is no claim of validation or prospective evidence.
- **User-facing summary (brief §8.7).** Gaps as in item 16.

## Git and state

- **Branch and commits.** Branch `research/study9-etf-pool-discovery`, HEAD `5359920` (the creation point). There is no Study 9 commit (checked with `git log --all`). The only worktree is the main checkout.
- **Untracked study files.** `research/study9-etf-pool-discovery/` and `src/study9-etf-pool-discovery/` are untracked. `package.json` is modified by one line (the `study9` script; pinned).
- **Ignored folders.** `results/cache/` (1.1 GB) and `results/logs/` are ignored. No market data is in the untracked study files; `data-vintage-manifest.csv` holds hashes and counts only.
- **No Study 8 or other tracked files changed.** The `._.DS_Store` files are the user's own and untouched.
- **The user's `config/market-events/*` is unmodified by the study.**

  | File | Working copy | Committed |
  |---|---|---|
  | `distributions.csv` | `30feaa99…` | `3b4342eb…` |
  | `distributions.manifest.json` | `acb68cca…` | `d2c02b01…` |

  - The diffstat is 18 insertions and 18 deletions.
  - `raw/vanguard-20261030T184421Z/` holds 3 files.
  - All mtimes are 2026-10-30T18:44Z, before the study.
  - All of these equal the values recorded in `DATA_AND_UNIVERSE_AUDIT.md`.
  - `splits.json` hashes `e5bde427…`, as pinned.
