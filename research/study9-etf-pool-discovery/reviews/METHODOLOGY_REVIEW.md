# Methodology and code review: Study 9, Phase A (pre-freeze)

**Reviewer:** an independent read-only agent, 2026-11-02 (about 18:16Z). **Scope:** the brief (read in full), the draft `PROTOCOL.md`, `AMENDMENTS.md` and `DATA_MANIFEST.md`, all of `src/study9-etf-pool-discovery/*.ts` and its tests, `scripts/build_tables.py`, and the reused Study 5/6/8, portfolio-aware-d1, d1-robust and complementarity modules. The reviewer read no `data/` files and ran no code. Of the results, only `results/pilot/pilot.json` and the `results/s0/*.json` headers were read.

**Version reviewed (sha256 prefixes):**
- `PROTOCOL.md` `0d5ca3ced9541663…`. It was edited during the review: 640 → 643 lines, mtime 18:58 local. The edit already fixed three mismatches this reviewer had found in the earlier draft: the "opportunity score" vs "ETF order" naming for the N seeds and the protected list, the cluster count (16 → 15), and the text on the risk-flagged fill.
- `AMENDMENTS.md` `859b1611…`
- `DATA_MANIFEST.md` `d69262b7…`
- `s1.ts` `61721687…`, `s2.ts` `ecbc35be…`, `s3.ts` `61aecb25…`, `parity.ts` `a5ef63b8…`, `records.ts` `0d9a0800…`, `door.ts` `41c01f50…`, `engine.ts` `f5a5e20e…`, `design.ts` `4b0bc317…`
- `build_tables.py` `494da93e…`

## Summary verdict

**Data door and leakage: sound.** No path was found by which a Phase A strategy computation can read a bar after 2024-12-31:
- the root is the physically truncated projection, and the end date is refused before a byte is read;
- the loader also trims sessions by New York date;
- door ids and cache keys derive from prefix hashes;
- nothing persisted carries a whole-file hash;
- no distribution ledger is loaded, so the user's modified `distributions.csv` cannot enter any result.

**Study 8 fitness: preserved exactly.** The centre and neighbourhood views, C1–C7, the objectives, robust profit, floors, radius, box, execution and stresses are all imported unchanged.

**Not ready to freeze.** There is one critical design risk (C1). It concerns S2, which is write-once, so it must be fixed before the freeze. There are also ten major issues:
- greedy beam and swap generation that does not match the protocol's description (M1);
- no pre-registered complementarity criterion, so the design cannot deliver an honest negative result (M2);
- family contamination through anchor proxies (M3);
- the decisive set's common random numbers spanning pools and families (M4);
- vector assignments drawn only from standalone-optimized menus (M5);
- time diagnostics that are not independent of each other (M6);
- a PBO computed on a statistic other than the one used for selection (M7);
- leave-one-out and displacement metrics missing for most proposals (M8);
- holes in the hash chain and pins (M9);
- parity gates with too little power on same-minute ties (M10).

All of these are cheap to fix before the freeze.

## Critical findings

