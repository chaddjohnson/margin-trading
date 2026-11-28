# Stage B RES-B 1.0.0: replicated, paired GPU comparison of P0 and P3

This is research only. The report is written analysis and Markdown tables; there are no visuals. Every figure comes
from a sealed record of this study (`results/seals.jsonl`, 22 sealed files, all verified) or from the tables generated
from those records:
- `results/analysis/TABLES.md`, `summary.json` and the CSV files, written by `tools/…/analyze.ts`;
- `results/analysis/SUPPLEMENT.md` and `supplement.json`, written by `tools/…/supplement.py`, with zero evaluations.

The searched histories and every next interval are **retrospective, previously inspected history**, never a pristine
holdout. Nothing here adopts P3, changes the optimization standard or NL0 1.0.0, replaces New L0 or N/original,
deploys anything or touches a broker.

## 0. Executive summary

- **The question.** Does the P3 envelope select candidates whose risk-adjusted profitability is not materially worse
  than P0's, across new paired seeds? Does it show a credible benefit in principal or banked-capital risk, or in later
  behaviour?
  - P3 is marked DD ≤ 40 % of C0, trade principal loss ≤ 25 % of funded principal, and banked-capital DD ≤ 30 % of C0
    (liquidation basis).
  - P0 is NL0's marked DD ≤ 35 % of C0.
  - The design: 2 cells × 16 new replicates (R3–R18) × 3 cutoffs, both arms on identical seeds. That is 192 official
    GPU search lanes and 96 pairs.
- **The preregistered study ran completely, in the frozen order and on the official GPU path.**
  - Every gate passed, and every fold's CTRL reproduction lanes equalled Assignment 3's sealed lanes (E2: 12/12).
  - **3,962,772 requested official evaluations**, against a deterministic bound of 8,800,278.
  - The official stages ran from 21:56Z to 23:07Z, about 71 minutes of GPU work, with 0 CPU-scored and 0 failed
    official evaluations. FULL was opened exactly once.
- **The precommitted outcome label is _P3 non-inferior and superior_** on the primary statistic (the paired lane
  difference in best qualified training-period centre net):

  | Cutoff | Pairs | Mean D | L90 | Non-inferior (L90 > −$5,000) | Superior (mean > $2,500 ∧ L90 > 0) |
  |---|---:|---:|---:|---|---|
  | C19 (secondary) | 32 | −$750 | −$2,759 | yes | no |
  | **C21 (primary)** | 32 | **+$10,729** | **+$6,276** | **yes** | **yes** |
  | **C24 (primary)** | 32 | **+$16,387** | **+$9,892** | **yes** | **yes** |

- **The gain does not come from the envelope's protections. It comes from relaxing the marked-DD ceiling from 35 % to
  40 %.**
  - The PL 25 % and BD 30 % gates almost never bound at qualification. No member qualified under P0 but not under P3,
    at any cutoff (CTRL-only = 0 of 192 at C19, C21 and C24).
  - Of the 32 EXP-30 lane representatives, 11 at C21 and 12 at C24 would fail P0. Every one fails on confirmation p90
    marked DD in ($35k, $40k], and one at each cutoff also fails on its centre and 10 bps DD. No CTRL representative
    would fail P3.
  - P3's admitted set was therefore, in practice, a superset of P0's. A higher best-qualified training net is then
    expected, partly by construction.
- **There is no credible principal or banked-capital benefit.**
  - The EXP-30 representatives' centre PL and BD (liquidation) are about equal to CTRL's. The paired means are −$184
    to +$741, and every 80 % interval includes 0.
  - Their marked DD is higher: +$1.6k to +$3.0k at the centre, and +$2.2k to +$4.6k at the confirmation p90.
  - At C21 their confirmation p90 PL is higher by +$3.2k.
  - Confirmation draws above 35 % DD rise from 2.2 % to 8.8 % at C21 and from 3.3 % to 13.2 % at C24.
