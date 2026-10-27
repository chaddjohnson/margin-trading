# D1 standalone ETF opportunity-capture and robustness audit

A diagnostic-only audit of the **existing** standalone D1 research phenotypes of the 61 ETFs that the
ranked-preemption study optimised (`research/d1-ranked-preemption/`). It asks whether any ETF has a stronger
*historical* case than the registered VGT `primary` for robustly capturing major dip-and-recovery opportunities after
costs, compared on the identical 2016-01-04 → 2023-12-29 horizon with VGT primary, B4, B5 and C0. Nothing is
optimised, promoted or registered; every research phenotype stays research-only. The assignment is
`brief/BRIEF.md`; the frozen plan is `PROTOCOL.md` (`PROTOCOL_FREEZE.json`).

**Verdict:** see `FINAL_COMPARISON_AND_RECOMMENDATION.md`.

## Reports

| Stage | Report |
|---|---|
| A — census, evidence, parity | `ALL_61_STANDALONE_INVENTORY.md`, `SOURCE_AND_EVIDENCE_BOUNDARIES.md`, `BASELINE_AND_PARITY.md` |
| B — shortlist | `SHORTLIST_RULES_AND_CANDIDATES.md`, `SHORTLIST.json`, `reviews/methodology-review.md` (+ dispositions) |
| C — robustness | `PARAMETER_NEIGHBORHOOD_ROBUSTNESS.md`, `OPPORTUNITY_EVENT_CATALOG.md`, `OPPORTUNITY_CAPTURE_AND_TIMING.md`, `COST_AND_TAIL_RISK.md`, `YEAR_AND_REGIME_ANALYSIS.md`, `PORTFOLIO_AND_CAPITAL_EFFICIENCY.md` |
| D — chronology | `CHRONOLOGICAL_EVIDENCE_AND_SELECTION_BIAS.md` |
| Verdict and audit | `FINAL_COMPARISON_AND_RECOMMENDATION.md`, `IMPLEMENTATION_AUDIT.md`, `RESEARCH_RECOVERY.md` |

Machine-readable records: `results/inventory/` (census), `results/parity/`, `results/runs/*.jsonl` (every run, with
its specification hash, vector, figures and lots), `results/analysis.json`, and deterministic CSV ledgers in
`results/tables/` (`capture_ledger.csv`, `base_trades.csv`, `costs.csv`, `oat.csv`, `joint_vectors.csv`,
`folds.csv`); the episode catalog and families are in `results/catalog/catalog.json`, the perturbation vectors in
`results/designs/designs.json`.

## Reproducing

Node v24.21.0 (`.node-version`; e.g. `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`).
Every command runs from the repository root and reads only the local canonical data (`data/<SYMBOL>/data.csv`,
git-ignored; hashes in `results/baseline/data.sha256`). No `.env`, network, broker or download.

```sh
npm run standalone-opportunity-audit -- inventory        # Stage A census (idempotent)
npm run standalone-opportunity-audit -- parity           # 486 parity checks (≈ 2.5 min)
npm run standalone-opportunity-audit -- status           # stored versus specified runs
npm run standalone-opportunity-audit -- run --workers 8  # every frozen run not yet stored (resumable)
npm run standalone-opportunity-audit -- analyze          # results/analysis.json + CSV ledgers
npm run standalone-opportunity-audit -- report           # the Markdown reports from templates/
npm run standalone-opportunity-audit -- verify           # freeze, unchanged inputs, runs, identities
```

`shortlist`, `catalog`, `benchmark` and `freeze` are one-time pre-freeze steps and refuse to run again; `amend` records a
technical or reporting amendment in `PROTOCOL_FREEZE.json` (one exists: A1).

## Read-only views (outputs in `evaluations/standalone-opportunity-audit/`, git-ignored)

```sh
npm run standalone-opportunity-audit -- list
npm run standalone-opportunity-audit -- compare
npm run standalone-opportunity-audit -- show GDX:representative
npm run standalone-opportunity-audit -- fixed XME:representative             # research-only, to 2023-12-29
npm run standalone-opportunity-audit -- fixed XME:representative --cost-bps 10
npm run standalone-opportunity-audit -- fixed VGT-primary --portfolio
npm run standalone-opportunity-audit -- fixed VGT-primary --end 2026-10-13   # registered: full history allowed
npm run standalone-opportunity-audit -- fixed source:fold-a:XBI              # a fold vector, to 2021-12-31
```

Refused by design: `fixed XME:representative --end 2024-06-28` (research-only after 2023-12-29), `fixed
config/phenotypes/D1/GDX.json` (a registry file is not a research phenotype), `fixed source:fold-a:XBI --end
2022-01-03` (after the fold's validation end).

## Boundaries

- No file under `config/`, `data/`, an earlier `research/` study or the prospective B4/B5 freeze's code closure is
  written; the only change outside this study's two folders is one `package.json` script.
- No research phenotype is evaluated after 2023-12-29; fold vectors only through their sealed validation ends.
- Forward observations: 0. Nothing here is a forecast, a certification or a deployment.
