# Study 9 Phase B local strategy runner (`npm run study9b-run`)

Execution tooling only. It runs **existing, sealed** D1 configurations on the local minute data through the
**unchanged** pools engine (`src/pools/run.ts` → `runNAllocator`):

- the Phase B F24 candidates (from the sealed, training-only `research/study9-phase-b/FROZEN_SELECTION.json` and the
  one-time F24 test record);
- the comparators, delegated unchanged to the Study 8 runner: Study 8 VG #2 balanced (`s8-vg-balanced`, the user's
  preferred candidate and the primary comparator), VG #1 profit (`s8-vg-profit`), every other `s8-…` alias, the frozen
  subsets, and the Study 7 runner's frozen controls (`vgt-primary` = B1, `b5-frozen` = B5, …).

Nothing is optimized, re-tuned or re-selected. No D1 rule, allocator semantics or phenotype value changes. It is a
port of the Study 8 runner (`src/study8-runners/`), whose ledger, diagnostics, export check and data-provenance helpers
it imports unchanged; Study 7's to-the-cent, lot-by-lot reconciliation is reused unchanged. Every result is
**RESEARCH ONLY — NOT DEPLOYED**.

## Commands (repository root, Node v24.21.0)

```
npm run study9b-run -- research-configs                 # once, after the sealed F24 test: writes the S9B-* pools
npm run study9b-run -- list
npm run study9b-run -- run s9b-nominee                  # the mechanical primary nominee, if any
npm run study9b-run -- run s9b-g4-eww-best
npm run study9b-run -- run s9b-vg3-iwm-profit --end 2024-12-31 --cost-bps 10 --out evaluations/my-run
npm run study9b-run -- compare s9b-g4-eww-best s9b-vg3-iwm-best s8-vg-balanced
npm run study9b-run -- compare --all
```

**Aliases:** `s9b-<track>-<profit|robust|balanced|extra1|extra2|best|1…6>`, `s9b-rank-<n>` (the sealed F24 training
rank) and `s9b-nominee`, with track `g4-ilf | g4-eww | n3-edv | n2-smh | v3-iwm | n2-edv | vg3-iwm`. `best` follows
the frozen nomination rule within the track: its top-ranked F24 role holder the one-time test did not fail. A track
whose holders all failed (N3-EDV, N2-EDV) has no `best`: the alias is refused and `compare --all` skips it. Its failed
holders stay runnable by role, rank or member, labelled T FAIL. An empty role is refused, never substituted.

**Status labels:** a Phase B alias shows its Phase B F24 T status. A delegated comparator shows its own study's
status, labelled S8 in `compare`. VG #1 profit is _pass_ under Study 8's test families but _ambiguous_ under Phase B's
(one family at 89.8%).

**Defaults:** without `--end`, the latest New York session that every file the run reads holds completely (a bar at
or after its 4:00 p.m. close; 1:00 p.m. on early-close days) — not a study end date; an explicit later or incomplete
date is refused. 5 bps **per side**, 11% simple interest (365-day year), the fixed $100,000 single slot, stops at the
stop or the gapped open, arming 2017-06-15.

**Reconciliation:** a run to 2026-10-29 at 5 bps is reconciled against the sealed Phase B F24 test record — totals
and, for role holders and controls, every funded lot (entry, exit, net, interest, costs) to the cent; other shortlist
members are compared on totals only (no sealed per-lot ledger). Any other end or cost reports **not applicable**,
never PASS. Comparators are reconciled by the Study 8 / Study 7 runners against their own sealed records.

**Outputs:** a new directory under `evaluations/study9b-runs/` (or `--out`, which must not exist; directories are
reserved atomically and never overwritten): `runner-summary.txt`, `lots.txt`, `lots.csv`, `lots.json` (field
definitions and the fields that minute OHLCV cannot supply — tick fills, commissions, order IDs — flagged, not
fabricated), `trades.csv`, `trades.json`, `signals.csv`, `daily.csv`, `monthly.csv`, `yearly.csv`, `report.txt`,
`summary.json`, `runner.json`; a compare adds `compare.md`, `compare.csv`, `compare-yearly.csv`, `compare.json`.

**Labels:** every session through 2026-10-29 was inspected before Phase B; a run past 2026-10-29 is labelled LATER
LOCAL DATA (2026-10-30 is the study's separate report-only slice), never validated or prospective.

The existing `study7-run` and `study8-run` commands are unchanged.