- **Retrospective next intervals do not support P3.** These are precommitted, descriptive and never used to choose
  anything:
  - At C21 and C24 the paired interval-DD test fails. EXP-30 representatives' 2022–2023 and 2025–2026 drawdowns are
    larger by $2,933 and $7,180, with upper 90 % bounds of $7,113 and $9,270 against the $5,000 margin.
  - The pilot-style test on the pooled P0 primaries (T1) also fails at both cutoffs.
  - Paired interval net is +$9,329 at C19, −$4,048 at C21 and −$12,381 at C24. At C24 the 80 % interval is −$17,955
    to −$6,793.
  - The training-period profit advantage did not carry forward.
- **Recommendation.**
  - P3 passed the profit test it was given, but it merits **no adoption**. Its distinctive protections are inactive on
    this evidence, its gain comes from accepting more marked drawdown, and that drawdown showed up again, larger, on
    the following intervals.
  - Keep P0, the original NL0 method, and return to staged trailing-stop work.
  - Any follow-up would be a separate question about the marked-DD ceiling itself (35 % vs 40 %), and the
    chronological evidence here argues against it (`DECISION_REGISTER.md`).

## 1. What was run

| Item | Value |
|---|---|
| Authority | `brief/BRIEF.md`, sha256 `801f8c57…ed267f9`, 153 lines, read in full |
| Protocol | `PROTOCOL.md` RES-B 1.0.0, sha256 `603f25159bf63da5dcb6f924d3caa6ba30b8f69273abf9725ccfcb3c4f3c603a`. **Preregistered** at `59493083` (21:26:55Z, pushed), before any Stage B code existed. **Frozen** by `results/protocol-freeze.json` (sha256 `614a63d8…`, commit `2922e04d`, pushed 21:56Z) before any official evaluation. Frozen code digest `fcc20138…` |
| Amendments | before the freeze: P1 (estimated read time, a disclosure) and P2 (implementation refinements). After the official stages: D1 (window timing; census and giveback not performed) and D2 (Strategy Lab check timing). No criterion changed |
| Standard / method | optimization standard 3.0.0, scope optimization, gpu-required; NL0 1.0.0 through Assignment 3's broad lane. Departures BD1–BD4 carry the brief's agreement; adaptations BA1–BA4 |
| Lineage | branch `research/vg-l0-risk-envelope-stage-b` from Stage A's `0c2f9dd5` (pilot `7f69d0d2` → Phase 7 `fc027eed`). Acceptance record `bb0e3fcf…` (Phase 7, ACCEPTED; gb7 `cb2ff30b…`; RTX 5090 `GPU-ae5f222c…`), untouched and verified on this branch. `main` untouched |
| Arms | CTRL = P0 `nl0-control@1.0.0`. EXP-30 = P3 `sens-p3-40-25-30@1.0.0`, deep-equal to Stage A's predeclared P3. The single interpretation is `src/risk-envelope/policy.ts`: dollars on unrounded values, and a value equal to its limit passes |
| Lanes | 192 research lanes on `GA0.VA0` and `GB0.VD1` × R3–R18 × C19/C21/C24 × 2 arms. Seed key = lane key in Assignment 3's seed namespace; the arm never enters a seed. Plus 12 CTRL R1/R2 reproduction lanes (E2, never research) |
| Code | `src/vg-l0-risk-envelope-stage-b/` imports the pilot's generated lane and arm fitness **unchanged** (byte-identical to the pilot's sealed code, a test); only the arm object differs. Both arms of a cutoff run as 64 lanes in one official job |
| Order | gates → freeze → **C19** (repro, E2, search, qualify, selection committed, interval on D21) → **C21** (…, interval on D23) → **C24** (…, selection, frozen-selection manifest, FULL authorization, validation on FULL once) |

## 2. Engineering gates and parity

