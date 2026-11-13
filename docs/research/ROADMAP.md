# Research roadmap — D1 + Growth shared-pool priorities

The sequence the user agreed (Priority 1 brief, 2026-11-08; reordered by the Priority 3 brief, 2026-11-08; Priority 3
split into 3A/3B by the Priority 3A brief, 2026-11-09; the bounded Growth-lifecycle comparison brought forward as 5A and
Priority 4 split into 4A/4B by the Priority 5A brief, 2026-11-09; 3B commissioned with C4 as the preferred benchmark by
the Priority 3B brief, 2026-11-09; 3C placed after 3B and before 4A by the Priority 3C brief, 2026-11-10; 4A commissioned
after the user's review of 3C by the Priority 4A brief, 2026-11-10; the bounded optimization-process audit run now, with 4B
and broader funding research deferred, by the process-audit brief, 2026-11-10; the matched L0/L1/L2 lifecycle
optimization (5B) approved as the next study, and Growth screening of other ETFs planned after its review, by the 5B
brief, 2026-11-11; 5B reviewed with L0 kept as the working funding model, **Strategy Lab pooled-candidate viewing made
Priority 6**, and Growth for other ETFs renumbered **Priority 7**, to follow only once Priority 6 works and is reviewed,
by the Priority 6 brief, 2026-11-11; Priority 6 reviewed and Priority 7 split into the 7A screening and a 7B focused
optimization pending review, by the Priority 7A brief, 2026-11-11; the New L0 trading-session re-optimization commissioned
as the next optimization study after the user reported Priority 7 complete, by the Priority 8 brief, 2026-11-12), with
status and outcome as of 2026-11-12. Every priority follows the [optimization standard](OPTIMIZATION_STANDARD.md)
(current version 2.2.0, effective 2026-11-13; reports are text and tables only, §7.7):
- development 2016-01-04 → 2024-12-31 for all optimization and selection;
- 2025-01-01 → the common complete endpoint only for validating frozen selections, which is validation on previously
  examined history, not an untouched holdout;
- a maximum minute drawdown of $35,000 on one fixed $100,000 principal budget.

Each priority is commissioned and reviewed separately. Nothing starts automatically after another finishes.

