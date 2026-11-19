# vgt-d1-growth-separate-pooled — Priority 2 follow-up: the separately optimized VGT D1 and Growth selections, pooled

**Status: COMPLETE.** Research only, not deployed. It is a bounded retrospective diagnostic on previously examined
history: no search, no selection, and not a new primary of Priority 2. Brief: `brief/BRIEF.md`. It adopts optimization
standard 1.0.0 (`STANDARD_ADOPTION.json`; preflight PASS).

**Result.** Priority 2's optimized D1 alone (`C24/d1only#1 top`) and optimized Growth alone
(`C24/gonly/breakout/off#1 top`) were pooled unchanged under architecture A, D1-first.

| Window | Net | DD |
|---|---:|---:|
| Development | $145,470.37 | $29,272.36 |
| Validation | +$23,858.51 | $33,522.58 (reset) |
| Full history | $169,328.88 | $34,336.64 |

- **Against the joint primary:** below it on development and the full history, with more drawdown everywhere.
- **Against the fixed incumbents:** far below D1 primary + #4 and D1 primary + 08500a60.
- **The cause:** D1's slot occupancy refused four Growth trades.
- **The sensitivities:** A and B 100/100 give identical trades under either priority. B 50/50 is exactly half of the
  two standalones, and it breaches the ceiling over the whole run ($35,524.07).

| File | Contents |
|---|---|
| `REPORT.md` | findings, answers to the brief's four questions, the funded-trade explanation, neighbourhoods, decision points before Priority 3 |
| `PROTOCOL.md` | the frozen protocol (sha256 `a8251352…5250`, frozen by the manifest) |
| `STANDARD_ADOPTION.json` | the "optimization standard read and adopted" entry (standard 1.0.0, `8c38ac15…e639d`) |
| `COMPARISON_MANIFEST.json` | the sealed manifest (`8d01c734…`): exact pair vectors, six cases, comparators, neighbourhood families; committed `63352297` before any pair evaluation |
| `AMENDMENTS.md` | E1 (a label correction in reporting only) |
| `RUN_COMMANDS.md` | every command, in order, with its unit and output |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint (top screen: COMPLETE) |
| `results/comparison.json` | sealed: six cases and 12 comparators on D24 and FULL, verification, removal, matched trades |
| `results/neighbourhood.json` | sealed: Priority 2's development instrument on the pair; the joint primary's reproduction |
| `results/ledgers/{D24,FULL}/` | lots, funding decisions and daily marks of every subject (`INDEX.md` lists them) |
| `results/tables/` | generated Markdown tables (`tools/vgt-d1-growth-separate-pooled/tables.ts`) |
| `results/charts/` | equity and drawdown charts (open in a browser) |
| `results/memory/`, `results/logs/` | 10-second memory samples and every unit's log |
| `results/seals.jsonl`, `results/doors.jsonl` | the seals and every data-door opening |

**Code.**
- `src/vgt-d1-growth-separate-pooled/` is the guarded runner. Priority 2's engine is imported unchanged:
  - `manifest.ts`: resolves the pair and seals the manifest;
  - `compare.ts`, `neighbourhood.ts`: the stages;
  - `lab.ts`, `pool.ts`, `worker.ts`: bounded execution;
  - `tests/`: the study's tests.
- Run it with `npm run vgt-pair -- <command>` from the repository root.
