# Study 8 local strategy runner

Execution tooling only. It runs **existing** D1 strategies on the local minute data through the **unchanged** pools
engine:

- the Study 8 candidates (from the sealed, training-only F24 ranking and shortlists);
- the frozen controls;
- Study 7's research references.

Nothing is optimized, re-tuned or re-selected. No D1 rule, allocator semantics or phenotype value changes.

It is a slim adapter over the Study 7 runner (`src/study7-runners/`). It reuses that runner's tested helpers unchanged:

- end and cost validation, and the data dates;
- the summary row and the reproducibility metadata;
- the to-the-cent, lot-by-lot reconciliation.

The Study 7 runner's own aliases (frozen controls, Study 7 candidates) are resolved and reconciled by that runner's
code. Its alias map is not modified.

## Prerequisites

- Node **v24.21.0** (`.node-version`); for example
  `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
- The Study 8 branch (`research/study8-expanded-regime-d1`), with the study's sealed records:
  - `research/study8-expanded-regime-d1/FROZEN_SELECTION.json`;
  - `results/test/F24/test.json` and its lot ledger;
  - the local hash chain with phase `test-F24`;
  - the research configurations `config/research-pools/study8-expanded-regime-d1/S8-<TRACK>-F24-<n>.json`.
- The runner refuses to resolve a Study 8 alias before the one-time F24 test is sealed.
- Local canonical data: `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` (git-ignored).
- Run every command from the repository root.

## Commands

```
npm run study8-run -- list
npm run study8-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
npm run study8-run -- compare <alias> <alias> … [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
npm run study8-run -- compare --all [--end …] [--cost-bps …] [--out …]
```

**Defaults:**

- `--end`: the latest New York date covered by every member's local data.
- `--cost-bps`: 5 bps per side.
- 11% simple interest; the fixed $100,000 single funded slot, no compounding.

**Unchanged from the pools engine:**

- accounting from the close of 2016-01-04 and arming on 2017-06-15;
- stops fill at the stop or the gapped open;
- shadow books; first executable signal wins; same-minute ties alphabetical.

**`compare --all`** runs `s8-g-best`, `s8-v-best`, `s8-vg-best`, `s8-vxr-best`, `s8-vxrg-best`, `s8-vxrkg-best`,
`vgt-primary` (B1) and `b5-frozen` (B5) on one identical window and friction. It refuses configurations whose
conventions differ.

**Errors.** An unknown alias or bad option exits 2; an engine, integrity or reconciliation failure exits 1.

## Aliases

| Alias                                                                 | What it is                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `s8-<track>-profit` / `-robust` / `-balanced` / `-extra1` / `-extra2` | the sealed F24 role holder of that role (an error if the role is empty: no qualified candidate)                                                                                                |
| `s8-<track>-best` | the frozen nomination rule within the track: its top-ranked F24 role holder that the one-time test did not fail; if every holder failed, its top-ranked holder; if it has none, its F24 shortlist member 1 (labelled: no role, never a nominee) |
| `s8-<track>-<n>`                                                      | the track's F24 shortlist member n (training order)                                                                                                                                            |
| `vxr-frozen`, `vxrg-frozen`                                           | B5's VGT/XBI/XRT (and GDX) books, unchanged (`config/research-pools/study8-local-runners/`)                                                                                                    |
| Study 7 runner aliases                                                | `vgt-primary` (B1), `vg-frozen`, `gdx-portfolio-aware`, `b5-frozen`, `gdx-study5-nearmiss1`, `vg-profit`, `vg-robust`, `vg-balanced`, `vxr-profit`, `gdx-profit`, `gdx-balanced`, `gdx-robust` |

`<track>` is one of `g`, `v`, `vg`, `vxr`, `vxrg`, `vxrkg`. `list` prints every alias with its F24 training rank, its
2025–2026 T-gate status, its configuration and the local data status.

**Status labels** come from the sealed records:

- A role holder whose T gates did not fail is a **research nomination**: retrospectively chronologically persistent,
  NOT DEPLOYED.
- A failed one is not a nomination.
- Shortlist members without a role are never nominees.

## Outputs

Every run writes a **new** directory, `evaluations/study8-runs/<UTC stamp>-run-<alias>/` or `…-compare/<alias>/`. It
is git-ignored and never overwritten. An existing `--out` is refused, and `research/`, `config/`, `data/` and `src/` are
refused. Each directory holds the pools engine's files:

- `report.txt`, the full funded-trade ledger;
- `trades.csv`/`trades.json`: entry and exit times and fills, exit reason, realized or open-lot mark, interest,
  friction, net, maximum adverse excursion;
- `summary.json`, `daily.csv`, `yearly.csv`, `monthly.csv`, `signals.csv`;
- `runner.json`: alias, Study 8 status, books, config and phenotype hashes, window, conventions, data hashes, the
  reconciliation and reproducibility metadata;
- `runner-summary.txt`.

A `compare` directory adds `compare.csv`, `compare.json` and `compare.md`.

The runner never writes into the study's records. In particular it does not append to the study's door log; each
run's provenance is its own `runner.json`.

## Reconciliation

A run ending on **2026-10-29 at 5 bps** is compared with the sealed Study 8 F24 test record
(`results/test/F24/test.json` and `test-lots.jsonl.gz`):

- **Role holders and the frozen VXR/VXRG controls:** totals to the cent (net, realized, unrealized, interest,
  friction, minute and daily DD, lot count) and **trade by trade**.
- **Other shortlist members:** totals only (the sealed record keeps no ledger for them).
- **Study 7 aliases:** reconciled by the Study 7 runner against Study 7's sealed final door (the same convention).

Any other window or cost is reported as **not applicable**, never as a PASS.

**All history through 2026-10-29 was inspected before Study 8.** The 2025–2026 results are a one-time retrospective
evaluation on a closed but previously inspected window, not independent validation or prospective monitoring.