| # | Priority | Status | Study | Outcome |
|---|---|---|---|---|
| 1 | D1 entry eligibility (VG #2 Balanced) | **Complete** (2026-11-08) | [`research/vg-balanced-entry-eligibility/`](../../research/vg-balanced-entry-eligibility/REPORT.md) | No useful benefit at the fixed control: eligibility stays OFF. The cost came from capital displacement, not the delayed trade. |
| 2 | VGT D1 + Growth in one shared $100,000 pool, and its separate-then-pooled follow-up | **Complete** (2026-11-08) | [`research/vgt-d1-growth-joint/`](../../research/vgt-d1-growth-joint/REPORT.md); [follow-up](../../research/vgt-d1-growth-separate-pooled/REPORT.md); [standard 1.0.0](OPTIMIZATION_STANDARD.md) | A working combination, but no robust improvement: the plain D1 primary + Growth #4 combination beat the joint primary; the joint procedure was chronologically unsupported; architecture A supported. The separately optimized pair pooled was weaker still. |
| 3 | **VGT + GDX D1 + Growth** in one shared $100,000 pool (four components) | **Complete** (2026-11-09) | [`research/vg-d1-growth-joint/`](../../research/vg-d1-growth-joint/REPORT.md) | **Negative result.** The frozen primary (an informed four-component refinement: $338,642.84 / DD $20,393.61 on development) lost $32,190.25 on 2025–2026 with a $57,568.06 DD (V1–V3 fail). The independent joint procedure was chronologically unsupported (−$61,544.61, sequential DD $102,257.90), although its C24 primary passed validation (+$76,802.05) without funding Growth·GDX. No combined system credibly improved on VG #2 (validation +$74,688.80). The unchanged VG #2 + Growth #4 + Appendix A combination failed the development tail gate (Q3) but did best afterwards, descriptively (+$139,887.46). Searched GDX Growth books were mostly unfunded. The original result is preserved unchanged. |
| 3A | Diagnostic of Priority 3: GDX Growth participation and neighbourhood risk | **Complete** (2026-11-09) | [`research/vg-d1-growth-diagnostic/`](../../research/vg-d1-growth-diagnostic/REPORT.md); [standard 1.1.0](OPTIMIZATION_STANDARD.md) | **GDX Growth went unfunded for three compounding reasons.** (1) The selected GDX books barely decided: 0 decisions in 10 of 28 finalists, 1–4 in 16, as trend-filter and recovery-gate blocks silenced them. (2) Their few decisions met a slot held by Growth·VGT or D1·VGT, with no idle overlap in 11 of the 12 refused-only cases. (3) In the Growth-only search, pairs funding both books earned less on development, so promotion chose VGT-only pools. That penalty is partly architectural: a short GDX lot can lock VGT's long Growth trade into an unfunded virtual hold for hundreds of idle sessions. **A's and B's Q3 misses** come from a narrow Growth·GDX timing cliff (Appendix A's trailing stop 7% → 7.3% gives a $38.2k DD) with modest severity: mean excess about $4k, worst $55,963.54, every draw profitable. B's p90 is within finite-draw uncertainty of $35,000; A's is not. The informed primary has a rarer but deeper tail (worst-10% mean $41,591 against A's $40,207). The Q3 verdicts stand; A and B remain user-directed candidates. **Recommendation:** a bounded current-versus-funding-aware comparison (Priority 5, brought forward) before 3B. |
| 5A | **Brought forward from Priority 5:** bounded comparison of Growth funding lifecycles (L0 current virtual book, L1 actual funding with fresh canonical opportunities only, L2 one retained refused opportunity: 20 sessions, 5%) on unchanged phenotypes; the three VG #2 + Growth combinations; matched and standalone neighbourhoods | **Complete** (2026-11-09); **reviewed** (the user commissioned 3B under L0) | [`research/vg-growth-funding-lifecycle/`](../../research/vg-growth-funding-lifecycle/REPORT.md); [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **The lifecycle does little, and where it matters it mostly hurts.** L1's paired median effect is within ±$2,500 for all nine core Growth subjects. L2 helps A but hurts B and C85, and its one centre re-entry (08500a60, April 2020) lost $4,609.29. Freeing a refused Growth book lets it displace better D1 trades (A −$11,696.39, IP −$83,057.12 at their centres). The GDX-to-VGT cost is the refusal at VGT's trend entry, which no post-refusal lifecycle recovers. No combination dominates: E (VG #2 + GDX Growth) has the highest development centre net, C4 (VG #2 + #4) the best risk evidence, and B is dominated. Standalone: 08500a60 has the strongest matched local stability, then #4; Appendix A alone is fragile (52% of nearby draws > $35,000 DD). **Recommendation:** 3B under L0 with protected both-symbol exploration; neither L1 nor L2 for 3B. |
| 3B | Larger-budget VGT + GDX portfolio optimization under L0, with **C4** (VG #2 + VGT Growth #4, GDX Growth OFF) as the user's preferred benchmark and fallback | **Complete** (2026-11-10); awaiting review | [`research/vg-d1-growth-expanded/`](../../research/vg-d1-growth-expanded/REPORT.md); [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **Keep C4.** A 4.6× larger independent search (131,072 base proposals per cutoff; 5.83 M evaluations in all) and informed fixed-D1 and joint lanes found configurations earning more than C4 on development: the formal primary, a C4 relative with refined D1 books, +$79,377.88. **None dominated C4**, so there is no replacement candidate. The formal primary is a higher-profit trade-off with a heavier tail (p90 DD $31,814.77 against $24,519.07) and earned $3,454.28 less than C4 in validation. The closest challenger keeps VG #2's D1 books and refines #4 (trend filter OFF, 5.7% trailing stop; *clarified 2026-11-10: that parenthesis is incomplete — this VGT Growth vector, later aliased C4-refined, differs from #4 in 17 settings, including the initial stop OFF, `research/c4-gdx-growth-partner/CONTROL_MANIFEST.json` `c4Refined.differencesFromGrowth4`; its recorded results are unchanged*): +$57,783.80 at the centre, p90 DD $189.64 worse (within instrument noise), validation $7,568.69 below C4. C4 qualified under the fresh instrument. E, A and B failed Q3 again as near misses. The independent procedure was chronologically unsupported (sequential DD $60,874.87). GDX Growth contributed causally only where substantively funded, and there it cost VGT trend entries. |
| 3C | **Fixed-anchor GDX partner search:** Growth·GDX searched alone beside fixed **C4-refined** (3B's `C24/informed-fixed#1 profit`, the lead), fixed original **C4**, and fixed VGT Growth #4 without D1 (companion) | **Complete** (2026-11-10); **reviewed**: the user declined adopting a GDX Growth partner (Priority 4A brief, 2026-11-10) | [`research/c4-gdx-growth-partner/`](../../research/c4-gdx-growth-partner/REPORT.md); [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **Keep GDX Growth OFF beside every baseline.** Searching GDX alone (116,928 new GDX proposals over four cutoffs, 66.7% for C4-refined; 1.57 M evaluations) raised development net by ≈ $39,000 beside C4-refined and C4 and by ≈ $120,000 beside #4 alone, but **no partner dominated C4-refined or C4** (several were within finite-draw noise of doing so: equal DD, higher p10, p90 DD $47–$298 worse). The gains rest on one or two GDX trades (the 2019 gold rally is 80% of the C4-refined primary's increment); the selected GDX books barely traded in 2025–2026 (validation equal to C4-refined and #4 alone; +$144.73 beside C4 — *clarified 2026-11-10: this describes the arms' primaries; not every 3C partner added nothing in validation: R's robust-profit and balanced holders each added +$1,766.52 beside C4-refined with one GDX lot, and the user still declined adoption*), and the descriptive fold repeats trailed every baseline (C4 arm −$108,057.54 with a $45,937.90 DD). C4-refined's GDX books transfer to C4; #4-alone's do not. Appendix A failed Q3/Q7 beside C4 and #4 again. C4 and C4-refined stay distinct baselines; no preference is recorded. |
| 4A | Dedicated standalone GDX Growth optimization | **Complete** (2026-11-10); awaiting review | [`research/gdx-growth-standalone/`](../../research/gdx-growth-standalone/REPORT.md); [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **Qualified on development, not reliable forward.** An independent search (16,384–20,480 proposals per cutoff at C19–C24) and an informed lane (Appendix A + 13 predeclared 3B/3C GDX vectors; 8,192) found 24 qualified standalone books at C24; the primary, independent `C24/indep-rise#1 profit`, earns $139,668.45 / DD $17,483.62 (conf. p10 $63,711.46, p90 DD $24,504.45) and dominates Appendix A on matched development evidence (Appendix A fails Q3/Q4: p90 $55,405.46, 51.8% breaches). But the selected books trade only on violent rebound days (minimum-strength eligibility invalidates ordinary crossings): the March 2020 episode is 52–82% of their net, they made no trade in 2016–2019, and the **primary made no trade in 2025–2026** (validation $0.00, fails V1); only the robust-profit holder `informed#2` traded (+$39,487.05). The independent procedure is **chronologically unsupported** (2020–2024 −$16,537.03, sequential DD $47,820.43 in 2022). Appendix A (browser-chosen with 2025–2026 in view) earned +$87,340.87 and reproduced its native target exactly ($141,157.37). 4B export set frozen: the primary, `informed#2`, P08, P09 (3C vectors, research controls only) and Appendix A. |
| PA | **Bounded optimization-process audit** (a separate workstream from the original Priority 5 funding research): archive reselection on 3B and 4A's actual independent cutoff candidate sets, the original selection rule against three frozen alternatives (tail severity, subperiod consistency, episode sensitivity), a frozen hindsight cohort per cutoff; no new search | **Complete** (2026-11-10); reviewed (the user approved 5B next, 2026-11-11) | [`research/optimization-process-audit/`](../../research/optimization-process-audit/REPORT.md); **[proposal for review](../../research/optimization-process-audit/PROCESS_PROPOSAL.md)**; [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **No demonstrated improvement; stop investing in selection-formula changes of this kind.** None of the three alternatives improved 2020–2024 selections; none kept the sequential DD within $35,000 in either subject; the futility rule stopped the audit before any new 2025–2026 evaluation. Useful alternatives existed but ranked low in training (3B 2020–2021: the 4 acceptable shortlisted members ranked 19th–39th of 39) and no training feature distinguished them consistently; 85 of 96 3B cohort members breached $35,000 in 2020–2021. Neighbourhood stability reflected one reproduced episode (overlap 0.78–1.00 from C21 on). No engine defect; 4A's dormancy is the specified minimum-strength rule (a documentation sentence is incomplete). Proposals (reporting only, not adopted): episode-overlap and clipping disclosure, a post-fold hindsight cohort, stronger limitation wording, less broad optimization on 2016–2024. |
| 5B | **Matched L0/L1/L2 lifecycle optimization** (the user's approved next study after clarifying 5A's limitation; separate from the failed ranking-formula audit): the VGT + GDX D1 + Growth portfolio optimized separately under L0, L1 and L2 with matched budgets, paired seeds and identical gates; independent lanes at C19/C21/C23/C24 and an informed C24 lane centred on C4 and C4-refined; a phenotype × lifecycle cross-test matrix | **Complete** (2026-11-11); **reviewed** (Priority 6 brief, 2026-11-11): L0 remains the working funding model; the original evidence labels and results stand unchanged | [`research/vg-lifecycle-matched-optimization/`](../../research/vg-lifecycle-matched-optimization/REPORT.md); [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **No demonstrated improvement over a freshly optimized L0.** With identical proposals per arm (8,192 base per cutoff; 4,034 informed) the C24 primaries were 3B's formal primary or close relatives under every lifecycle ($382,721.46 L0; $382,163.79 L1 and L2). Frozen labels: **L1 harmful** (same profit, confirmation p90 DD $33,599.14 vs $30,182.14); **L2 conditional profit/risk trade-off** (no development gain; its independent 2020–2024 path was supported, +$49,518.36 / DD $29,279.04, while L0's breached at $67,214.22 and L1's at $106,883.44 — but each L2 replicate's own path breached, and its 2020–2021 gain came from one retained re-entry). L1 can produce lifecycle-adapted phenotypes (an independent B pool earning $126,455.98 under L0 and $214,405.77 under L1); differences stayed within search variability. Validation (examined history): all primaries passed and trailed C4 (+$99,081.34). Engine end-of-door case fixed by amendment A1. **Recommendation:** keep L0; run the ETF screening under L0. |
| 4B | GDX-only D1 + Growth optimization | **Deferred** (process-audit brief, 2026-11-10; 5B brief, 2026-11-11: not a prerequisite of the ETF stage; not cancelled) | — | VG #2's GDX D1 book and the existing GDX Growth as controls; same windows and standard. If resumed, the audit recommends a bounded comparison of 4A's frozen export set by complete pooled reruns (no new search). |
| 5 | Remaining alternative pooling and funding behaviour | **Deferred** until a specific evidence-backed hypothesis exists (process-audit brief, 2026-11-10; not cancelled); 5A complete and unchanged; 5B (matched lifecycle optimization) approved separately; broader allocation / reassessment / preemption studies stay deferred and are not prerequisites of the ETF stage | — | D1 funding-aware state, other refusal lifecycles and allocation or capacity alternatives, if still worthwhile after 5A. The current virtual-book behaviour stays the production model; the 5A lifecycles are experimental study policies, not defaults. |
| 6 | **Strategy Lab pooled-candidate viewing** (application integration, not an optimization): select any of five frozen candidates — the **new L0 primary** (5B `C24/L0/informed/R1#1 profit`), **C4-refined**, **original C4**, **VGT-only D1 primary + Growth #4**, **VGT-only D1 primary + Growth 08500a60** — and inspect its actual funded D1 and Growth trades from ONE replay of the research engine | **Complete** (2026-11-11); **reviewed** (Priority 7A brief, 2026-11-11: the five-candidate viewer works; its service, code, catalog, data, saved runs and caches are preserved) | [`docs/strategy-lab/POOLED_CANDIDATES.md`](../strategy-lab/POOLED_CANDIDATES.md); [report](../strategy-lab/reports/2026-11-11-pooled-candidates/REPORT.md) | A **Portfolios** tab: a frozen read-only catalog built from the research records, a thin bridge from the verified pooled engine (5B `runLife` L0 = Priority 3's `run`), a validated replay cache, VGT/GDX tabs with D1 (square) and Growth (round) markers, partial and final exits, an expandable positions ledger, the portfolio's equity and minute drawdown, refused signals optional (OFF). **All five reproduce their archived figures to the cent** (full-history net, minute DD, 2025–2026 net, development checks, every archived record field and ledger). No search, retuning, substitution or deployment. |
| 7A | **Bounded Growth suitability screening across other ETFs** (standalone Growth per ETF under L0; the same 1,024-proposal search per eligible ETF at C19/C21/C23/C24, the whole ETF-and-phenotype selection repeated at every cutoff; an informed transfer lane of nine exact VGT/GDX vectors at C24; ≤ 3 new ETFs shortlisted by a frozen development rule) | **Complete** (2026-11-12); **awaiting the user's review** | [`research/growth-etf-screening/`](../../research/growth-etf-screening/REPORT.md); [standard 2.0.0](OPTIMIZATION_STANDARD.md) | **No convincing new-ETF opportunity.** 60 of 64 inventoried ETFs eligible (GDXJ, OIH, XLRE, XLF untested: history or an unadjusted XLF special distribution). Development profits were widespread (51 ETFs had a qualified C24 book) but concentrated in US technology funds that duplicate VGT. The complete ETF-and-phenotype procedure was **chronologically unsupported** (SMH → XLK → IGV: +$1,292.58, sequential DD $57,711.81 in 2022–2023). Only five own procedures were supported (EEM, GDX, GLD, IAU, XHB). The frozen shortlist **XHB, EEM, GLD** mostly failed 2025–2026: XHB −$14,552.44, EEM no trade, **GLD +$6,152.97 with a $32,933.23 reset DD** (passes, near the ceiling). The universe primary SMH#1 (a near miss) earned +$35,685.87. ETF-specific search beat the fixed transfers in 17 of 24 ETFs where both qualified. Native targets reproduced exactly; 1,188,014 fresh simulations of the 2,000,000 ceiling. **Recommendation:** stop broad ETF Growth expansion; at most a narrow gold-only 7B with prospective shadow observation. |
| 8 | **New L0 trading-session re-optimization:** recover and lock in the method that produced New L0 (reference method NL0 1.0.0); add an explicit, experimental NYSE-session maximum-hold unit (calendar days stay the default); re-optimize New L0's VGT + GDX D1 + Growth combination (Growth·GDX OFF) under sessions with NL0 at ≈ 3× its effort; compare A (New L0, calendar), B (New L0, sessions), C (re-optimized, sessions) | **Complete** (2026-11-12); **awaiting the user's review** | [`research/vg-l0-session-hold/`](../../research/vg-l0-session-hold/REPORT.md); [method NL0](methods/NEW_L0_METHOD.md); [standard 2.1.0](OPTIMIZATION_STANDARD.md) | **Calendar-day holds remain preferable.** Sessions hurt the fixed phenotype (B − A −$41,863.67 on development; B fails Q3, as does every incumbent under sessions) by extending losing D1·GDX maximum-hold exits and displacing later trades from the one slot. Re-optimization (132,890 proposals, 1.46 M requested evaluations: 2.7–3.0× the original L0 arm) recovered +$32,818.88 but C trails New L0 by $9,044.79 on development, $8,118.44 in 2025–2026 (examined history) and $17,163.23 over full history; frozen labels B vs A and C vs A *harmful*, C vs B *conditional trade-off*; the session procedure is chronologically unsupported (+$25,237.54, DD $58,866.62). New L0 stays the frozen benchmark; no replacement. |
| 7B | Focused Growth optimization of the promising ETFs | **Pending the user's review of 7A**; not started; nothing starts automatically | — | 7A's proposal (`REPORT.md` §9): stop, or a narrow **7B-gold** (standalone GLD at 4A's scale, IAU substitute control, GDX reference) whose forward evidence would come from prospective shadow observation (2025–2026 is now examined). |

**Decisions recorded (Priority 8 brief, 2026-11-12).**
- The user reported Priority 7 complete and commissioned the **New L0 trading-session re-optimization** (row 8) as the next
  optimization study; this roadmap records 7B's own status unchanged (not started).
- **Method preserved:** the procedure that produced New L0 is a versioned reference method (`methods/NEW_L0_METHOD.md`,
  NL0 1.0.0); standard 2.1.0 (minor) adds §3.5 (convention changes) and §4.8 (reproducing a reference method).
- **Engine:** an explicit, experimental `holdUnit = 'sessions'` option; calendar days remain the default and every frozen
  result reproduces. No candidate, catalog entry or deployment changed.

**Decisions recorded (Priority 7A brief, 2026-11-11).**
- **Priority 6 is reviewed:** the five-candidate Strategy Lab viewer is complete; its working service, code, catalog,
  data, saved runs and caches are preserved (7A changed none of them).
- **Priority 7A (bounded Growth suitability screening across other ETFs) ran and is complete**; **7B (focused
  optimization) is pending the user's review** of 7A and starts only if commissioned.
- **Still deferred:** Priority 4B and broader allocation / reassessment / preemption experiments. **Concluded:** the
  separate short-term dip-recovery project. Neither was started.
- **Unchanged:** every existing candidate identity and prior verdict; the optimization standard (2.0.0); 7A adopted none
  of the process audit's ranking formulas and no new activity, concentration or tail-severity gate.

**Decisions recorded (Priority 6 brief, 2026-11-11).**
- **The matched lifecycle optimization (5B) is reviewed; L0 remains the working funding model.** 5B's original evidence
  labels (L1 harmful, L2 conditional profit/risk trade-off) and results are preserved unchanged.
- **Priority 6 is Strategy Lab pooled-candidate viewing** (this roadmap's row 6): the five named candidates, the new L0
  primary included, viewable as complete pooled portfolios. It is application integration only — no optimization, ETF
  screening or next-priority work starts with it.
- **Priority 7 is Growth for other ETFs**, only after the Priority 6 functionality is working and reviewed. This
  explicitly supersedes the ETF-first sequence in 5B's brief and report (kept there as history).
- **Still deferred:** 4B and the broader allocation / reassessment / preemption research. **Still declined:** the 3C GDX
  partner.
- **Catalog inclusion is permission to inspect**, not a live-trading instruction or a new favourite designation; the
  catalog's order is not a safety ranking.

**Decisions recorded (5B brief, 2026-11-11).** *(Its next-stage sequence is superseded by the Priority 6 brief above: the
ETF stage is now Priority 7, after Priority 6.)*
- **The process audit is complete.** Its ranking-formula experiment failed; none of its formulas (tail severity,
  best-year-excluded, top-episode-excluded) is adopted. Its observations (episode dependence, parameter clipping, sparse
  decisions, local stability versus later periods) are carried as reporting only.
- **The matched L0/L1/L2 lifecycle optimization (5B) is the approved next study**, a specific experimental comparison
  separate from the audit: 5A changed funding behaviour on unchanged phenotypes, so it did not compare the best portfolios
  a matched search finds under each lifecycle. **5A remains complete and unchanged.** L0 stays the production model; no
  experimental lifecycle becomes a default; no deployment is implied.
- **After the review of 5B, Growth suitability screening for other ETFs is the next planned stage**, followed by focused
  optimization of the promising ETFs. *(Superseded 2026-11-11: now Priority 7, after Priority 6.)* **Priority 4B and broader allocation, reassessment and preemption studies remain
  deferred** and are not prerequisites for the ETF stage. The 3C GDX partner stays declined; C4 and C4-refined stay
  distinct baselines. Nothing starts automatically.

**Decisions recorded (process-audit brief, 2026-11-10).**
- **Sequencing approved by the user:** the bounded optimization-process audit now; **Priority 4B deferred**; **broader
  funding research deferred** until there is a specific evidence-backed hypothesis; **Priority 6 (other ETFs) remains
  pending** *(renumbered Priority 7 on 2026-11-11; Priority 6 is now Strategy Lab pooled-candidate viewing)*. Neither deferred item is cancelled; none starts automatically. The audit is a separate workstream from the
  original Priority 5 funding research: **5A is complete** and its L0/L1/L2 comparison was not repeated.
- **Unchanged:** C4 and C4-refined (3B `C24/informed-fixed#1 profit`) stay distinct research baselines; the frozen GDX
  candidates (4A's export set; `informed#2 robust` a research candidate) stay as frozen; the 3C GDX partner stays
  **declined** (not adopted).
- **The audit's result** (row PA): no demonstrated improvement from three alternative selection formulas; its process
  proposals are in `research/optimization-process-audit/PROCESS_PROPOSAL.md` and await the user's review. The
  optimization standard is unchanged (2.0.0); no experimental policy becomes a rule.

**Decisions recorded (Priority 4A brief, 2026-11-10).**
- **Priority 3C is reviewed and complete.** The user **declined** to adopt its additional GDX Growth partner, particularly
  because the earlier-cutoff selections underperformed their GDX-off baselines. Its results and candidate records are
  preserved; non-adoption does not mean every candidate failed qualification (all 3C partners qualified on
  development). Its GDX vectors may serve as labelled research controls or informed seeds, never as an approved
  addition under another name.
- **C4-refined is the accepted alias** for Priority 3B's `C24/informed-fixed#1 profit` (`0f017f0ab9b26f24`, Priority 3
  quad `07443ffaeef41e85`), not a different candidate: VG #2 Balanced's unchanged D1·VGT and D1·GDX books plus the refined
  VGT Growth phenotype (17 settings differ from #4, the initial stop OFF among them), GDX Growth OFF. Original **C4**
  uses VGT Growth #4. Both stay separate research baselines; no deployment instruction and no final choice between them
  is recorded.
- **The research sequence:** 4A standalone GDX Growth → 4B GDX-only D1 + Growth → the remaining Priority 5 funding,
  allocation and optimization-process investigation → Priority 6 other ETFs *(now Priority 7)*. Nothing starts automatically.
- **The separate short-term dip-recovery project is complete with no interesting results**, by the user's report (not
  restarted).

**Decisions recorded (Priority 3C brief, 2026-11-10).**
- **3C next, then the unchanged order:** 3C (fixed-anchor GDX partner search) runs after the completed 3B and before 4A;
  afterwards **4A standalone GDX Growth → 4B GDX-only D1 + Growth → the remaining Priority 5 allocation/funding work →
  Priority 6 other ETFs** *(now Priority 7)*. Nothing starts automatically.
- **Two distinct, immutable baselines:** C4 (VG #2 + VGT Growth #4, GDX Growth OFF, `f324035d15f69610`) and
  **C4-refined** (an alias in 3C for 3B's `C24/informed-fixed#1 profit`, `07443ffaeef41e85`; VG #2's D1 books unchanged,
  a refined VGT Growth book). The user is *considering* C4-refined as a new favourite; no final preference is recorded
  (C4 stays the recorded preferred configuration until the user states otherwise), and no preference is a deployment
  authorization.
- **The separate short-term dip-recovery track is complete with no interesting results**, as the user reported in the
  Priority 3C brief (2026-11-10). It is recorded from that report, not from an independent audit; it was not restarted.
- **Approved for the remaining Priority 5 work (recorded, not launched): a targeted optimization-process
  investigation** — trace the causes of the chronological drawdown failures (Priorities 2, 3 and 3B); investigate whether
  severe neighbourhood outcomes deserve a different role in selection; and test proposed selection or risk-control
  changes across successive periods before adopting them. The approval is for the investigation only, not for a
  predetermined new threshold or an automatic liquidation rule, and it changes no gate of 3C. If a later agreed process
  change is supported, the optimization standard and its companions are updated and versioned (standard §7.4, §8).

**Decisions recorded (Priority 3B brief, 2026-11-09).**
- **C4 is the user's preferred configuration** (VG #2 Balanced's VGT + GDX D1 pair plus VGT Growth #4, GDX Growth OFF),
  the preferred benchmark and no-improvement fallback, unless the user explicitly changes it. This is a research
  preference, not a deployment approval; C4's archived phenotype is never modified or replaced by an approximation.
- **3B ran under L0 only** (one exclusive slot; no funding-aware lifecycle, reservations by family, sharing, dynamic
  sizing, ranking or allocation search); a higher historical profit alone never establishes a better or safer
  replacement.
- **Next order (unchanged):** 4A standalone GDX Growth → 4B GDX-only D1 + Growth → the remaining Priority 5 funding and
  allocation work → Priority 6 other ETFs *(now Priority 7)*. Nothing starts automatically.

**Decisions recorded (Priority 5A brief, 2026-11-09).**
- **Bounded Growth-lifecycle comparison brought forward** before 3B, replacing the blanket deferral of funding-behaviour
  changes; automatic replacement of the current model is not authorized.
- **The objective includes comparing the three shared-capital combinations:** VG #2 + GDX-only Growth, VG #2 + VGT-only
  Growth and VG #2 + both Growth books. Both strategy families must be represented in a combined system; funding every
  possible component is not the objective.
- **A dedicated standalone GDX Growth optimization** is Priority 4A, then GDX-only D1 + Growth (4B).
- **Reporting preference:** written analysis, Markdown tables and machine-readable results only, no visuals (standard
  2.0.0 §7.7, `CLAUDE.md`); earlier visuals are preserved.
- **No production lifecycle change and no new hard risk threshold** without a concrete proposal for review.

**Decisions recorded (Priority 3A brief, 2026-11-09).**
- **Sequencing depends on the evidence:** 3A came next; it could recommend bringing forward the relevant bounded part
  of Priority 5 before 3B. No study is reordered or started automatically: the user reviews 3A first.
- **Candidate consideration is not qualification** (standard 1.1.0 §2.8). The unchanged VG #2 + Growth #4 + Appendix A
  and VG #2 + Growth 08500a60 + Appendix A combinations stay user-accepted candidates for investigation. Their sealed
  Q3 verdict stays "fail". This is not deployment approval, a new p90 tolerance or a change of the $35,000 budget.
- **Severity beside frequency, participation attribution, protected both-symbol exploration:** standard 1.1.0 §5.8,
  §2.9, §4.7 (report-only or [S]; no new gate).

**Decisions recorded (Priority 3 brief, 2026-11-08).**
- Funding-behaviour changes are deferred to Priority 5 (superseded on 2026-11-09 by the 5A brief for the bounded
  Growth-lifecycle comparison only). Through Priorities 3 and 4 a refused entry still starts the component's virtual
  trade, funding never feeds back into a book, and freed capital never revives a refusal.
- The as-is (unchanged) benchmark is retained beside any joint refinement: combining unchanged phenotypes and refining
  them are separate experiments, and the unchanged combinations stay in every comparison.

## VG #2 Balanced is already a jointly optimized VGT + GDX D1 pool

**Identity.**
- Runner alias `s8-vg-balanced` (equivalently `s8-vg-3`); configuration **`S8-VG-F24-3`**. The config file is
  `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`, sha256 `27cbadf9…6c0da`.
- Do not confuse its shortlist suffix 3 with its overall rank 2. Do not confuse it with Study 7's older `vg-balanced`
  alias.

**What it is: a paired phenotype.**
- Study 8's track VG optimized **all 16 parameters of both books jointly** (8 per book), scored on the executed
  shared-pool replay; standalone P&L was never summed.
- It is not two independently chosen D1 books. It must be preserved, and reused, as the pair below together with its
  allocator conventions.

| D1 parameter | VGT book `d1-bd80e32ee4` | GDX book `d1-7b99d2833d` |
|---|---:|---:|
| targetPercentChange (X) | 23.5% | 27.6% |
| trailingBuyPercentage (Y) | 0.9% | 0.1% |
| trailingStopPercentage | 7.4% | 5.7% |
| maximumHoldDays | 15 | 12 |
| tickWindowSize (L) | 78 | 243 |
| intradayLossBuffer | 4.4% | 2.9% |
| pullback (P) | 11.0% | 15.2% |
| continuationWindow (W) | 55 | 12 |
| `parametersSha256` | `078c4339…e570a8` | `95e0dd80…e83696a` |

**Allocator conventions** (Study 8 PROTOCOL.md §1.5; `src/study8-runners/README.md`):
- **Funding:** one funded $100,000 slot shared by both books, no compounding, no simultaneous funded positions.
- **Books and priority:** shadow books keep their virtual state when a signal is refused. The first executable signal
  wins, with reservations and no preemption; same-minute ties go in alphabetical order.
- **Economics:**
  - 11% simple interest on principal (365-day year);
  - 5 bps per side, $0 commission;
  - stops at the stop or the gapped open, with no extra slippage.
- **Calendar:** accounting from the close of 2016-01-04, arming on 2017-06-15.

**Provenance.**
- **Selection:** Study 8 primary fold F24 (search 2016-01-04 → 2024-12-31): rank 2, tier strong, role balanced,
  shortlist #3.
- **Hashes:** protocol sha256 `22eebc37…`; selection body `5d266eea…`; test body `f85b4d7a…`.
- **Training centre:** net $260,223, minute DD $17,281, 36 lots.
- **Its one-time 2025-01-02 → 2026-10-29 test:** T gates PASS, test net $79,925, run net $340,148, run DD $21,304.
- **Priority 2's external context:** $334,911.93 through 2026-10-30 with a $21,303.61 DD.
- **Status:** research only, not deployed.

## Priority 3 (complete) — what it implies for Priority 4

- **The study:** [`research/vg-d1-growth-joint/REPORT.md`](../../research/vg-d1-growth-joint/REPORT.md). It ran four
  arms in one shared $100,000 slot (architecture A):
  - the unchanged controls;
  - a Growth-pair search combined as-is with VG #2;
  - an informed four-component refinement;
  - an independent four-component search with C19/C21/C23 folds.
- **What it suggests for GDX alone:**
  - the searches rarely funded a GDX Growth book next to D1·GDX;
  - Appendix A's browser-selected GDX Growth (reproduced to the cent: $141,157.37 / $17,709.96, flat at the end) was
    the only substantively funded one.

  Priority 4 can test GDX D1 + Growth without VGT, with VG #2's GDX book and Appendix A as controls.
- **Both failures traced to long Growth holds occupying the exclusive slot.** Priority 5A (2026-11-09) tested the
  Growth refusal lifecycle on the unchanged phenotypes: neither funding-aware variant repaired it (the cost is the
  refusal at VGT's trend entry), so the virtual-book behaviour stays the model for 3B and Priority 4; D1 funding-aware
  state and allocation alternatives remain Priority 5.
- **Priority 4 is now 4A (standalone GDX Growth optimization) then 4B (GDX-only D1 + Growth).** 5A's common standalone
  instrument found the existing GDX Growth (Appendix A) locally fragile alone on 2016–2024, so 4A's independent and
  informed lanes both matter.
- **Priority 3B (2026-11-10) adds:** directly searched as pooled components, GDX Growth books were mostly token or never
  funded. The few substantive ones trailed C4 by $82,637.60–$94,668.42 of development net. The existing GDX Growth
  (E) failed the neighbourhood tail gate again under a fresh instrument (p90 DD $35,057.52). A funded GDX book keeps
  costing VGT Growth trend entries. A GDX Growth book with a stable neighbourhood therefore still has to be found
  standalone (4A), then tested beside D1·GDX without VGT competition (4B).
- **Priority 4A (2026-11-10) adds:** standalone, GDX Growth has locally stable 2016–2024 phenotypes far stronger than
  Appendix A on matched development evidence, but they are dormant outside violent rebounds (no trade in 2016–2019 or
  2025–2026 for the primary) and the procedure that selects them failed chronologically. For 4B: test the frozen export
  set beside VG #2's GDX D1 book by complete pooled reruns, and report dormancy and episode concentration beside profit;
  a pooled benefit cannot be inferred from standalone profit. For the Priority 5 process investigation: another case of
  neighbourhood stability not transferring forward, and of selection favouring an eligibility filter that makes a book
  nearly inactive.
- **Priority 3C (2026-11-10) adds:** a GDX Growth book searched beside fixed anchors fills whatever capital the anchors
  leave idle — a lot beside VGT Growth #4 alone, little beside C4 or C4-refined — and its development gains were
  episodic (a few GDX trades) and absent in 2025–2026. A GDX book tuned beside #4 alone lost money beside C4 and
  C4-refined. For 4A and 4B this argues for reporting the number of independent GDX episodes beside profit (standard
  §2.6) and for evaluating any pooled use by complete reruns beside the intended anchors; no rule changes.
