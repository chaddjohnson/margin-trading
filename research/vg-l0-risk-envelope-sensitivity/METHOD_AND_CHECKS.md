# METHOD_AND_CHECKS — RES-A 1.0.0

Exact commands (from the repository root `/home/chad/projects/margin-trading`, branch
`research/vg-l0-risk-envelope-sensitivity`), what each one reads and writes, and every reproduction and parity check
with its result. Times are UTC (`date -u`). Every evaluating or replaying process ran as `node --no-maglev` with
`GPU_POLICY_PURPOSE=diagnostic`, inside the transient systemd user units of `vgl0res.slice` (MemoryHigh 44G, MemoryMax
48G, MemorySwapMax 0; `tools/vg-l0-risk-envelope-sensitivity/launch.sh`). **No GPU job was started; no official gate was
opened; nothing here is official optimization evidence** (standard 3.0.0 §9.8).

## 1. Tools (all new, all under `tools/vg-l0-risk-envelope-sensitivity/`; nothing under `src/` changed)

| File | Role | Evaluates? |
|---|---|---|
| `policies.ts` | P0–P8 as `RiskEnvelopePolicy` values for the unchanged `src/risk-envelope/policy.ts assess`; asserts the matrix of `POLICY_MATRIX.md` at import; P0 ≡ `NL0_CONTROL`, P2 ≡ `RE_EXPERIMENTAL` (same objects) | no |
| `common.ts` | paths, purpose check, JSON / CSV writers, the evaluation-refusing pool and the replay Lab over an archive **copy** | no |
| `population.ts` | S1a: replays both arms' lanes (`src/vg-l0-risk-envelope-pilot/stages.ts runLanes`, frozen) from the search-archive copy; captures every centre request and every `fitMany` call; regenerates and reads every measured rung neighbourhood; computes each policy's stage feasibility with the pilot's `violationArm` | no (0 fresh, enforced) |
| `qualification.ts` | S1b: re-runs the pilot's `qualifyMembers` from the qualification-archive copy, compares it with the sealed evidence, and reads every member's pooled confirmation (3 × 128) and selection (2 × 128) draws | no (0 fresh, enforced) |
| `analyze.ts` | S2: A1–A7 from the replays, the sealed records and G1/G2; every verdict through the pilot's `plausibleArm` / `violationArm` / `verdictOf` with the policy substituted; selectors through Assignment 2's frozen `originalOrder` / `ra1Order` and the pilot's `ra1OrderWith` | no |
| `tables.ts` | `results/TABLES.md`, `results/summary.json` from the analysis records | no |
| `cpuWorker.ts`, `cpuPool.ts` | the pilot's non-official CPU worker / pool, copied; the worker opens D21 / D24 only, through `openStudyDoor` with this study's id (logged in `results/doors.jsonl`) | CPU, diagnostic |
| `diagWorker.ts` | G2: canonical `evaluate()` record + the CPU envelope (`src/gpu-phase7/envelope.ts`) + the portfolio path and `componentDrawdown` (D3) | CPU, diagnostic |
| `replay.ts` | S3: G1 (confirmation gap fill), G2 (giveback attribution), G3 (parity sample); each fails closed on any CPU ≠ GPU difference or a cap breach | CPU, diagnostic |
| `launch.sh` | the containment wrapper (a copy of the pilot's, slice `vgl0res.slice`) | — |
| `bundle.sh` | the portable ZIP (see `READ_FIRST.md`) | — |

Typecheck: `npx tsc -p .cache/vg-l0-risk-envelope-sensitivity/tsconfig.json` (extends the root `tsconfig.json` and adds
these tools) → 0 errors.

## 2. Commands, in the order run

```
# S0 predeclaration (commit 93bc76a3, pushed before any comparative result)
npm run research-preflight -- --study research/vg-l0-risk-envelope-sensitivity          # PASS (3.0.0, diagnostic)

# archive copies (16:02Z): sha256 of each original before and after the copy, and of the copy (all equal);
# PRAGMA integrity_check = ok on each copy (node:sqlite, readOnly)
cp --preserve=timestamps research/vg-l0-risk-envelope-pilot/cache/jobs/<job>/archive.sqlite \
   .cache/vg-l0-risk-envelope-sensitivity/jobs/<job>/archive.sqlite      # <job> = C21-search C24-search C21-qualify C24-qualify

# S1a, S1b (16:06–16:07Z; zero evaluations)
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
L=/home/chad/projects/margin-trading/.cache/vg-l0-risk-envelope-sensitivity/logs
tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-pop-C21 $L/population-C21.log -- $NODE --no-maglev --max-old-space-size=16384 \
  --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-sensitivity/population.ts --cutoff C21
tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-pop-C24 $L/population-C24.log -- … population.ts --cutoff C24
tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-qual-C21 $L/qualification-C21.log -- $NODE --no-maglev --max-old-space-size=8192 \
  --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-sensitivity/qualification.ts --cutoff C21
tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-qual-C24 $L/qualification-C24.log -- … qualification.ts --cutoff C24

# S3 (CPU replays; 16:11–…Z)
tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-g3-C21 $L/g3-C21.log --wait -- $NODE --no-maglev --max-old-space-size=8192 \
  --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-sensitivity/replay.ts g3 --cutoff C21
tools/vg-l0-risk-envelope-sensitivity/launch.sh vgl0res-replays $L/replays.log -- /bin/bash research/vg-l0-risk-envelope-sensitivity/chains/replays.sh
#   (g3 C24 → g1 C21 → g1 C24 → g2 C21 → g2 C24, fail-fast)

# S2 (analysis; no evaluation) and the tables
GPU_POLICY_PURPOSE=diagnostic node --no-maglev --max-old-space-size=8192 --experimental-transform-types \
  --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-sensitivity/analyze.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-sensitivity/tables.ts
```

## 3. Reproduction of the pilot (A1) — every check passed

| # | Check | C21 | C24 |
|---|---|---|---|
| 1 | Replayed CTRL lanes = sealed lane results (envelopes stripped; `deepDiff` = 0) | 4/4 identical, 71,314 requested | 4/4 identical, 62,488 |
| 2 | Replayed EXP lanes = sealed lane results | 4/4 identical, 66,228 | 4/4 identical, 54,502 |
| 3 | Fresh evaluations in the lane replays and the neighbourhood reads | 0 (258,710 archive hits) | 0 (216,958) |
| 4 | Every measured rung neighbourhood: the fitting arm's recomputed violation = the search's own (6,837 / 5,512 rows) | all equal | all equal |
| 5 | Every sealed lane id (r2, r3, endpoints, shortlist, top-net, frontier, visible infeasible) was requested as a centre | yes | yes |
| 6 | Centre disagreement P0 / P2 over all unique centres = the pilot census (both / CTRL-only / EXP-only / neither) | 6,720 / 337 / 768 / 3,637 of 11,462 | 5,640 / 502 / 486 / 7,271 of 13,899 |
| 7 | Screen disagreement = the census | 171 / 41 / 53 / 1,783 | 23 / 16 / 7 / 2,002 |
| 8 | Rung-3 cross-assessment (fits, endpoints, shortlists under the own and the other arm) = the census | CTRL 32: 31/31/31; EXP 32: 29/17/15 | CTRL 32: 26/20/18; EXP 32: 31/30/29 |
| 9 | Qualification replay (`qualifyMembers`) = the sealed evidence (26 members; requested 16,978; 0 fresh) | identical | identical |
| 10 | Pooled confirmation / selection statistics from the read-back draws = sealed `confirm` / `select` | 26/26 | 26/26 |
| 11 | `envNbStats` of the read-back confirmation draws = the sealed envelope statistics; unrounded p10 = sealed | 26/26 | 26/26 |
| 12 | P0 verdict (pilot `verdictOf`, policy P0) = the sealed CTRL verdict (gates, failed, severity, reasons) | 26/26 | 26/26 |
| 13 | P2 verdict = the sealed EXP verdict | 26/26 | 26/26 |
| 14 | P0 rule and RA1-original on the CTRL population under P0 = the sealed CTRL primaries | yes | yes |
| 15 | P0 rule, RA1-original and RA1-adapted on the EXP population under P2 = the sealed EXP primaries | yes | yes |
| 16 | Qualified counts per arm = sealed (12/12, 11/12; 11/12, 12/12) | yes | yes |

`results/analysis-C2x.json` → `checks` lists all 114 checks per cutoff (the rows above expanded per member), every one
`pass: true`. No discrepancy had to be investigated.

## 4. Instrument cross-check (CTRL's cents versus EXP's unrounded p90)

For every one of the 52 qualification members and every policy, Q3's DD part and Q4 were evaluated with both the
cent-rounded `nbStats` p90 DD / p10 and the unrounded ones: **0 disagreements** at either cutoff (no p90 DD lies within
$0.005 of 35,000 or 40,000; no p10 near 0). The record's own `dd` and `net` are stored to the cent by the canonical
record; the envelope values are full binary64. No further rounding enters any decision.

## 5. CPU replays (G1, G2, G3) and parity

See `results/replays/` and the table in `POPULATION_AND_PROVENANCE.md` §5 for counts, runtimes and hashes. Parity rule:
the CPU record must equal the archived official GPU record **bit for bit** (`src/gpu-phase1/compare.ts deepDiff` over
the whole canonical record, including the four envelope values); any difference would stop the step (`replay.ts` throws).

| Replay | What | Parity result |
|---|---|---|
| G3 C21 | confirm-1 family (128 draws) of the sealed CTRL and EXP P0 primaries, CPU vs the official qualification archive | 256 / 256 identical |
| G3 C24 | the same | 256 / 256 identical |
| G1 C21 / C24 | centre of every gap-filled configuration, CPU vs the official search archive | every centre identical (counts in POPULATION_AND_PROVENANCE §5) |
| G2 C21 / C24 | canonical record of every attributed centre, CPU vs the official search archive; path DD = record DD to the cent; path banked DD = record envelope (1e-6) | every centre identical (counts in POPULATION_AND_PROVENANCE §5) |

## 6. What was not done

No new search, no proposal, no mutation, no parameter or threshold tuning, no new selector, no change of Q1–Q6's
non-risk gates, no D23 / FULL opening, no new interval evaluation (every interval figure is the pilot's sealed record),
no GPU job, no change under `src/`, `config/`, `docs/`, `apps/` or in the pilot's directory.