| Gate | Result |
|---|---|
| E1 | The Phase 7 ACCEPTED record is **VERIFIED** independently on this branch (out-of-band pin, reproducible rebuild, device). The official runner refuses a process without `--no-maglev`, and refuses a non-official purpose. GPU policy and enforcement tests pass 16/16 |
| E2 (per fold, official GPU) | The 4 CTRL R1/R2 lanes of each fold, run by the Stage B runner on the official path with the envelope requested, are **identical to Assignment 3's sealed lanes** once envelopes are stripped: C19 4/4, C21 4/4, C24 4/4. Each passed before its fold's search |
| E3 (non-official) | A mini-pilot of **both arms run concurrently** on D19: GPU = CPU in lane results, qualification evidence, lane values, the paired statistic, selections and **all 11,933 archived records with envelopes**. Graceful stop + resume and SIGKILL + resume equal the uninterrupted run. The CTRL mini lanes equal Assignment 3's own lane. **Threshold-edge subjects:** 1,500 per door on D21 and D24, from Phase 7 plus 500 Stage B subjects near BD $30k, PL $25k and DD $40k / $35k. Of these, 196 / 228 lie within $500 of BD $30k and 163 / 163 within $500 of PL $25k, each run under 2 option sets. Records, envelopes, every P0 / P3 decision and the constrained rankings are identical on GPU and CPU. The archive refuses another backend or code digest |
| E4 | 41/41 tests. They cover P3 = Stage A's P3; P3 stage wiring through the whole lane on synthetic records; exact boundaries at $30,000 BD, $25,000 PL and $40,000 DD; the denominators; invalid states failing closed; seed pairing and grouping invariance; the bound 8,800,278; the statistics; the door guards; no hidden dollar limit; and the pilot modules being byte-identical |
| E5 | The study preflight passes |
| E6 | The live official gate opens on D19, D21 and D24 (18/18 parity subjects on each) |

Each of the 12 official jobs passed the gate again and wrote its own attestation (`results/gpu-attestations/`). Every
batch carries a device receipt. The conservation invariant holds: CPU-scored 0 and failed 0 in every telemetry line.
Peak VRAM was 6.3 GB and the GPU peaked at 56 °C.

## 3. Budget and compute

| Cutoff | Stage | Requested | Fresh | Archive hits | Wall |
|---|---|---:|---:|---:|---:|
| C19 | repro (E2) | 66,697 | 66,228 | 445 | 3.0 min |
| C19 | search, 64 lanes | 1,168,140 (CTRL 571,767 / EXP-30 596,373) | 1,120,604 | 46,923 | 10.8 min |
| C19 | qualification, 194 members | 126,682 | 126,682 | 0 | 1.6 min |
| C19 | interval (D21), 67 subjects | 17,688 | 17,688 | 0 | 0.6 min |
| C21 | repro (E2) | 71,314 | 70,756 | 495 | 5.8 min |
| C21 | search | 1,184,121 (602,894 / 581,227) | 1,142,375 | 41,164 | 14.7 min |
| C21 | qualification, 194 members | 126,682 | 126,666 ¹ | 0 | 2.2 min |
| C21 | interval (D23), 66 subjects | 17,424 | 17,424 | 0 | 0.7 min |
| C24 | repro (E2) | 62,488 | 61,955 | 496 | 8.3 min |
| C24 | search | 977,430 (458,526 / 518,904) | 948,677 | 28,194 | 18.4 min |
| C24 | qualification, 194 members | 126,682 | 126,682 | 0 | 2.9 min |
| C24 | validation (FULL, once), 66 subjects | 17,424 | 17,424 | 0 | 0.8 min |
| **Total official** | | **3,962,772** (bound 8,800,278) | 3,843,161 | 117,717 | ≈ 71 min elapsed |

¹ 16 configurations recurred as draws of different members; the Lab evaluated each once (in-flight de-duplication).

The archive hits are mostly the identical screens of the paired arms.
- The largest lane requested 26,404 evaluations; the per-lane cap is 41,000.
- **Budget-bound lanes** stopped at "extension cap reached" with a trigger still firing, so they are not converged:
  C19 CTRL 0 / EXP-30 2, C21 3 / 2, C24 3 / 7.
- Throughput with 64 lanes per job was 1,808 evaluations/s on D19, 1,339 on D21 and 884 on D24. That is 4–7× the
  pilot's 4-lane rates and close to the central pre-run forecast.
- The doubled replication does not change the per-lane algorithm. It adds effort only as more replicates of the
  unchanged schedule.

