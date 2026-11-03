# Study 6 — frozen five-ETF B5: neighbourhood risk audit, KRE diagnosis, and bounded phenotype improvement (2026-10-30)

**Scope:**
- The frozen B5 shared pool: VGT `primary`, XBI/XRT/KRE `lowDd`, GDX `portfolioAware`.
- One $100,000 slot, 11% interest, 5 bps per side, stops at the stop.
- History 2016-01-04 → 2026-10-29.
- **Part A** diagnosed B5 unchanged. **Part B** searched existing phenotype parameter values only, keeping all five
  ETFs, the allocator, fills, costs and sizing.
- Every period is exposed, so this is retrospective research.
- Out of scope: the actual portfolio and the VOOG/VGT margin mode.

## Answers

1. **B1** (VGT D1 alone, a distinct benchmark): **passes** the comparable gate. 100% of neighbours are below $35,000
   (p90 $28.1k–$29.1k; centre $19,534).
2. **Frozen five-ETF B5: fails** the 90%-of-neighbours / p90-below-$35k gate.
   - Centre DD $26,509.97 (26.5%): passes.
   - Joint N1 over all 40 parameters: **21.9%** below $35,000, **p90 $55,573**. Five replicates give 21.9–28.9%, the
     same on W23, W13 and W29.
   - Earlier five-ETF audits found 16–37%.
3. **KRE is the weakest book** (57.5% alone; next GDX 89.4%).
   - The driver is the **4-day maximum hold**: freezing it gives 99.1%. It is not the 29.9% entry depth, whose line is
     flat.
   - Hold 3 recreates a March-2020 slot sequence that displaces a +$37,416 GDX lot and breaches at $35,251.
   - KRE explains 56% of joint breaches. GDX/XBI/VGT re-entries in 2022–2023 explain the rest.
4. **Improvement:** no candidate passes. The predeclared go/no-go reads **"partial improvement only"**, and in
   substance there is **no credible improvement**:
   - Track K (KRE only), Track J (KRE + VGT) and Track O all fail the joint gate at validation (18.8–39.8%) and on the
     full history (21.1–35.9%).
   - Track O re-ran both original B5 methods, reproduced bit for bit.
   - Track J looked robust on development data (91–98%) and collapsed once 2022–2023 entered.
   - PBO is 0.50.
   - **No nomination.** Frozen B5 remains the benchmark and lies on the net-vs-risk Pareto frontier.
5. **Nothing is merged or deployed.** All new configurations are research-only.

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md): the two-part protocol, frozen 2026-10-30T22:41:46Z (sha256 `4e5eab24…`), before any
   perturbation; §13 holds the disclosures.
2. [DIAGNOSTIC_CHECKPOINT.md](DIAGNOSTIC_CHECKPOINT.md): Part A's locked findings (commit `1d9f6a4`, before any
   search).
3. [BASELINE_AND_B1_B5_AUDIT.md](BASELINE_AND_B1_B5_AUDIT.md): data, the 2026-10-13 / 2026-10-29 reconciliation, B1, and
   the B5 gate with the earlier audits.
4. [KRE_SENSITIVITY.md](KRE_SENSITIVITY.md): per-book, per-parameter, boundary and clipping analysis.
5. [JOINT_INTERACTIONS.md](JOINT_INTERACTIONS.md): the joint decomposition, pairs and determinants.
6. [DRAWDOWN_EVENT_LEDGER.md](DRAWDOWN_EVENT_LEDGER.md): five failure episodes with earliest divergence and exact lot
   decompositions.
7. [EXECUTION_SENSITIVITY.md](EXECUTION_SENSITIVITY.md): costs, interest, fills, years, blackouts, path checks.
8. [ORIGINAL_B5_METHOD_REPRODUCTION.md](ORIGINAL_B5_METHOD_REPRODUCTION.md): how B5 was built, the bit-for-bit
   reproductions (R-OM, P4) and Track O.
9. [OPTIMIZATION_SEARCH.md](OPTIMIZATION_SEARCH.md): Part B design, budgets, flow, results and overfitting checks.
10. [CANDIDATE_ROBUSTNESS.md](CANDIDATE_ROBUSTNESS.md): every candidate, centre against neighbourhood, Pareto
    frontiers, rejection reasons.
11. [RECOMMENDATION.md](RECOMMENDATION.md): verdicts, go/no-go, limitations.
12. [RUN_COMMANDS.md](RUN_COMMANDS.md): verified copy/paste commands with exit statuses.
13. [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md): the checkpoint.

## Records (`results/`)

| Path | Content |
|---|---|
| `protocol_freeze.json` | protocol hash, time, git state, code digest (sealed) |
| `parity/` | P1/P3/P5 (`parity.json`), P4 (`p4.json`), R-OM (`r-om.json` + `r-om/`) |
| `data/data-audit.json` | hashes, the 2026-10-13 prefixes = the B5 pins |
| `partA/` | A1–A8 sealed JSON + CSV tables (every neighbour with its parameters, net, DD, dates, signature) |
| `diagnostic_manifest.json` | the Part A lock: every record's body/file hash, 47 table hashes, code digest, data |
| `partB/` | Track K (`trackK/`), J (`trackJ/`), O (`trackO/`), `shortlist.json`, `validation.json`, `final/` (`final.json` = `confirmation.json`, `lots.csv`) |
| `../FROZEN_SELECTION.json` | the selection freeze: qualified none, roles none (sealed) |
| `doors.jsonl` | every data-door opening (window, purpose, hashes, pid) |
| `logs/` | every stage log; `logs/commands/` the verified command runs |

**Code:** `src/study6-b5-kre-robustness/`, npm script `study6`. It imports the frozen engines unchanged: `traceBook` +
`replayFixedPool`, `runNAllocator`, the Study 5 evaluator and Track 1 blocks, and the multi-etf-d1 box and probes.

**Configurations** (new names only): `config/research-pools/study6-b5-kre-robustness/S6-*.json` (13 five-ETF pools)
and `config/research-phenotypes/study6-b5-kre-robustness/D1/{KRE,VGT}.json`, each labelled
"RESEARCH ONLY — NOT NOMINATED" with its failed gates. No frozen file was edited.

## Engineering checks

- **P1:** fast replay = full N-book engine, 30 comparisons, 0 differences, including 8%/14% interest, next-open stops
  and 25 bps slippage.
- **P3:** pools CLI anchor $486,207.77 / $26,509.97 / 94 lots.
- **P5:** 8/8 earlier-audit samples to the cent.
- **P4 and R-OM:** both original B5 methods reproduced bit for bit.
- **Determinism:** `final --confirm` is identical to `final`; lot ledger sha256 `40b272da…`.
- **Minute-series reconstruction** equals the engine's tracker for frozen B5 and all 236 breach scenarios.
- **Tests:** `src/study6-b5-kre-robustness/tests/study6.test.ts` (7, synthetic) plus `src/pools/tests/*.test.ts`; see
  RUN_COMMANDS.md for the run and its result.
- `tsc --noEmit` is clean. eslint reports 0 errors in the new namespace.
- **Frozen files unchanged:** `config/pools/{B4,B5}.json`, `config/phenotypes/D1/*.json`, every earlier study's
  records, `data/`, market events.
