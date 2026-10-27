# Final independent audit: D1 standalone ETF opportunity audit

> Saved verbatim from a fresh independent read-only reviewer (a separate agent, not the pre-freeze reviewer), received
> 2026-10-27 ≈ 17:14Z. Dispositions: `FINAL_AUDIT_DISPOSITIONS.md`.

**Reviewer:** independent and read-only. No file was created, modified or deleted. No backtest, `run`, `analyze`, `report`, `verify` or other write command was executed. `.env` was not read and no network was used.
**Checked at:** 2026-10-27T17:13Z.
**Repository state:**
- Branch `research/d1-standalone-etf-opportunity-robustness`, HEAD `b21ed711`, nothing committed yet.
- `PROTOCOL_FREEZE.json` sha256 is `01d967af…`. It binds 34 files and records 0 amendments.
- `results/analysis.json` is `176ba96e…`.

**Standard:** `brief/BRIEF.md`. The figures below were recomputed with `python3` read-only queries against `results/analysis.json`, `results/runs/*.jsonl` and `results/inventory/census.json`, and against the code in `src/d1-standalone-opportunity-audit/standing.ts`, `analysis.ts` and `events.ts`.

**Verdict in one line:** the frozen rules applied to `analysis.json` do produce exactly the reported verdict, every number I checked matches, and there is no breach of chronology or of the freeze. However, the final report leaves out three facts that bear directly on how the verdict should be read (Major 1–3). It should be corrected before commit.

---

## Critical

None found. Specifically:
- No research phenotype was run after 2023-12-29.
- No final-window vector is presented as out-of-sample evidence.
- No frozen file changed after the freeze.
- No number in the reports misstates the frozen analysis.
- No files outside the study changed.

---

## Major

### M1. "VGT primary itself classifies as (i) under the same rules" is misleading as written

**Where:** `FINAL_COMPARISON_AND_RECOMMENDATION.md:17`.

VGT primary's (i) has two features the candidates do not share.

**(a) Its comparison axes are a self-comparison.**
- `standing.ts:171` grants (i) when no flag blocks and at least 2 of 3 axes are met.
- Against itself, every axis ties, so all three count as met ("= = =").
- VGT primary's (i) therefore means only "no blocking flag".

**(b) It is exempt from F8.**
- `standing.ts:67-68` returns "not assessable (hindsight)" for VGT primary, so F8 can never block it.
- The VGT instrument's own period-correct fold-b representative lost **−$20,933** (`standings["VGT:research-representative"].folds.fold-b.increment5`). That is the largest fold loss of any shortlisted instrument.
- Three candidate phenotypes are (ii) **solely** because of F8 negative:
  - FXI representative: −$9,931
  - FXI alternative-1: −$9,931 (the same fold vector)
  - MTUM representative: −$11,095
- I checked this: each of the three has `blocking == ["F8 (negative)"]` and `versusPrimary.met == 2`. Without F8 they would be (i), like EWW.

The exemption was predeclared in PROTOCOL §10, so applying it is not a defect. But the final report never puts these facts next to each other, so a reader takes VGT primary's (i) as earned on the same terms as the candidates' standings.

**Fix:** in the executive summary and in the "Flags and standing" section, state:
- that VGT primary's axes are a self-tie;
- that its F8 is exempt;
- that the VGT instrument's period-correct fold-b vector lost $20,933;
- that FXI (both phenotypes) and MTUM representative miss (i) only on F8.

### M2. GDX is one flag away from "stronger than VGT primary", and the report does not say so

**Where:** `FINAL_COMPARISON_AND_RECOMMENDATION.md:13-16, 142-148`.

For both `GDX:representative` and `GDX:alternative-1`, every condition in `standing.ts:177-184` holds except the blocking flag F10:
- 3 of 3 axes met against VGT primary, 2 strictly better;
- 3 of 3 axes met against the procedure-matched control;
- `temporalSupport` is true;
- F7 is not raised.

I checked this: these are the only phenotypes for which removing a single blocking flag would yield "stronger".

The report says "blocked only by F10", but not that F10 is the only thing between GDX and the "stronger" verdict.

F10 is raised on **both** of its triggers:
- only 38.3% of neighbours stay within $35,000 minute DD (well below the 75% line, so not marginal);
- the median neighbour's portfolio daily DD is 35.85%, above 35% (`standings["GDX:representative"].summary.pooled.medianPortfolioDaily` = 0.3585).

The report cites only the first.

**Fix:** state both triggers, and state that GDX would otherwise meet the "stronger" bar. Repeat that GDX is already a B5 member.

### M3. EWW's only (i) rests on a third knife-edge that is not disclosed