## 4. The primary statistic (PROTOCOL.md §1)

- **Lane value V.** V is the highest centre net among the lane's own ≤ 3 shortlisted members that qualify under the
  lane's own arm. Qualification uses the cutoff's union evidence, so both arms face identical draws. V = $0 for a lane
  without a qualified member; there were **no such lanes** in any cutoff or arm.
- **D and its bound.** D = V(EXP-30) − V(CTRL). L90 is the 0.10 quantile of 100,000 stratified paired-bootstrap means.
  It is sealed in each selection record at selection time and recomputed identically by the analysis.

| Cutoff | Mean D | L90 | 80 % interval | D > 0 / < 0 | Mean D GA0.VA0 / GB0.VD1 | Unstratified L90 | t L90 |
|---|---:|---:|---|---|---|---:|---:|
| C19 | −$750 | −$2,759 | −$2,759 … +$1,230 | 14 / 18 | +$93 / −$1,592 | −$2,747 | −$2,829 |
| C21 | +$10,729 | +$6,276 | +$6,276 … +$15,426 | 26 / 6 | +$15,764 / +$5,695 | +$6,181 | +$5,842 |
| C24 | +$16,387 | +$9,892 | +$9,892 … +$22,780 | 23 / 9 | +$17,492 / +$15,282 | +$9,915 | +$9,691 |

The sensitivities agree with the primary bound. **Label: P3 non-inferior and superior** (C21 and C24). C19, the
secondary cutoff, is non-inferior but not superior.

Seed-level distributions of V (all 32 lanes per arm and cutoff; `pairs-C2x.csv` lists every pair):

| Cutoff | Arm | min | p25 | median | p75 | max | mean | members qualified |
|---|---|---:|---:|---:|---:|---:|---:|---|
| C19 | CTRL | $87,791 | $91,239 | $95,935 | $99,189 | $127,622 | $97,030 | 94 / 96 |
| C19 | EXP-30 | $82,515 | $91,618 | $95,008 | $100,108 | $111,862 | $96,280 | 94 / 96 |
| C21 | CTRL | $134,402 | $194,078 | $202,047 | $210,186 | $231,149 | $201,227 | 94 / 96 |
| C21 | EXP-30 | $194,612 | $203,915 | $212,014 | $218,344 | $247,284 | $211,957 | 94 / 96 |
| C24 | CTRL | $114,671 | $165,727 | $178,748 | $186,662 | $227,874 | $177,117 | 96 / 96 |
| C24 | EXP-30 | $137,647 | $179,750 | $191,582 | $209,127 | $248,578 | $193,504 | 92 / 96 |

**Precision.** The standard error of mean D came out at $1.6k (C19), $3.7k (C21) and $5.1k (C24); the pair-level SD of D was $9.0k, $21.1k and $28.9k. That matches Stage A's
power note (≈ $3–6k for 16 pairs), so the design resolves differences of roughly $10k, not $2,500. The pairs are 16
replicates of one cell schedule per cell, on one market history.

## 5. Where D comes from: eligibility versus search path (report-only; exact identities on the sealed verdicts)

| Component (mean; 80 % interval) | C19 | C21 | C24 |
|---|---|---|---|
| D | −$750 | +$10,729 | +$16,387 |
| = P3 eligibility applied to CTRL's own candidates | $0 | +$1,265 ($0 … +$2,529) | $0 |
| + search path, both judged under P3 | −$750 | +$9,465 (+$5,785 … +$13,263) | +$16,387 (+$9,793 … +$22,820) |
| other order: search path, both judged under P0 | −$1,401 | −$4,717 (−$15,891 … +$5,572) | −$11,238 (−$26,563 … +$3,351) |
| + P3 eligibility applied to EXP-30's candidates | +$651 | +$15,446 (+$7,137 … +$24,619) | +$27,625 (+$14,977 … +$41,396) |
| EXP-30 representatives that P0 would reject | 2 / 32 | 11 / 32 | 12 / 32 |
| … rejected on confirmation p90 marked DD > $35k | 2 | 11 | 12 |
| CTRL representatives that P3 would reject | 0 / 32 | 0 / 32 | 0 / 32 |
| pairs with the same representative | 0 / 32 | 0 / 32 | 0 / 32 |