**C1: Opportunity-source groups are connected components (they can chain), and anchor proxies are excluded on correlation alone.** This risks pruning a large share of the universe from every family.
- **Where:** `s2.ts:303–326` (edges and union-find); `s2.ts:330–335` and `486` (`excludedFor`: VGT/GDX group-mates removed from all four families' candidate lists); `s2.ts:349–356` (N seeds); `s3.ts:98–99` (`dupOk`, one member per group in the exhaustive-candidate, beam and swap streams). Protocol §7.5.
- **What:** groups are the transitive closure of pairs with return correlation ≥ 0.95, or with match share ≥ 0.80 under both α and β plus correlation ≥ 0.80. Single linkage chains. On 2017–2024 daily returns, a path such as VGT–XLK–IWF–VOOG/QUAL–VIG–IWD–RSP–IJH–IJR–IWM–IWN, each link ≥ 0.95, is plausible. This was not verified, because no data was read. If it holds:
  - "VGT's proxies" become most of the US-equity block;
  - that block is removed from the V, G, VG and N candidate lists and from the N seeds;
  - no primary pool may hold more than one US-equity ETF.
- **Why it matters:**
  - It contradicts the brief (§1.3 and §5): "avoid over-pruning: high correlation alone is not an automatic rejection if the actual incremental replay … reveals distinct funded opportunities". The code removes proxies before looking at the S2 replay evidence it has just computed.
  - The brief's own V-family example (VGT + XLF + IWM) could then appear only in random exploratory streams.
  - S2 is write-once, so the damage cannot be repaired after the freeze without an amendment.
- **Fix:**
  1. Define a proxy as a symbol with a *direct* duplicate edge to the anchor, not the whole component.
  2. Exclude a proxy only if the replay evidence agrees, for example mean marginal Δnet/yr against the anchor ≤ 0 under both α and β, and an idle-entry share below a predeclared threshold.
  3. Build the one-per-group groups by complete linkage (every pair inside a group satisfies the edge rule, with deterministic tie order), or cap the group diameter.
  4. Record group and component sizes in `s2.json`. Predeclare a fail-safe: a group larger than 3, or spanning more than one repository cluster, is split.

## Major findings

**M1: The beam and the swaps are depth-first, so their effective breadth is far below the protocol's "12 parents / 6 pools".**
- **Where:** `s3.ts:353–366` (beam) and `378–397` (swaps); protocol §8.1.3.
- **What:**
  - The loop is `for parent → for candidate → break at 48`. With 12 candidates, each parent yields about 9–10 admissible children, so the first 4–5 parents consume all 48 slots and parents 6–12 add nothing.
  - The swaps have the same shape: the best beam pool alone (3–4 removable members × about 9 candidates) uses all 24 swap slots.
  - The exploratory members of the list sit at its end. They are reached only because each expanded parent is exhausted.
- **Why it matters:** the 72 primary proposals at sizes 4–5 (and 3–5 for N) cluster around a few parents chosen from noisy 16-point scores. Search coverage and family results then depend heavily on luck at size k−1, and the protocol misstates what is done.
- **Fix:**
  - Use a round-robin beam: in round r, every parent contributes its r-th admissible child in list order, about 4 per parent.
  - Reserve at least one child per parent for the list's exploratory members.
  - Use round-robin swaps over the 6 pools, 4 per pool.
  - Record skipped children with reasons (taken, `dupOk`, invalid).

**M2: There is no pre-registered "meaningful incremental improvement" criterion, so the design cannot produce an honest negative result.**
- **Where:** `s3.ts:828–850` and `913–934`; protocol §1 ("Filling the nomination slots with weak pools is not success") versus §8.6 ("No filling" forbids only *infeasible* pools).
- **What:**
  - Any Study 8-feasible pool that passes Q7 is nominated (up to 3 per stratum), and the batches are filled up to 8, even when a pool loses to its own best proper subset, to its family's anchor-only replay or to the same-instrument reference sets.
  - The leave-one-out and Shapley results are computed but gate nothing.
  - Study 8 track sets use nomination slots. VG2 contains only {VGT, GDX}, which is a track set, so the VG family has no 2-book Phase B candidate by construction.
  - Batch B can equal Batch A when there are 8 or fewer nominees. The brief requires an alternate that changes composition.
  - "Distance from random" compares a nominee's selection-inflated 16-point best-of-6 score with only 12 random pools, and none exist in exhaustive strata.
- **Fix:**
  1. Predeclare a complementarity test before nomination. For example:
     - I1: decisive robust/yr minus the best proper subset's robust/yr, measuring that subset on the same decisive design (common random numbers make the difference precise), is at least a stated margin;
     - I2: every book's leave-one-out Δnet/yr is > 0 at the centre;
     - I3: the pool's standing against the same-size reference and incumbent sets is stated.
  2. Batches draw only from pools that pass. A family with none is declared negative.
  3. Track sets do not count toward the 3 slots.
  4. B must differ from A by at least 2 pools, or the identity is stated.
  5. Add a labelled null reference of about 48 uniform pools per stratum at 16 points, outside the budget and never nominated. Compare nominees' *independent* 64-point robust with it.

**M3: Families can be contaminated by anchor proxies.**
- **Where:** `s3.ts:237–245` (`randomPool` excludes only VGT and GDX), `s3.ts:343–366` (beam children inherit exploratory parents' members), `s2.ts:349–356`; protocol §7.5 ("labelled") and §7.6.
- **What:**
  - N-family exploratory pools, and their beam descendants, may contain XLK or other direct VGT near-duplicates. That is "VGT in disguise", which the brief warns against for the N family.
  - V pools may contain GDX proxies and G pools VGT proxies, which makes them effectively VG.
  - No proposal carries a proxy label, although the protocol says such pools are "labelled".
  - The N seeds exclude only proxies, so a seed may come from VGT's own cluster (us-tech-growth, e.g. SMH).
- **Fix:** add `proxyMembers` to every `Proposal`. Then either:
  - exclude direct anchor proxies from every N stream (and GDX proxies from V, VGT proxies from G), or
  - report such pools as a separate "N*/V*/G*" class that is never nominated under the clean family.

  Predeclare whether N seeds may come from the us-tech-growth and precious-metals clusters.

**M4: The decisive 384-point set shares each book's offsets across every pool, stratum and family.**
- **Where:** `design.ts:116` (seed `[...labels,'book',symbol]`), `s3.ts:64` (`s3-hi` labels without a pool id); protocol §6.3, §8.4 ("3 × 128 independent points") and §12.
- **What:** the distributional-equivalence claim is correct *per configuration*. Study 8 also shared offsets among centres of the same track (same member set). Study 9 goes further: VGT's 384 offsets are identical in every V and VG pool across all sizes, and in the incumbents. The pools' decisive errors are therefore positively correlated across pools and families. Bands and the nomination gate are set on this set, so one unlucky (or lucky) VGT or GDX block can flip feasibility for a whole family together, through the "No filling" rule.
- **Fix:** make the decisive set exactly Study 8's instrument per pool: `familyDesign` joint LHS with labels `['s3','hi',rep,poolId]`. Keep per-book common random numbers for the 16- and 64-point sets and trace reuse. Optionally keep a report-only paired replicate for incumbent comparisons.

**M5: All six assignments come from each ETF's standalone top-4 menu (best of 32 per half).**
- **Where:** `s2.ts:80–102`, `s1.ts:166–173`; brief §1.1 ("generic nonoptimized"), §5 ("one arbitrary vector can miss real complementarity") and §6.
- **What:** the menu is chosen by standalone robust/yr. That carries a standalone winner's curse into S2 and S3, and it favours high-occupancy vectors. In a one-slot allocator, high-occupancy books block one another, so the instrument systematically understates complementarity and pushes toward one dominant book. The γ draws only reshuffle the same four vectors. The exploration slot and the queue are still selected by fixed-vector profit, among high-evaluated pools only.
- **Fix:** add pool-independent assignments that are not standalone-selected:
  - δ1–δ2: seeded uniform draws from each ETF's plausible vectors over all 64;
  - ε: each ETF's lowest-occupancy plausible vector in its top 16.

  Report how robust the screening order is to them (best-of-6 versus best-of-δ). Choose the exploration slot by a non-profit criterion, such as the most distinct clusters or the highest S2 idle-entry share among feasible exploratory pools.

**M6: The two time-based training diagnostics are not independent, and no expanding-fold selection is tested.**
- **Where:** `s3.ts:646–652` and `879–907`, `s1.ts:181–183`; protocol §4.3; brief §4 (expanding folds "where affordable") and §6 ("at least two independent").
- **What:**
  - TD1 and TD2 both use the same EARLY/LATE split. PBO is a multiplicity measure, not a time test.
  - The TO-F19…F24 attributions are cumulative marks, not walk-forward selections.
  - The data are already available: every record carries the fold and year periods.
- **Fix:**
  - Add a TD3, an expanding-fold walk-forward: for each F in F19…F23, rank the stratum's proposals (at α and at best) by the neighbourhood robust attribution to F, and report the next period's attribution (Spearman, top-k lift). Do the same per ETF over the 64 S1 vectors.
  - Add an ex-2020 robustness check (excluding M2020 and 2020).
  - Store per-fold and per-year neighbourhood medians in `fitSummary`.

**M7: The PBO is computed on a statistic other than the one used for selection.**
- **Where:** `s3.ts:880–883`; protocol §4.3 and §8.5.
- **What:**
  - Configurations are scored by their *centre* half-year P&L, with in-sample argmax of the sum. Selection actually uses the constrained 16-point *neighbourhood* robust order.
  - In beam strata the configuration set was itself generated adaptively from the same data, so CSCV understates overfitting.
  - Duplicate assignments create ties.
- **Fix:** compute block performance as ½ median + ½ p10 of the neighbourhood's half-year attributions, stored from the 16 records. Label the current figure "centre-P&L PBO". Deduplicate configurations by `configId`. State that PBO is a lower bound in adaptive strata.

**M8: The brief's per-proposal contention metrics are computed only for high-precision pools.**
- **Where:** `s3.ts:187–207` versus `526–573`; brief §6 ("for each proposal … refused and displaced signals, incremental accepted lots, effect of removing each book").
- **What:** leave-one-out, displaced lots and incremental accepted lots exist only for about 7 pools per stratum plus the comparators.
- **Fix:** at screening, for each proposal's best assignment (preferably all six), replay every (k−1)-subset at the centre. That is k cached-trace replays (about 2–5 ms each), roughly 5–30k replays in total. Record leave-one-out Δnet/yr, ΔDD, per-book accepted, refused and displaced lots, and per-book episodes.

**M9: Gaps in the chain and pin enforcement.**
- **Where:** `commands.ts:118–128`, `commands.ts:60–63`, `records.ts:301–316`, `records.ts:158`; protocol §3 and §11.1.
- **What:**
  - (a) The generic `seal <phase> <files…>` can seal any phase name, including `parity`, a stage name, or `code-*` with a crafted `/freeze/code-*.json`. That lets anyone skip the engineering gates or forge a code acknowledgement.
  - (b) Later stages check that the parity phase exists, not that `parity.json` has `passed: true`.
  - (c) `acknowledge-code A0` succeeds, because `## A0 —` is the pre-freeze entry. Any post-freeze code change could cite it once.
  - (d) `scripts/build_tables.py` and the shell scripts sit outside the pins. Yet the build script computes §8.5's shrinkage and distance-from-random and the 6+-book inventory, so those predeclared analyses can change after results without an amendment.
  - (e) The S1/S2/S3 budgets, labels, nomination rules and neighbourhood families are absent from `constantsSnapshot`. They can change through `acknowledge-code`, although §8.1 calls them "hard".
- **Fix:**
  - Whitelist `seal` to `report-*` phases and refuse reserved names.
  - Have stages verify that `parity.json.passed === true` and that the file is in the parity entry.
  - Refuse amendment IDs present in `results/freeze/AMENDMENTS-protocol.md`.
  - Pin `scripts/*` and `package.json` with the code.
  - Add the budget and rule objects to `constantsSnapshot`.

**M10: The parity gates lack power on ties and reservations at the boundary.**
- **Where:** `parity.ts:137–169` (P1 uses random symbols and vectors) and `parity.ts:354–366` (N2 base settings only).
- **What:**
  - Same-minute alphabetical ties and reservations among *non-B5* symbols are new territory, and near-duplicate pools (V2 VGT+XLK, GLD+IAU, …) are in scope. Random P1 pools may exercise no ties at all.
  - N2 does not test next-open stop fills, the classic place for a lookahead at the window's end, and does not assert that any configuration has an open lot at 2024-12-31.
- **Fix:**
  - Add deterministic tie-heavy P1 pools: near-duplicate pairs at identical vectors (VGT+XLK, GLD+IAU, IJR+IWM, KBE+KRE, XLU+VPU) plus one 5-book near-duplicate pool, at base and next-open settings. Record, and require > 0, the count of same-minute multi-book decisions and reservation events.
  - Run N2 at next-open and +25 bps, and assert that at least one configuration holds an open lot on 2024-12-31.

## Minor findings

- **m1: S1's final order is not one constrained order.** `s1.ts:157–160` places the top-8 vectors (80 points) ahead of the rest even when they are infeasible at 80 while #9+ are feasible at 16. `bestKey` (`s2.ts:342–346`) uses `vectors[0]`, while `opportunityOf` (`s2.ts:77–78`) can take a 16-point value from #9+. *Fix:* apply the constrained order across all 64, using each vector's final precision, or document the rule.
- **m2: The mid-stage pooled 80 includes the 16 selection points** (`s3.ts:488`), so the mid order keeps some of the selection bias, and the 16→80 shrinkage (`build_tables.py:370–384`) is diluted. *Fix:* order by, and estimate shrinkage from, the independent 64-point set; report pooled-80 as well.
- **m3: Duplicate assignments are not removed.** γj can equal α or β, and one pool's six assignments can repeat configurations (`s2.ts:94–98`). This inflates "6 trials", can spend both mid slots on one configuration (`s3.ts:478–480`) and creates PBO ties. *Fix:* deduplicate by `configId`.
- **m4: Jaccard ≥ 0.75 catches only nested pools** (`s3.ts:803`). Two 5-book pools sharing 4 members score 4/6 = 0.67 and pass. *Fix:* skip any pool that differs by ≤ 1 member from one already chosen.
- **m5: Centre quantities are never re-measured.** Centre net, C1, C6 and C7 carry selection bias from best-of-96×6. *Fix:* add Study 8's Q8 (confirmation median ≥ 60% of the centre) and Q2b (in-box) as report-only checks at high precision.
- **m6: The ranking is mislabelled.** It is called "Study 8's constrained order", but Study 8's search order is constrained-Pareto (`study8/search.ts:112–126`); robust/yr is its profit-role order. Objectives 1 (centre net/yr) and 4 (p90 DD) do not affect Phase A ranking. *Fix:* relabel; report each nominee's 4-objective non-dominated status; optionally add a p90-DD-aware alternate batch.
- **m7: An undocumented +5-session extension** is applied to market-wide event windows (`s2.ts:393`, `s3.ts:613`), and β replays use α-derived windows. *Fix:* document both or remove them.
- **m8: EARLY and LATE robust attributions are in dollars**, not per year (`design.ts:203`), over 3.55 versus 4.0 years. *Fix:* annualize them in TD1 reporting.
- **m9: Multiplicity accounting is incomplete.** Beam strata inherit a selection path through k−1. The N seeds add a best-of-59 standalone selection layer that V and G lack. `StratumRecord` does not record neighbour or replay counts, which §8.5 promises. *Fix:* record per-stratum `lab.computed` and replay counts; report cumulative family-level trials; disclose the N seed layer.
- **m10: The smoke-test disclosure is incomplete.** AMENDMENTS A0 §3 says a toy run "showed" that Study 8-feasible standalone vectors "may be rare" and the seed rule was changed. That is outcome-derived information, however coarse. The smoke door openings went to the scratch log, not `results/doors.jsonl`. *Fix:* disclose exactly which count was seen and list the smoke door openings (time, members, end).
- **m11: S0 eligibility reads post-2024 data.** D1 (completeness to 2026-10-30) and D3 (split-sized moves over the whole file) use it (`s0.ts:170`, `224–230`). This is integrity checking, permitted by brief §1.4, and had no effect (61/61). *Fix:* disclose it in the audit report.
- **m12: `pilot` and `s0-audit` are ungated after the freeze** (`main.ts:157–177`). They overwrite sealed or pinned files; the chain then fails closed, but avoidably. *Fix:* refuse them once `protocol` is sealed.
- **m13: E1's Study 8 pin check is weak.** It tests `pinText.includes(prefix)`, i.e. anywhere in the JSON and not tied to the symbol (`parity.ts:494–500`). Protocol §14.4 claims byte identity "to every earlier vintage", but only the five B5 files are checked against an external pin. *Fix:* match per symbol, and soften or extend the claim.
- **m14: The protected list can pick VGT or GDX** as its cluster's best (`s2.ts:437–447`). Both are then excluded, leaving the tech and precious-metals clusters without a protected exploratory member. *Fix:* take the best non-anchor, non-proxy member.
- **m15: Guards rest on convention, and some text is stale.** *Fix:*
  - add a verify step asserting that every `doors.jsonl` line has end ≤ 2024-12-31 and the projection root;
  - add a static check that only `door.ts` and parity N2 call `loadNUniverse`;
  - correct the `door.ts:4` comment ("scratch folder"; the code accepts `data/vintages/study9-leakage-test`);
  - remove or implement the `report` command listed in `main.ts:10`.
- **m16: Some brief items are only partly covered:** per-book episodes; rejected or skipped candidate pools with reasons (brief §2, "rejected pools"); recording the divergence of the user's `config/market-events/*` files (hashes and git diffstat only, content not read).
- **m17: Bands use the point estimate.** At n ≈ 384, a 95.0% share has a Wilson lower bound of about 92.7%. *Fix:* flag a band as "uncertain" when the Wilson bound falls below the band's lower edge.
- **m18: The recovery checkpoint is stale.** The `RESEARCH_RECOVERY.md` top screen (17:00Z, "S0 starting") predates S0, the pilot, the smoke test and the protocol draft. `README.md` and `RUN_COMMANDS.md` do not exist yet. The repository procedure requires a verified checkpoint at each milestone. *Fix:* update the checkpoint before the freeze.
- **m19: The mid and high exploratory picks are ambiguous.** "The 3 best exploratory" (mid) and "best exploratory" (high) may overlap the top-12 or top-6, giving fewer than 15 or 7 pools (`s3.ts:705`, `728`). *Fix:* state whether they are additional.

## Notes and confirmations (checked and found correct)

**Door (`door.ts:61–107`):**
- The end check precedes all I/O.
- Roots are limited to the projection and the leakage-test copy.
- The projection is a pinned, read-only byte prefix (`s0.ts:334–385`).
- The loader also trims by New York date (`lib/evaluation.ts:selectRunSessions`).
- The door id is built from the prefix hashes, splits and partitions.
- Only `door.ts` and parity N2 call `loadNUniverse`; N2's power check reads only synthetic bars.
- E1 reads the canonical bytes without any strategy computation.

**Hash keys:**
- The point-cache header binds the door id and the engine hash; keys are settings plus ordered books.
- `PointRecord` holds no data hash.
- The trace key includes the whole-file hash but lives only in memory.
- Appending bars cannot change any persisted key. N2 is a valid test of this.

**Distributions:** the fixed one-slot engine books dividends only `if (portfolio)` (`nbook/engine.ts:1005`). The door passes `emptyLedger` and `readDistributionLedger` is never reached. P3 then proves that the sealed Study 8 training figures are unaffected.

**Fitness (`design.ts:168–200`):**
- `centreView`, `nbView`, `violationOf`, `objectivesOf`, `robustProfit` and `summarize` are Study 8's.
- `floorsOf(y, 2017, 2024)` matches Study 8's search and qualify calls.
- The Q7 pass rule (net > 0 and DD < $35k) matches Study 8 §8.1.
- Radius, box and execution are imported unchanged.

**Design:**
- The box order equals the `d1Keys` order, so `gridOfGenome` equals Study 8's `genomeToParams`.
- The S1 vectors are fresh scrambled Sobol nets; no phenotype seeds them.
- Incumbents are used only by parity and the high stage, never by candidate generation.
- `latinOffsets` permutes and jitters each column independently, so a union of per-book blocks is distributed exactly as a joint k×8 Latin hypercube for one configuration. Only the cross-configuration dependence differs (M4).

**Counts and budgets:**
- `countValid` and `allValid` give V2 59, G2 59, VG2 1, VG3 59.
- Expected proposals ≈ 1,306, of which 288 are exploratory: 22% overall (25.5% outside exhaustive strata), inside the brief's 20–25%.
- At most 48 nominations; batches of at most 8 with ≤ 3 per family; Batch A's first pass gives family coverage.
- Bands are assigned only at 384 points.
- Shapley weights and the v(∅) = 0 convention are correct; the efficiency test passes.

**Comparators:** the incumbents' ranks (1, 2, 3, 8, 12, 15, 23) map to VG profit, VG balanced, VXRG, VXRKG, G, VXR and V in `FROZEN_SELECTION.json` (body hash verified). P3 targets only Study 8's training-door sealed records.

**Gates:**
- Phase predecessor and no-rerun gates exist for every stage command (subject to M9).
- S1, S2, the strata and high are write-once with atomic renames.
- No optimizer (NSGA-II or Study 8 search/qualify/test) is imported, so the stop before Phase B is respected by construction.