**Where:** `FINAL_COMPARISON_AND_RECOMMENDATION.md:7-12, 137-138`; `OPPORTUNITY_CAPTURE_AND_TIMING.md:66-68`.

The report discloses two marginal passes: F4 neighbour capture exactly 0.5, and F5 at 0.281 against a 0.25 line. It omits a third.

- F4 passes only because M (the set of major families the base dip-captured) has 2 members. Per `standing.ts:93-94`, M < 2 would make F4 "insufficient", and that **blocks** (i).
- EWW's second major family, EWW-F06 (the 2020 crash), enters M with a base dip net of only **+$1,233**:
  - EWW-E09: +$8,165
  - EWW-E10 dip entries: −$1,114
  - EWW-E11 dip entries: −$5,818
  - Source: `phenotypes["EWW:representative"].familyRows[5].baseDipNet` = 1232.95.
- EWW's 2020 profit came mostly from **non-dip** high re-entries. EWW-E11's total net is +$12,205 while its dip net is −$5,818. The top winner (lot 31, 2020-10-16, +$17,259) is one of those re-entries.
- The median neighbour **loses** money in EWW-E09: joint episode net median −$3,068, P10 −$17,046.

The axes also need context. EWW's "two of three axes" are:
- a 100% versus 100% ceiling tie on share profitable. 13 of the 19 candidates tie VGT primary at 100% on this axis, so it barely discriminates;
- 4 versus 3 independent dip events.

EWW's (i) is therefore, in effect, "no blocking flag".

**Fix:** add the $1,233 F06 margin and the non-dip nature of EWW's 2020 profit to the executive summary's list of marginal passes. Say plainly that the share axis is a tie at the ceiling. Doing so strengthens the case for the report's own "none" option.

---

## Minor

1. **XLB is wrongly called "the smallest drawdown".**
   - `FINAL…md:170` says XLB has "the smallest drawdown ($11,613)".
   - `EDV:representative` is lower at $11,589 (`base.view.minuteDrawdown`).
   - Fix: "the smallest worst lot (−$358) and the second-smallest drawdown".

2. **XME's "For" bullet is selective.**
   - `FINAL…md:153` says "its 2020 captures are taken by 79–91% of neighbours".
   - XME's **top** winner is also a 2020 capture: XME-E14, trough 2020-09-23, lot entered 2020-10-29, +$46,781. Only 35% of neighbours keep it (`winnerPersistence[0].keptShare` = 0.352).
   - The opportunity-capture report states this; the final report does not.
   - Fix: say "its March–June 2020 crash legs (XME-E11 to E13)", and add the 35% for the top winner.

3. **EWW's fold evidence is under-labelled.**
   - The EWW bullet "both fold vectors positive (+$2,249, +$17,506)" (`FINAL…md:136`) sits under the heading "All figures are T-train" (`:23`).
   - The fold figures are T-retro evidence for *different* vectors: the fold-a and fold-b vectors are 43.6 and 34 step units from the final one (`standings[...].drift`).
   - Fold-a's +$2,249 shrinks to +$1,544 at 10 bps.
   - Fix: label the tier and the vector distance in that bullet.

4. **The README promises a file that does not exist, and one that is still pending.**
   - `README.md:24` lists `results/tables/episode_catalog.csv`. No such file exists and no code writes it.
   - `README.md:20` references `IMPLEMENTATION_AUDIT.md`, which does not exist yet.
   - Fix: remove or produce the CSV, and write the audit file before commit.

5. **Fold-vector counts disagree with the frozen protocol, unexplained.**
   - PROTOCOL §9.1 says 122 vectors and §12 says 244 fold runs.
   - The actual figures are 119 vectors and 238 runs. IEF fold-a and SHY fold-a/fold-b have no representative (status "rejected").
   - `CHRONOLOGICAL…md:11,95` say "119" without explaining the gap.
   - Fix: add one sentence of explanation, or a reporting amendment.

6. **The shortlist's write time is reported inconsistently, and the intermediate version was not kept.**
   - `SHORTLIST.json` says `writtenAt 16:16:08Z`, and `SHORTLIST_RULES…md:3` agrees. PROTOCOL §5 dates v2 to 15:37:36Z.
   - The 16:16 regeneration renamed labels and added the `procedureMatchedControl` and `counterfactualIfMeritOccupiedClusters` fields. The 15:37 bytes (`d4d7b69d…`, reviewed by the methodology reviewer) were overwritten, not archived the way v1 was.
   - The claim "no selection change" is consistent with both reviews but cannot be re-verified from disk.
   - Fix: disclose this in the shortlist document.

