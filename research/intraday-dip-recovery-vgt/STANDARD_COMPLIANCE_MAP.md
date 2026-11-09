# Standard compliance map — `intraday-dip-recovery-vgt` (optimization standard 2.0.0)

Every mandatory [M], specify [S] and report-only [R] item of `docs/research/OPTIMIZATION_STANDARD.md` 2.0.0 (sha256
`2005a88c…0105`) and every requirement of the brief, mapped to where the protocol fixes it and where the evidence will
be. "n/a" items are stated with the reason (never silently skipped). Written before the freeze. The evidence files
named for later stages do not exist yet.

## 1. The standard

| § | Level | Requirement | Protocol | Evidence |
|---|---|---|---|---|
| 0.1 | — | applies: a new optimization study | §0 (scope `optimization`) | `STANDARD_ADOPTION.json` |
| 1.1 | M | development only for every choice | §3, §7, §9 | `results/doors.jsonl`; search and qualification records carry their door |
| 1.2 | M | validation only for frozen selections | §11 | `validate` guard; `results/doors.jsonl` (one FULL opening) |
| 1.3 | M S | the measured common complete endpoint, with hashes | §3 | `results/data/coverage.json` (2026-10-30) |
| 1.4 | M | freeze, seal and commit the primary, shortlist, roles, tests and perturbation families before validation | §11 | `FROZEN_SELECTION.json` + its commit; `validate` refuses an uncommitted record |
| 1.5 | M | no validation feedback | §11 | `REPORT.md`; nothing is re-searched after validation |
| 1.6 | M | "validation on previously examined history, not an untouched holdout" and the prior knowledge | §2 | `EXISTING_FINDINGS_AND_CHANGE_MAP.md` §2; `REPORT.md` |
| 1.7 | M | continuous state; validation P&L from the 2024 close; reset and whole-run DD | §3, §10, §11 | `post.ts`; `tests/post.test.ts`; `results/validation/validation.json` |
| 1.8 | M S | earlier-cutoff repeats with the same budget, own doors, committed selections, frozen verdict | §10, §7.3; departure **D1** (informed lane at C24 only, citing brief §4 and §3.3) | `results/folds/*`, `results/search/C19…C23/*`, their commits |
| 1.9 | M | only independent lanes are chronological evidence | §10, D1 | `results/folds/sequential.json` |
| 1.10 | M | report procedure failures | §10, §15 | `REPORT.md` |
| 1.11 | M | standard changes never reach an active study | pinned 2.0.0 | `STANDARD_ADOPTION.json` |
| 2.1 | M | ≤ $35,000 minute DD on one fixed $100,000; the denominator is not peak equity | §1, §9.1 | manifest `risk`; reports in dollars and % of $100,000 |
| 2.2 | M | net profit central | §1, AD1 | primary = actual profit |
| 2.3 | M S | roles with exact formulas; ranked on selection; confirmation qualifies | §9.3, AD1 | `results/qualify/*.json` `decision.roles` |
| 2.4 | M | the four-objective qualified Pareto set; promotion guard ≥ ¼ centre-profit | §1, §7.2, AD3 | `decision.pareto`; search records `stages` and promotion reasons |
| 2.5 | M S | the primary rule frozen and named | §9.3 | `FROZEN_SELECTION.json` |
| 2.6 | M | no arbitrary vetoes; evidence strength, concentration, causal removal reported | §9.1, §9.5 | `results/diagnostics/diagnostics.json` |
| 2.7 | M | combined strategies: real participation | n/a (AD5: one book; F1–F4 are alternatives) | — |
| 2.8 | R | consideration is not qualification | applies only if the user later directs consideration; three-field record (§9 of the template) | — |
| 2.9 | R | participation attribution | n/a (AD5) | — |
| 3.1 | M | exact incumbents as controls, native and harmonized | §4, §5.3 | `results/parity/parity.json` P1, P3; `results/controls/development.json` |
| 3.2 | M | informed studies keep incumbents (selectable set or fallback) | §4 (incumbent projections are selectable members) | `results/qualify/C24.json` lane `incumbent` |
| 3.3 | M | keep the lanes apart | §7.1 | separate jobs and records per lane |
| 3.4 | M S | method comparisons; no method-superiority claim from one pair | n/a (AD5); no method claim | `REPORT.md` |
| 4.1 | S | the method fits the space (Study 8 pipeline) | §7 | `search.ts` |
| 4.2 | M S | budgets in proposals and evaluations; counts reported separately | §7.3 | manifest `budget`; search records `counts`, `stages`, `counters` |
| 4.3 | M | coverage per structural class; protected strata; inactive genes; duplicate ledgers | §6, §7 | search records `coverage`, `r1DistinctLedgers`, `r1ZeroTrade` |
| 4.4 | M | both lanes; incumbents exactly representable; equivalences respected | §4, §6 | `tests/space.test.ts`; identity canonicalization |
| 4.5 | M S | the frozen extension policy; per-round hypervolume per 10,000 evaluations; stop reasons; budget ≠ convergence | §7.4 | search records `islands`, `extensionStop` |
| 4.6 | M A | the pilot sizes, never silently shrinks | §7.3 | `results/pilot/PILOT.md`; `AMENDMENTS.md` for any later change |
| 4.7 | S | protected multi-component participation | n/a (AD5) | — |
| 5.1 | M | parity, causal doors, accounting, single-family identity, stresses — sealed before search | §12 | `results/parity/parity.json` |
| 5.2 | M | optimize the funded replay; no sums of standalone trades | §5 | the engine computes the one funded book; costs in the path |
| 5.3 | M S | the perturbation specification; independent confirmation seeds; fidelities | §8, AD4 | `qualify.ts`, `space.ts` |
| 5.4 | M | local stability is not chronological reliability | §10, §15 | `REPORT.md` |
| 5.5 | M | p90 gates disclose breach frequency, mean excess, worst | §8, §9.1 | qualification `confirmation` fields |
| 5.6 | M | conventions explicit; tests of capital limits, same-instant events, independent exits, year boundaries, period DDs, open endpoints | §5.3, §12 | `tests/*.test.ts`. Partial shares and sales, and reservations, are n/a: these rules have no partial exits and there is no pool. Fractional shares are tested. |
| 5.7 | M | failures kept | §12 | `results/parity/dry-run-1-failed.txt`, `AMENDMENTS.md` |
| 5.8 | R | tail severity beside frequency | §8 | qualification `confirmation`, `small`, `wide` |
| 6.2 | M | one slice: MemoryHigh 44G, MemoryMax 48G, swap 0 | §13 | `main.ts launch`; unit logs |
| 6.3 | M | the pilot benchmarks before it chooses | §13 | `results/pilot/PILOT.md`, `bench.jsonl` |
| 6.4 | M | bounded queues, archives, checkpoints, the three interruption tests, worker failure fails, no OOM loop | §13 | `pool.ts`, `lab.ts`; `PILOT.md` §2 |
| 6.5 | S | the resource contract in the protocol and the freeze | §13 | `resources.ts`; `results/protocol-freeze.json` |
| 7.1 | M | read, adopt, preflight; `requireStandardAdoption` in code | §0 | `STANDARD_ADOPTION.json`; `results/preflight/*.txt`; `stages.ts requireFrozen` |
| 7.2 | M | the manifest's contents | §0 | `STANDARD_ADOPTION.json` |
| 7.3 | M | adaptations versus departures (departures cite the user) | §0 table | manifest `deviations` |
| 7.5 | M | the study pins its version | §0 | 2.0.0 |
| 7.7 | M | no visual artifacts | §15 | Markdown, JSON, JSONL and CSV only |

