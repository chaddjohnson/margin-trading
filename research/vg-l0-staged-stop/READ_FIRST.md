# READ FIRST — Priority 4: staged trailing stops (S1), GPU implementation and paired optimization

**Status: COMPLETE — research only. No strategy adopted, deployed or merged; no broker access. Awaiting review.**

| | |
|---|---|
| Outcome label (precommitted, sealed) | **INCONCLUSIVE (budget)**. More than 25 % of the EXP arm's lanes were still budget-bound after the extension block at C21 and C24 (48.4 % each). The harmful rule did not fire |
| Primary effect | D̄ (EXP − CTRL best qualified training net per lane pair) +$2,340 (C19), +$6,684 (C21), +$8,761 (C24). **Not material at any fold** (threshold $10,000 with L90 > 0) |
| Risk | Non-inferior on all five preregistered metrics at every fold; none clearly worse. S1 does not reduce any finalist's DD tail |
| Attribution to S1 | **Real on the training doors** (ON representatives +$7–11k over their own all-OFF projections). **Absent afterwards** (−$1,864, +$3,099 and −$1,398 on 2020–21, 2022–23 and 2025–26) |
| Validation 2025-01-02 → 2026-10-30 (FULL, opened once; retrospective, previously inspected history) | CTRL primary +$55,308; EXP primary +$60,162, against +$75,051 for its own all-OFF projection; New L0 +$96,884; N/original +$94,670 |
| Recommendation | **Keep S1 OFF. Do not make it a Priority 5 successor optimization. Preserve New L0 and N/original unchanged** |
| Engineering | Gates E0–E5 all passed. GPU Phase 8 acceptance `c02a8a92…` ACCEPTED (159,240-subject parity, 0 mismatches), pinned out of band |
| Official GPU compute | 14,316,362 evaluations requested (14,001,785 fresh GPU), 3 h 10 min of GPU time, 25 M ceiling |

## Reading order

Paths without a leading `research/`, `src/`, `tools/`, `implementation/` or `reference/` are relative to
`research/vg-l0-staged-stop/`. Inside the ZIP, every path is under `vg-l0-staged-trailing-stop-priority4/`.

1. `research/vg-l0-staged-stop/DECISION_REGISTER.md`: every decision, the open follow-up decisions and the disclosures.
2. `research/vg-l0-staged-stop/REPORT.md`: executive report (question, hypothesis, outcomes, recommendation,
   limitations).
3. `research/vg-l0-staged-stop/reports/FINAL_COMPARISON.md`: label, candidate table, A/B/C decomposition per
   incumbent, attribution, qualified recommendation.
4. `reports/SEARCH_REPORT.md` (the paired search per fold, informed lanes I1–I4, synthesis) and `reports/RISK_REPORT.md`
   (tails, risk envelope, giveback, protection at the armed level versus realized, forfeited trends, gap and slippage
   stresses, concentration, chronology, regimes).
5. `reports/ABLATION_REPORT.md` (Stage A), `reports/IMPLEMENTATION_VERIFICATION.md` (code identity, CPU/GPU verification,
   Phase 8 acceptance, in-study checks, final regression), `reports/REPRODUCIBILITY.md` (environment, hashes, commands,
   recovery).
6. `reports/tables/`: the generated Markdown tables.
7. The frozen documents:
   - `RULE_SPECIFICATION.md` (the rule, stage state, timing, interaction matrix, exact OFF behaviour);
   - `PROTOCOL.md` (sha256 `bd57ea2a…`) and `AMENDMENTS.md`;
   - `STANDARD_ADOPTION.json`;
   - `RUN_COMMANDS.md` (exact commands);
   - `brief/BRIEF.md` (the assignment, verbatim).
8. The sealed records in `results/`:
   - search, gate-r, extend, informed, qualification, selection, decomposition, intervals, outcome;
   - `seals.jsonl` (sha256 of every sealed record: 26/26 verify) and `doors.jsonl` (every data-door opening);
   - `jobs/`, `gpu-attestations/`, `engineering/`, `logs/`.
9. `src/` and `tools/` hold the study code and report-only tools. `implementation/engine-and-gpu.patch` is the engine
   and CUDA change against the branch base, with its diffstat.
10. `research/gpu-phase8/` holds the acceptance study's evidence; `reference/` holds the unchanged inputs (standard, GPU
    docs, the trailing-stop audit's decision register and design options).
11. `IDENTITY.txt` gives the branch, the commit the ZIP was built from, and the protocol and acceptance hashes.

## Verify this bundle

```bash
cd vg-l0-staged-trailing-stop-priority4 && sha256sum -c SHA256SUMS.txt
```

## Excluded on purpose, and where they are

All of these are on the Apollo workstation and were not erased.

| Item | Location | Identity / recovery |
|---|---|---|
| Market data | `data/<SYMBOL>/` (git-ignored) | every study door pins each file's sha256 (`results/doors.jsonl`) |
| GPU job archives (≈ 64 GB, SQLite) | `research/vg-l0-staged-stop/cache/jobs/<job>/archive.sqlite` | sha256 of each in `reports/diagnostics/job-archives.sha256`; resumable through `RESUME=1` (`reports/REPRODUCIBILITY.md` §5) |
| CUDA binary | `research/gpu-phase8/build/gb8` | sha256 `86b30753813ba1cfbf53acb917405fadacfb4915b7c64357329bff28cf8428d3`; reproducible rebuild: `tools/gpu-backend/verify-acceptance.sh --rebuild` |
| Evaluation caches, benchmark and dry-run scratch | `research/vg-l0-staged-stop/cache/{bench,dryrun,lot-rows}` | not evidence; regenerable |

## Authorization boundary

- **The brief authorized** engineering, the GPU acceptance, ablations, the paired search, informed lanes, validation,
  the reports, this ZIP, and commit and push of the research branch.
- **It did not authorize** adopting a phenotype, merging into `main`, deployment, broker access, or editing frozen New L0
  / N/original research. None of these was done.
- **The follow-up decisions are the user's.** They are F1 and F2 in `DECISION_REGISTER.md`.
