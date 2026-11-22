# Protocol RES-A 1.0.0 — Stage A read-only risk-envelope sensitivity audit (analysis plan)

Status: **predeclared** — written, hashed and committed before any comparative result of this audit was computed
(`RESEARCH_RECOVERY.md` records the commit). Afterwards it changes only through `AMENDMENTS.md` (append-only). A
retrospective, exploratory audit of the completed risk-envelope pilot: **no new genetic search, no new phenotype, no
parameter tuning, no trading-rule change, no change of the optimization standard or of NL0 1.0.0, no adoption, no
deployment, no Stage B.**

- **Study:** `research/vg-l0-risk-envelope-sensitivity/`; tools `tools/vg-l0-risk-envelope-sensitivity/` (nothing is added
  under `src/`, so no study's code manifest and no GPU compatibility manifest changes).
- **Authority:** the user's assignment `brief/BRIEF.md` (sha256
  `5a99e0e0600e674aa398cf31cd2d727e223e5e3c5bf66efcdc10e8d9080ecc43`, 198 lines, read in full to its §10 "Final instruction").
- **Standard:** `docs/research/OPTIMIZATION_STANDARD.md` **3.0.0**, sha256
  `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (registered current; read in full 2026-11-22T15:40Z),
  scope **diagnostic** (`STANDARD_ADOPTION.json`): §1, §2.1, §3.4, §5 and the report-only §2.8 apply; §4 (search) does not —
  this audit never searches. Reference method NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, sha256
  `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`), read in full; it is described, never re-executed.
- **Subject:** the completed pilot `research/vg-l0-risk-envelope-pilot/` (NL0-REP 1.0.0; `PROTOCOL.md` sha256
  `723eea5d96fb986bb3d285b62201895052d573b2e6154a6fe94e8302c5ef2e78`; `AMENDMENTS.md` head D2, sha256 `a3b0a31e9b3ec55d…`;
  `results/seals.jsonl` sha256 `5235c4891bd2251e…`; branch `research/vg-l0-risk-envelope-pilot` at `7f69d0d2`). Its outcome
  (**worse**, by its frozen rule) is not rewritten or reinterpreted; its protocol, records and seals are read-only inputs.
- **Lineage:** branch `research/vg-l0-risk-envelope-sensitivity`, created from `7f69d0d2` (the pilot's final commit, itself
  on the accepted Phase 7 lineage); never merged into `main`.

## 1. Questions

The brief's §7 questions 1–7, answered on **fixed, already-evaluated candidates**: does the 25 % banked-capital limit
(liquidation basis) remove candidates that a 30 % or 35 % limit would keep, and how do the nine policies of
`POLICY_MATRIX.md` compare on the same vectors, at the centre, at the search-stage neighbourhoods and at full Q1–Q6
qualification? What only a new optimization could determine (which regions a search under another gate would explore and
what it would select) is stated, never inferred.

## 2. Inputs (read-only)

| Input | Use |
|---|---|
| Sealed pilot records: `results/search/C2x/{CTRL,EXP}.json`, `results/qualification/C2x.json`, `results/selection/C2x.json`, `results/slices/C21-slice.json`, `results/slices/C24-validation.json`, `FROZEN_SELECTION.json`, `results/analysis/census-C2x.json`, `results/diagnostics/*.json`, `results/tables/summary.json` | lane results, qualification evidence, selections, sealed next-interval figures, earlier census and diagnostics (reproduction targets) |
| The pilot's git-ignored job archives `research/vg-l0-risk-envelope-pilot/cache/jobs/C2x-search/archive.sqlite` and `…/C2x-qualify/archive.sqlite` | every evaluated record (centre and neighbour) with its envelope — **copied** (sha256 before and after) into `.cache/vg-l0-risk-envelope-sensitivity/`; the copies are opened by the census's archive-replay method; the originals are never opened for writing |
| Assignment 3's `.sqlite.zst` populations (`.cache/vg-l0-full-joint/jobs/*`) | **not needed** if the pilot's archives answer every CTRL request (the pilot's E2 showed CTRL = Assignment 3 lane for lane, and its census replayed every CTRL request from the pilot's own archive); restored only if a gap appears (then per the storage-cleanup restoration instructions, into isolated scratch, hashes and `PRAGMA integrity_check` recorded) |
| Market data | only for the bounded CPU replays of §5, through the training doors D21 / D24 (Priority 3's verified byte-prefix doors, opened by `src/gpu-backend/doors.ts openStudyDoor` with this study's id, logged in this study's `results/doors.jsonl`). **D23 and FULL are not opened** by this audit |

## 3. The common candidate population (per cutoff)

1. **Replay** both arms' lanes from the archive copy with a pool that refuses any evaluation (the pilot census's method):
   every request must be an archive hit; the replayed lane results must equal the sealed lane results with envelopes
   stripped (`deepDiff` = 0), or the audit stops (fail closed).
2. **Capture** every centre request with provenance: arm, cell, replicate (R1/R2), lane key = seed key, stage (screen,
   rung 1 [promoted screen centres, island children, fillers], refinement start / move, rung 2, rung 3, refinement endpoint),
   the request's tag, and every `fitMany` call (rung, fidelity, whether neighbours were measured).
3. **Deduplicate** by the canonical configuration identity `cfgId` (inactive genes canonicalized), keeping every source;
   group behaviourally identical configurations by funded-lot ledger signature (reported, not merged).
4. **Classes kept apart:** archive rows (unique evaluation keys), requests (with repeats and archive hits), unique centres
   (phenotype vectors proposed as centres), unique neighbour perturbations (never candidates), fitted centres with measured
   neighbourhoods by rung, shortlist members, qualification members, qualified finalists.
5. **Candidate scope for the centre analysis:** unique centres with no error, net > 0, both families funded and a valid
   envelope ("profitable, funded, complete risk record"); the non-profitable or unfunded are counted and excluded.

## 4. Analyses (zero evaluations)

- **A1 Reproduction.** P0 and P2 centre verdicts must equal the pilot census's CTRL / EXP plausibility counts; the
  rung-3 cross-assessment must equal the census's; P0 / P2 qualification verdicts must equal the sealed CTRL / EXP
  verdicts member for member; P0 / RA1-original on each arm's own population must reproduce the sealed selections (and
  RA1-adapted the EXP ones). A discrepancy is investigated and resolved before anything else is interpreted.
- **A2 Centre level** (brief §4.1), by cutoff, cell, replicate, arm of origin (CTRL-only, EXP-only, both) and highest
  stage: counts and shares passing P0–P8; overlap matrices of every policy against P0 and against P2 (both / reference-only
  / alternative-only / neither); failure reasons and combinations; binding metric and distance; centre-net distribution
  (max, p90, median, top-10 mean) of the passing set; entries admitted by P1 but not P0; entries excluded from P1 by BD > 25 / 30 / 35 %
  and by PL > 25 %; Growth boundedness; BD > DD cases; marked-basis disagreements.
- **A3 Search-stage neighbourhoods.** For every fitted centre with a measured rung neighbourhood: its rung feasibility under
  each policy (§3 of `POLICY_MATRIX.md`), at its highest measured rung; the unmeasured gap (centres a policy admits whose
  neighbours neither arm requested — rung 1 is centre-first) is counted, never filled.
- **A4 Qualification** (brief §4.2) for every qualification member (26 per cutoff: the union of both arms' shortlists + the
  two descriptive benchmarks): Q1–Q6 per policy (centre pass / confirmation-p90 pass / overall); p50 / p90 / p95 / worst
  and worst-10 % mean of DD, PL and BD (both bases) over the 384 confirmation draws; breach counts against 35 / 40 % DD,
  25 % PL and 25 / 30 / 35 % BD with Wilson 95 % intervals; mean excess among breaches; members rescued or disqualified
  when only the banked limit changes (P2 → P3 → P4, P6 → P7 → P8); whether PL binds alone once BD is 30 / 35 %; the C24 CTRL
  winner (≈ $218,842) as the regression example.
- **A5 Counterfactual selectors** (brief §5): NL0 P0 and RA1-original on (i) each arm's own population and (ii) the
  **common population** (the union of both arms' shortlists, 24 members per cutoff; benchmarks never selectable), with
  `qualified` set by each policy; labelled *counterfactual selectors*. Selected phenotypes' sealed next-interval records
  are reported only where they exist (retrospective, previously inspected); otherwise `not evaluated`.
- **A6 Attribution** (brief §4.3): constraint effect (same vectors, policies differ), search-path effect (same policy,
  CTRL-found versus EXP-found vectors) and selection effect (same population and policy, P0 versus RA1); the pilot's Δ21 /
  Δ24 decomposed in both orders.
- **A7 Alternative-policy context** (brief §6): the pilot's sealed D1 / D2 / D3 results restated, no coefficient changed.

## 5. Bounded deterministic replays (predeclared; non-official CPU, purpose `diagnostic`; `node --no-maglev`)

Only exactly these fixed, already-evaluated configurations; no mutation, search, selection or new candidate; never
official optimization evidence; each counted, hashed and parity-checked.

- **G1 Confirmation gap fill.** Every rung-3 fit and refinement endpoint of either arm at each cutoff (the pool the
  shortlists were drawn from) that is **not** a qualification member: the frozen qualification instrument's confirmation
  family (3 × 128, labels `('confirm', rep, cutoff)`, regenerated by `src/vg-l0-full-joint/qualify.ts drawsOf / famOf`) and
  the 10 bps stress, plus the centre — enough for Q1–Q6 under every policy. Cap: 80 configurations per cutoff, 70,000
  evaluations in total. The results form an **extended descriptive set**: never selectable, never merged into the sealed
  qualification, reported separately; RA1 is not computed for them (no selection family).
- **G2 Giveback attribution.** The D3 account partition (U / E / F) and the pilot's diagnostic row (`tools/vg-l0-risk-envelope-pilot/diag-core.ts diagnose`)
  for every unique profitable, funded centre whose centre verdict differs between P0 and any of P1–P8, or between P2 and
  any of P3–P8. Cap: 8,000 centres per cutoff.
- **G3 Parity.** Every G1 / G2 CPU centre record must equal the archived GPU centre record (net, DD, lots, ledger signature
  and the four envelope values, bit for bit); a sample of 2 × 128 archived qualification-confirmation draws per cutoff is
  re-evaluated on the CPU and compared bit for bit. Any difference stops the dependent analysis and is reported.
- Resource contract: a transient systemd user unit in `vgl0res.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0),
  ≤ 12 CPU workers; no GPU job. Every replay is counted in `METHOD_AND_CHECKS.md` (requested, computed, seconds).

## 6. Decision rubric (predeclared; evidence considerations, not gates)

Margins are the pilot's ($2,500 on centre net). All statements are on the fixed common candidate set and are
**exploratory and retrospective** (the 30 % / 35 % levels were proposed after the pilot's outcome was known).

1. **"25 % BD is restrictive on these candidates"** if, at a cutoff, the best member qualified under P3 or P4 has a centre
   net more than $2,500 above the best member qualified under P2 (common population).
2. **"A relaxation improves on P0 on these candidates"** if the best member qualified under P1, P3 or P4 exceeds the best
   P0-qualified member by more than $2,500 at a cutoff, and is not more than $2,500 worse at the other.
3. **PL redundancy:** the number of centres / members that PL fails while the policy's BD passes (P3, P4, P5 versus P7, P8).
4. **Stage B** is proposed only if 1 or 2 holds at one cutoff at least, or the stage-level (A3) evidence shows the relaxed
   policy admitting stage-feasible centres more profitable than every P0-stage-feasible centre by more than $2,500;
   otherwise `STAGE_B_OPTION.md` records the rationale for not proceeding. If 1 holds but 2 does not, the audit says that
   BD 30 / 35 % removes the cost of BD 25 % without showing a gain over P0, and a Stage B would test only the search-path
   hypothesis. **The original 35 % control stays in any Stage B design.** No Stage B is run in this assignment.
5. A single favourable candidate (for example the C24 control winner) is never sufficient to choose a threshold.

## 7. Outputs

`READ_FIRST.md`, `REPORT.md`, `POLICY_MATRIX.md`, `POPULATION_AND_PROVENANCE.md`, `METHOD_AND_CHECKS.md`,
`DECISION_REGISTER.md`, `AMENDMENTS.md`, `STAGE_B_OPTION.md`, `RESEARCH_RECOVERY.md`, machine-readable tables in `results/`
(CSV / JSON), and a portable ZIP with a SHA-256 manifest, branch / commit identifiers and a reading order (no market data,
databases, caches or copied sealed archives). Written analysis and tables only (no visuals, standard §7.7).

## 8. Guards

- Never edit, re-seal, rerun or re-hash anything of the pilot, of Assignment 3, of Priority 3 or of Phase 7; never write
  into `research/vg-l0-risk-envelope-pilot/`; never modify `src/`, CUDA, `GpuPool`, `EvalLab`, `policy.ts`, the standard,
  NL0, `main` or Strategy Lab.
- No GPU job; no official gate opening; the GPU acceptance record is not touched (it stays valid on this lineage).
- No D23 / FULL opening; no broker access; no Stage B.