7. **The "armed, no entry" outcome never occurs.**
   - It is 0 in every base run and every neighbour (I checked all 21 phenotypes × all episodes).
   - The "joint no entry" column is therefore effectively "not armed".
   - Fix: state this, presumably as a structural property: with a small Y, an armed book almost always fills inside the episode.

8. **`RESEARCH_RECOVERY.md` is stale.**
   - It is dated 17:04Z and says "Running: see Stage 3 row (background job)".
   - It reports "study tests 32/32", while the dispositions report 38.
   - It shows Stage 5 as "not started", yet the final verify and test logs exist: `results/logs/final-*.log`, 17:03–17:09Z, `npm test` 690/690, verify all pass.
   - Fix: refresh it before commit.

9. **"EWW is the steadiest of the profitable candidates" is loose.**
   - Source: `PARAMETER_NEIGHBORHOOD_ROBUSTNESS.md:312`.
   - XLB (retention 0.66, 100% within the DD ceiling) and EWW alt (0.69, 98%) beat EWW on retention and drawdown share.
   - EWW leads only on joint P10 in dollars among phenotypes without F9/F10.
   - Fix: name that metric.

10. **The procedure-matched VGT control is described one-sidedly.**
    - `FINAL…md:18` calls it "weaker than the registered one".
    - It omits that the control is more cost-robust: C1 keeps 89% of its net, against VGT primary's 63%.
    - `CHRONOLOGICAL…md:92` has this nuance; carry it over.

11. **XME's fold-b path dependence is not mentioned.**
    - XME's fold-b V is $15,100 at 5 bps but $57,271 at 10 bps (`CHRONOLOGICAL…md:40`).
    - This is another instance of the cost-driven continuation-chain sensitivity, and only XHB's case is discussed.

12. **EWW alternative-1 is described too generously.**
    - The final report says it "tells the same story" (`FINAL…md:136`).
    - It raises F2: worst lot −$11,402, worst MAE −11.1%.
    - It "corroborates" only in the ETF rule's sense that it is not (iii).

13. **The EWW thesis misdescribes 2020.**
    - It says "recurrent 15–30% sell-offs (… the 2020 crash …)" (`FINAL…md:131`).
    - The 2020 crash was a 47.6% decline (EWW-E09).

---

## Verified correct

1. **Freeze integrity.**
   - All 34 bound files hash to `PROTOCOL_FREEZE.json`; no amendments.
   - Every bound source file was last modified ≤ 16:27:57Z, before the freeze at 16:28:45Z. The first run was at 16:29:01Z.
   - Files modified after the freeze are unbound only: `views.ts` (CLI) and the templates.

2. **Chronology.**
   - All 7,825 stored runs carry an end date of 2023-12-29 or earlier:
     - final: 7,587 runs, all ending 2023-12-29;
     - fold-a: 118 runs, ending 2021-12-31;
     - fold-b: 120 runs, ending 2023-12-29.
   - The latest lot timestamp is 2023-12-29T21:00Z.
   - The 77 incumbent runs are all on the common window.
   - `data.ts:69-96` refuses ends beyond the cutoff before reading anything. `views.ts:121-128` refuses research phenotypes after their cutoff.

3. **Fold-forward check.**
   - It uses period-correct fold vectors and is labelled T-retro (`CHRONOLOGICAL…md:3-8`).
   - Boundary parity is 100%.
   - I recomputed the cross-section and it matches:
     - Spearman: fold-a 0.231, fold-b 0.217;
     - median V: fold-a $2,402, fold-b −$211;
     - share V > 0: fold-a 57.6%, fold-b 33.3%;
     - share V < 0: fold-a 22.0%, fold-b 50.0%;
     - share no evidence: fold-a 20.3%, fold-b 16.7%.
   - Negative folds are listed in full.

4. **Same-window table.**
   - All 21 phenotype rows in `FINAL…md:30-52` match `analysis.json` on: net, lots, worst lot, f10, C1, end equity, increment over C0, and portfolio daily and minute DD.
   - B4, B5 and C0 also match: B5 $388,489, 82 lots, $26,510, $2,270,264, 29.67%.
   - The full-history anchors sit in a separate table, labelled context only.
   - B4/B5's 32-/40-dimensional neighbourhoods are quoted separately and never blended in.