The decomposition can be read in two orders.
- **Judged under P3**, the EXP-30 searches found better candidates than the CTRL searches.
- **Judged under P0**, EXP-30's own candidates are worse than CTRL's on average (C21 −$4.7k, C24 −$11.2k). The P3
  search's advantage consists largely of candidates whose confirmation p90 marked DD lies between $35,000 and $40,000:
  P3 admits them and P0 does not.
- Applying P3's eligibility to CTRL's own shortlists changes almost nothing, because CTRL's search already shortlists
  inside 35 %.
- The pilot's mechanism, in which the 25 % banked gate removed CTRL's winners, does not recur at 30 %: no CTRL
  candidate was lost to P3's PL or BD gate.

## 6. Qualification and the common-candidate counterfactual

The union qualification has 192 searched members per cutoff, every lane shortlisting 3 with no duplicate across lanes,
plus the 2 benchmarks.

| Cutoff | Both qualify | CTRL-only | EXP-30-only | Neither | Centre DD in ($35k, $40k] | … offset by PL / BD |
|---|---:|---:|---:|---:|---:|---:|
| C19 | 183 | 0 | 6 | 3 | 0 | 0 |
| C21 | 160 | 0 | 30 | 2 | 6 | 0 |
| C24 | 152 | 0 | 36 | 4 | 9 | 1 |

**Which constraints bind?** These are counts over union members; one member can fail several gates.
- CTRL fails only on drawdown: Q3 p90 DD 8 / 32 / 40 at C19 / C21 / C24, plus Q2 and Q5 DD at C21 and C24.
- EXP-30 fails Q3 p90 DD > 40 % 0 / 2 / 4 times, Q3 p90 BD > 30 % 2 / 0 / 1 times and Q3 p90 PL > 25 % 0 / 0 / 1
  times, and Q4 once at C19.
- Only **one** member at any cutoff (C24) had its 40 % DD admission offset by the PL or BD gate.

At the screen the PL and BD gates do bind often, but mostly together with DD > $40k. C24 EXP-30's leading screen
rejections are "DD > ceiling & BD > limit" (6,055) and "DD > ceiling & PL > limit & BD > limit" (1,891). Screen
plausibility, out of 16,384 identical proposals per arm, was:

| Cutoff | CTRL | EXP-30 |
|---|---:|---:|
| C19 | 3,955 | 4,456 |
| C21 | 1,702 | 2,522 |
| C24 | 244 | 390 |

The full search-archive census of every centre (`census.ts`) was **not performed** (D1).

## 7. Risk trade-offs of the selected candidates (representatives, EXP-30 − CTRL; 32 pairs each)

| Metric (mean diff; 80 % interval) | C19 | C21 | C24 |
|---|---|---|---|
| Centre marked DD | +$1,868 (+507 … +3,195) | +$1,589 (+110 … +3,076) | +$2,963 (+1,798 … +4,149) |
| Centre trade principal loss (liq.) | −$146 (−1,012 … +725) | +$294 (−411 … +1,047) | +$741 (−96 … +1,589) |
| Centre banked DD (liq.) | −$184 (−1,141 … +772) | +$118 (−614 … +860) | +$592 (−604 … +1,779) |
| Centre banked DD (marked) | −$184 | +$118 | +$593 |
| Confirmation p90 marked DD | +$2,186 | +$4,562 (+3,445 … +5,686) | +$3,568 (+2,449 … +4,704) |
| Confirmation p95 / worst-10 % mean DD | +$3,029 / +$3,038 | +$3,985 / +$3,810 | +$3,904 / +$3,645 |
| Confirmation worst DD | +$3,699 | +$2,020 | +$3,290 |
| Confirmation p90 PL (liq.) | −$371 | +$3,204 (+1,749 … +4,651) | +$957 (−165 … +2,105) |
| Confirmation p90 BD (liq.) | +$531 | +$2,324 (+694 … +3,928) | +$1,075 (−131 … +2,299) |
| Confirmation p10 net | +$3,227 | +$3,540 | +$10,464 (+2,646 … +18,251) |
| Selection robust net | +$2,571 | +$6,163 | +$10,975 (+4,329 … +17,537) |
| Occupancy | −0.6 pp | +2.3 pp | +6.5 pp (+1.4 … +11.4) |
| Lots | 0 | −2 | −5 |

