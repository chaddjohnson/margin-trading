# Parity development log (synthetic markets only; before the sealed `parity` stage)

All rounds ran on synthetic markets (`syntheticMarket(800, 41)` and `datasetOf(randomWalk(52, 760, …))`); no market
data. Times UTC from `date -u`. Only difference counts and field names are recorded.

| Round | Time | What ran | Result | Action |
|---|---|---|---|---|
| 0 | ≈ 15:30Z (before the reference existed) | rules off: Stage 1c fast vs Stage 1b fast, 1,148 runs (every cell default with mask 000, Stage 1b-keyed defaults, random vectors per exit family, controls, S1/S2/S3 schedules, stresses, both financing modes); inert-but-present rules vs the rule-less twin, 96 draws | off 0 differences; inert: 2 runs differ only in `cLevel` / `releaseEntry` (rule metadata recorded while the rule never acted) | the inert comparison excludes the per-trade rule metadata |
| 1 | 15:45Z | + fast vs the independent reference (536 runs per market: every mask × representative cells, random full-box vectors, both A fill modes, delays, slippages, costs, S1/S2/S3 × persist/reset schedules, both financing modes) | harness error: a fixed boundary date (2018-12-31) is not a session of the 760-session walk | boundary lookup made tolerant (boundaries outside the data are skipped) |
| 2 | ≈ 15:46Z | as round 1 | fast = reference: **0 differences on 536 + 536 runs**; off 0 / 0; inert: 14 runs differ only in `aChecks` (an A rule checks eligible opens without acting); coverage: no S3 conversion occurred | the inert comparison also excludes the rule counters; deterministic always-long S1/S2/S3 schedules (with rules) added to both sets so conversions occur |
| 3 | ≈ 15:46Z | as round 2 + the always-long schedules | **0 differences in every set** (off 1,151 + 1,151; inert 45 + 59; reference 539 + 539); conversions (S3 buy branch) covered | — |
| 4 | 15:47Z | after amendment A1 (fast engine: `releaseEntry` needs C ≥ 1) | **0 differences in every set** | ready for the sealed `parity` stage |

No fast-engine or reference defect was found by these rounds; the only engine change (A1 item 1) is a reading of an
ambiguous contract sentence, aligned to the reference author's reading before any outcome.