## 2. The brief

| Brief | Requirement | Protocol | Evidence |
|---|---|---|---|
| §0.1–0.3 | read and pin the current standard; template; adoption; preflight; `requireStandardAdoption` | §0 | manifest; preflight outputs; `stages.ts` |
| §0.4 | freeze before searching; append-only amendments; sealed write-once records; seals and door logs | §14 | `results/protocol-freeze.json`, `AMENDMENTS.md`, `results/seals.jsonl`, `results/doors.jsonl` |
| §0.5 | measured coverage and endpoint | §3 | `results/data/coverage.json` |
| §0.6 | local commits for freezes; push at completion | §10, §11 | git log |
| §1 | new namespaces; VGT only; fixed $100,000; one position; windows; earlier cutoffs inside development; no forced frequency or end-of-day rule; read and cite prior records | §1–§5 | `EXISTING_FINDINGS_AND_CHANGE_MAP.md` |
| §1 | controls reproduced to the cent, native and harmonized; no sealed stage rerun | §4 | parity P1, P3; controls record |
| §2.1 | F1 core: causal reference high (B = 1 included); dip X; trailing buy Y (next-trade fill); unconditional stop from the fill, ratcheted from completed minutes; same-period exits and re-entry; one position; no forced EOD exit | §5 | `engine.ts`; `tests/engine.test.ts` |
| §2.2 | H/U and continuation only in comparison families; no other features | §5.2 | `families` |
| §2.3 | the L0–L5 ladder on fixed vectors with provenance | §15 | `results/ablation/ablation.json`, `ablation.csv` |
| §2.4 | F1–F4 protected strata; inactive genes canonical; H/U inertness proven or kept | §5.2, §6 | search records per family |
| §3.1 | actual-profit primary; ≤ $35,000 DD gates; the Pareto set; Sobol/NSGA-II/rungs/refinement; ≥ 25% centre-profit promotion | §7, §9 | search and qualification records |
| §3.2 | the four roles; up to 12 distinct phenotypes (≤ 4 per family) with predeclared similarity | §9.3, §9.4 | `decision.catalog`, `catalogNeighbours` |
| §3.3 | controls; independent and informed lanes; exact incumbents; the fallback; pooled arms n/a | §4, §7.1 | records |
| §4 | C19, C21, C23, C24 repeats; byte-prefix doors; selections committed before slices; the sequential verdict; validation once | §10, §11 | folds, sequential and validation records |
| §5.1 | pilot; budgets per family, lane and fold; protected strata; the extension and stopping policy | §7, §13 | `PILOT.md`, `budgets.ts` |
| §5.2 | neighbourhood radii, distributions, fidelities, tail disclosure; no profit floors | §8, §9 | qualification records |
| §5.3 | $100,000; 11%; 5 bps (primary); a separately labelled 2-bp lane; 0/2/5/10/20 bps, 14%, next-trade stops and slippage; capacity; minute bars; the split | §5.3, §7.1 | stresses, `explore2` records, ledgers' capacity columns |
| §6 | verification gates sealed before search; the resource contract | §12, §13 | parity, `PILOT.md` |
| §7 | Markdown and machine-readable reporting only; the required tables; the verdict categories | §15 | `REPORT.md`, `REPORT_TABLES.md`, CSV/JSON |
| §8, §9 | the workflow order; the deliverables; the acceptance checklist | the whole protocol | `RESEARCH_RECOVERY.md` |