Breaches over the representatives' 12,288 confirmation draws per arm and cutoff:

| Cutoff | Arm | > 35 % DD | > 40 % DD | PL > 25 % | BD > 25 % | BD > 30 % |
|---|---|---:|---:|---:|---:|---:|
| C19 | CTRL / EXP-30 | 1.7 % / 3.5 % | 0.7 % / 1.6 % | 0.0 % / 0.0 % | 2.6 % / 2.2 % | 1.3 % / 1.5 % |
| C21 | CTRL / EXP-30 | 2.2 % / 8.8 % | 0.7 % / 1.6 % | 0.3 % / 0.6 % | 3.2 % / 4.5 % | 0.8 % / 1.0 % |
| C24 | CTRL / EXP-30 | 3.3 % / 13.2 % | 1.0 % / 2.4 % | 0.1 % / 0.4 % | 5.7 % / 6.2 % | 1.4 % / 1.8 % |

- **The pattern.** P3 selections earn more in training and carry more marked drawdown. Their trade principal loss and
  banked-capital DD are about the same as P0's or slightly worse. The guarantees P3 adds (PL ≤ 25 %, BD ≤ 30 %) are
  met by P0's selections too.
- **The cost of P3's protection.** P3's protection brings no measurable extra safety here, because P0's selections
  already satisfied it. Its cost is the marked-DD allowance it came packaged with.
- **Profit giveback.** The D3 giveback partition (unbanked giveback, banked erosion, capital loss) needs a CPU path
  replay, and that replay was **not performed** (D1; `giveback.ts`). The banked-DD-minus-marked-DD contrast and the
  marked / liquidation twins above are what this report can offer instead.

## 8. Pooled-shortlist statistic and the selectors (reported beside D, never in its place)