5. **Standing recomputed by hand from `analysis.json`.**
   - **EWW representative:** every flag passes.
     - F1: 4 independent dip events, 2 eligible major families.
     - F2: worst lot −$7,025; worst MAE −8.9%.
     - F3: $22,812 base; $23,701 at C1; 32.7% portfolio daily DD.
     - F4: M = 2, median capture 0.5 (not below 0.5).
     - F5: 0.281.
     - F6: C1 keeps 0.83 of net.
     - F7: coverage 0.987; dollar volume $114M.
     - F8: +$2,249 and +$17,506.
     - F9: 100% profitable; retention 0.628.
     - F10: 87.5% within the DD ceiling; portfolio daily DD 33.9%.
     - Axes against VGT primary: < = >. EWW's joint median net is $65,459 against $71,174, including on each seed.
     - Result: (i), not "stronger". This matches the report.
   - **GDX:** F10 only, giving (ii).
   - **VGT primary:** (i).
   - **Procedure-matched control:** blocked by F4 (raised), F8 (negative), F9 and F10, giving (ii).
   - The flag-count table at `FINAL…md:115-126` matches.

6. **Independent-event counts.** I recomputed them greedily from the anchor troughs:
   - EWW 4: F03, F05, F09 and F10, at sessions 499, 909, 1694 and 1965.
   - VGT primary 3: sessions 749, 1054 and 1559.

7. **Spot checks against the JSON.** Values below are as reported in the documents; every one matched to the stated rounding, except XLB's "smallest drawdown" (Minor 1).

   | Item | Values checked |
   | --- | --- |
   | EWW joint distribution | P10 $46,284; worst $19,257; 87.5% within the DD ceiling |
   | EWW episodes and winners | EWW-E09 dip-captured by 32.8%; September 2022 winner kept by 84% |
   | EWW losing decline-phase entries | 8, totalling −$23,284 |
   | EWW alternative-1 | joint median $64,923 |
   | GDX capture | 80%; GDX-E10 96.1%; GDX-E15/E16 100% |
   | GDX cost and tails | C1 keeps 89.5%; 28 losing decline-phase entries, −$52,613 |
   | GDX folds | +$1,133 and +$4,196 |
   | XME | C1 22.7%; 0 bps $179,789; XME-E20 0%; XME-E11/E12/E13 79/91/84% |
   | KBE | joint median $71,917; worst lot −$17,568; KBE alt MAE −26.5% |
   | SLV | 2020 mark-to-market $75,737; f00 $87,777; r18 $56,330 |
   | FXI | C1 93.8% with 0 lots changed; top-3 share 84%; October 2022 lot $40,292 |
   | IJH | retention 0.357; median neighbour portfolio daily DD 35.35%; IJH alt 52% above $35k |
   | MTUM alternative-1 | C1 48.9% |
   | XHB | 43.8% of neighbours breach the DD ceiling |
   | EDV folds | −$16,837 and −$9,218 |
   | OAT retention medians | range 0.893–0.983 |
   | Calendar years | GDX positive every year 2017–2023; EWW positive in five years with no losing year |

8. **Source immutability.**
   - `git status --short` shows only `M package.json` (one added script line) plus the two untracked study directories.
   - There are no tracked diffs elsewhere.
   - `git ls-files -s` is identical to `results/baseline/git-ls-files-stage.txt`.
   - `shasum -c` passes on all three baselines: data (65 files), config (72) and prior research (824).

9. **Parity records.** `PARITY.json` shows 486/486 passed and `BASE_PARITY.json` 386/386, with no failures in either.

10. **Shortlist and catalog revisions.**
    - The v1→v2 shortlist revision is disclosed with timing, effect and a counterfactual list.
    - The catalog v1→v2 change is price-only, made before the freeze, and v1 is bound.
    - Concentration enters no gate, grade or flag.
    - The "none" option is stated explicitly and fairly (`FINAL…md:182-188`).

11. **Event tables show failures, not only successes.** Misses, losses, "not armed" and "in position" episodes appear for every phenotype (`OPPORTUNITY_CAPTURE_AND_TIMING.md`).

---

## Overall verdict

**The reports faithfully represent the frozen analysis.** Every number I checked matches `analysis.json` (one wording error, Minor 1). The frozen `standing.ts` rules applied to the stored summaries produce exactly what is reported:
- EWW is the only ETF-level (i), and it is not "stronger" than VGT primary;
- the other ten ETFs are (ii);
- none is (iii);
- VGT primary is (i), and the procedure-matched control is (ii).

Chronology, the freeze and source immutability all hold.

**The executive verdict is, however, presented more favourably than the evidence supports, in two directions:**
- The margins behind EWW's (i) are incompletely disclosed (M3).
- VGT primary's (i) depends on its F8 exemption, while FXI and MTUM are demoted by F8 alone (M1).

Separately, the report leaves out that GDX misses "stronger" on F10 alone (M2).

None of these changes a frozen classification. Correcting M1–M3 in the final report would make the narrower "EWW is worth watching" conclusion and the "none" reading easier to weigh against each other; the evidence leans toward "none". Fix M1–M3 and the minor items in the unbound report text (or by a reporting amendment), then commit.