| Cutoff | CTRL P0 primary (centre net) | EXP-30 P0 primary (centre net) | Δ (pilot's $2,500 margin) | RA1-original CTRL / EXP-30 | RA1-adapted = RA1-original |
|---|---|---|---|---|---|
| C19 | GA0.VA0/R15#1 profit ($127,622) | GB0.VD1/R10#1 profit ($111,862) | −$15,760 **worse** | GA0.VA0/R17#1 / GB0.VD1/R13#2 | yes |
| C21 | GB0.VD1/R12#1 profit ($231,149) | GA0.VA0/R13#1 profit ($247,284) | +$16,135 **better** | GB0.VD1/R5#1 / GB0.VD1/R13#1 | yes |
| C24 | GB0.VD1/R18#1 profit ($227,874) | GA0.VA0/R5#1 profit ($248,578) | +$20,703 **better** | GB0.VD1/R18#1 / GA0.VA0/R5#1 | yes |

- **The pooled statistic** depends on one extreme lane per arm. At C19 it flips sign against the paired mean.
- **RA1.** Original RA1 (S4 35 %) ran on identical candidates and draws in both arms. The descriptive RA1-adapted
  (S4 40 %) picked the same phenotype as RA1-original at every cutoff.
- **The benchmarks.** New L0 and N/original qualify under both policies at every cutoff. They are informed
  configurations: centre net $80k (C19), $251k–$252k (C21) and $383k–$388k (C24), far above every searched candidate.
  They are descriptive, never selectable.

## 9. Retrospective next intervals (previously inspected history; descriptive; precommitted tests T1–T3)

Each interval run is continuous from 2016-01-04. Interval P&L and DD reset at the cutoff close. A lane without a
qualified member would count $0, but there were none.

| Cutoff → interval | T1: P0 primaries' interval net / DD, CTRL vs EXP-30 | T1 holds | T2: mean paired interval DD diff (U90) | T2 holds | T3: mean paired interval net diff (80 %) |
|---|---|---|---|---|---|
| C19 → 2020–2021 | −$23,584 / $63,636 vs +$122,358 / $37,790 | yes | −$516 (+$3,576) | yes | +$9,329 (−$3,153 … +$21,592) |
| C21 → 2022–2023 | −$11,831 / $44,109 vs −$39,808 / $74,337 | **no** | +$2,933 (+$7,113) | **no** | −$4,048 (−$10,556 … +$2,542) |
| C24 → 2025–2026 | +$36,167 / $12,792 vs +$58,819 / $25,520 | **no** | +$7,180 (+$9,270) | **no** | −$12,381 (−$17,955 … −$6,793) |

Distributions over the 32 lane representatives per arm:

| Cutoff | Arm | Interval net mean / median | Positive | Interval DD mean / max | Whole run passes own policy | Training-nbhd draws > 35 % DD on the interval |
|---|---|---|---:|---|---:|---:|
| C19 | CTRL | $32,874 / $31,971 | 26 | $46,130 / $74,544 | 4 | 80.7 % |
| C19 | EXP-30 | $42,203 / $37,000 | 28 | $45,614 / $79,114 | 8 | 82.1 % |
| C21 | CTRL | −$10,927 / −$12,964 | 8 | $46,243 / $77,655 | 6 | 74.4 % |
| C21 | EXP-30 | −$14,975 / −$18,128 | 7 | $49,176 / $79,652 | 6 | 73.4 % |
| C24 | CTRL | $43,741 / $42,915 | 32 | $20,248 / $34,013 | 30 | 2.4 % |
| C24 | EXP-30 | $31,360 / $31,661 | 32 | $27,428 / $44,168 | 23 | 24.6 % |

- **2020–2021 and 2022–2023.** Both arms' searched candidates broke the 35 % research ceiling on most of these
  intervals. The intervals are dominated by the 2020 crash or rebound and by the 2022 bear market.
- **2025–2026.** The interval drawdown of the P3 selections averaged $7.2k more. Their training neighbourhoods breached
  35 % of C0 on the interval ten times as often (24.6 % against 2.4 %), and they earned $12.4k less on average.
- **The benchmarks** earned $171k (2020–2021), $87k–$92k (2022–2023) and $95k–$97k (2025–2026). They are informed and
  not comparable as evidence.
- **Limits of this evidence.** These intervals are correlated, previously inspected and single-history. They describe
  behaviour and select nothing. They are the only out-of-training evidence Stage B has, and on it P3 shows no
  chronological benefit and larger drawdowns at both primary cutoffs.

## 10. Historical R1/R2 context (comparison only; never in D)

The pilot's EXP lanes were searched under 40 / 25 / 25, not P3. Their 4 R1/R2 pairs per cutoff gave a mean
D (EXP P2 − CTRL P0) of +$1,770 at C21 and −$6,904 at C24. Stage A's P3 requalification of those fixed candidates
changed one CTRL lane: C24 GA0.VA0/R1 rose from $173,849 to $205,661. That is the BD-30 % rescue Stage A reported.
Stage B's 16 new pairs per cutoff replace this anecdotal view with a replicated one. Under P3 search the paired
training difference is positive, and its mechanism is the DD relaxation, not the BD level.

## 11. Limitations

- **One market history.** VGT and GDX 2016–2026, already studied many times. The cutoffs share history: C19's
  interval lies inside C21's training window, and C21's inside C24's.
- **Two cells only.** Each is 16 replicates of an unchanged cell schedule. Results may not transfer to other cells or
  to an N/original-scale search.
- **Search lanes are path-dependent** (0 / 32 shared representatives). Budget-bound lanes (2–10 per cutoff) are not
  converged. More seeds reduce sampling variability; they do not establish global optimality.
- **The superiority test is on the training-period best qualified centre net.** With CTRL-only = 0, P3's admitted set
  was in effect a superset of P0's, so a higher training maximum was expected partly mechanically. It is evidence that
  P3 does not lose profit, not evidence that P3 finds more robust phenotypes.
- **Not performed (D1):** the search-archive census and the giveback replay. **Not modelled:** account-level margin,
  taxes, market impact and whole shares.
- The thresholds are optimizer qualification limits on historical paths, **not stop losses**. A historical envelope
  pass is no guarantee of future losses.

## 12. Assessment

- **By the precommitted primary rule,** P3 is non-inferior and superior on paired training-period profit at C21 and
  C24, and non-inferior but not superior at C19.
- **By everything the brief asked to quantify beside it,** P3 is not a defensible replacement for P0:
  - its principal-loss and banked-capital gates did not bind;
  - its selections carry more marked drawdown;
  - on the retrospective intervals they showed larger drawdowns at both primary cutoffs and lower profit at C24.
- **What would be needed to argue for P3:** a separately justified decision to accept a 40 % marked-DD ceiling, with
  out-of-sample evidence that this region is not simply more drawdown. This study's chronological evidence points the
  other way.
- **Default.** Keep the original NL0 method (P0) as authoritative, and return to the staged trailing-stop work
  (`DECISION_REGISTER.md`).

## 13. Regression (final tree `a64197fd`; `results/regression/`, chain `chains/regression.sh`, 06:41–06:52Z after the sealed FULL validation)

| Suite | Result |
|---|---|
| Stage B tests | 41 / 41 |
| `npm test` (full) | 1,805 tests: 1,794 pass, 7 fail, 4 skipped. The 7 failures are exactly the **known pre-existing failures**: `allin-original.ts` ×6 (intraday-study ×1, minute-optimizer ×1, trailing-buy ×4) and Study 7's data end ×1. There is no new failure |
| root `tsc --noEmit` | 0 errors |
| study preflights (`--all`) | 27 / 27 PASS |
| sealed files (every study's `seals.jsonl`) | 1,095 sealed files, 1,041 read-only (the pilot's baseline 1,019 + Stage B's 22), 0 content differences. The 11 absent and 43 untracked are the same git-ignored caches of older studies as in the pilot's baseline |
| integrity diff since Stage A `0c2f9dd5` (outside the Stage B namespaces) | only `.gitignore` (+5) and `package.json` (3 npm scripts) |
| Strategy Lab portfolio parity | ALL VERIFIED (the five frozen pooled candidates, including New L0) |
| Strategy Lab typecheck / lint / Vitest / build (scratch directory) | pass / pass / pass / pass |
| Strategy Lab Playwright | 81 / 81 |
| Strategy Lab state / live `dist` | fingerprint identical before and after; the live `dist` untouched |

## 14. Repository and reproduction

- Branch: `research/vg-l0-risk-envelope-stage-b`, pushed; never merged.
- Commits:
  - `59493083` preregistration; `33d663d4` code and tests; `d00ba33f` engineering evidence;
  - `b5636559` gates; `2922e04d` freeze;
  - C19: `71a2e1ba` E2, `0120c686` search, `233ee626` qualification, `f9520f59` selection, `263030ce` interval;
  - C21: `af19c746`, `0df7075a`, `19f1b1eb`, `44f2c52f`, `68cdab93`;
  - C24: `2027c0a6`, `3a746d1d`, `5ff1cb06`, `43f81039`; `c963338e` frozen selection; `d171435e` FULL
    authorization; `5a661477` validation;
  - `a64197fd` analysis; then the reports and the handoff.
- **Exact commands:** `RUN_COMMANDS.md`, `EXECUTION_PLAN.md` and `chains/*.sh`. **Sealed records and their sha256:**
  `results/seals.jsonl`. **Door openings:** `results/doors.jsonl`, 61 openings, of which FULL once. **Checkpoint:**
  `RESEARCH_RECOVERY.md`.
- **Git-ignored state kept for audit:** the job archives `research/vg-l0-risk-envelope-stage-b/cache/jobs/*/
  archive.sqlite` and the engineering archives. A sealed stage refuses to rerun. The census tool replays a search from
  a copy of its archive with zero evaluations.
