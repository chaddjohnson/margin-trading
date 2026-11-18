# RESEARCH_RECOVERY — Risk metrics and optimization methodology (pre-optimization assignment)

## Top screen

- **Updated:** 2026-11-18T05:55Z (UTC, from the clock). **Status: INCOMPLETE — Stage 3 neighbourhood replays running;
  Stages 4–7 not started.**
- **Task:** the user's brief `brief/BRIEF.md` (258 lines, 27,831 bytes, sha256 `c2eaa0e8…2657`, read in full). Analysis,
  research-only metric code, retrospective selector comparison and a proposed (unadopted) method. **No search, no new
  phenotype, no adoption, no broker, no main merge, no standard/NL0 edit.**
- **Authority:** `PROTOCOL.md` FROZEN — sha256 `0cfa32385edd7beb68a47284f9b2298d047b6a6e0022b4ce0edbcb21cbe0fb14` in
  `results/protocol-freeze.json` (sealed `331c9f54…7137`, committed `cdb87439`). Amendments: none. Standard 2.2.0
  (`0085cff2…5e24`), scope diagnostic; preflight PASS (2026-11-18T05:40Z).
- **Branch:** `research/vg-l0-risk-metrics` (main checkout, no worktree) from `67b4ae71`; commit `cdb87439` = freeze.
  Uncommitted: Stage 0 record, bundle/stops/margin/subjects/tests code, Stage 3 centres record (all intended).
- **Running:** systemd units `vgl0rm-nbhd-a` (New L0, N/original, N/RA1, L/RA1 on D24; New L0 on FULL) and
  `vgl0rm-nbhd-b` (L/original, F/original, F/RA1, B/RA1 on D24; N/original on FULL) in `vgl0rm.slice` (runtime
  MemoryHigh 44G / MemoryMax 48G / swap 0), started 05:53Z; logs `results/logs/nbhd-{a,b}.log`; each step ends with
  "end [<key> <door>] status N"; outputs sealed `results/audit/nbhd-<key>-<door>.json`. Check: `systemctl --user
  list-units 'vgl0rm-*'`, the log tails. A finished unit disappears (--collect).
- **Next step:** when both units end cleanly, Stage 4 tooling (archive exclusion analysis), then Stage 5 member replays.

## Stage table

| Stage | Status | Command (repo root) | Output / hash | Resume |
|---|---|---|---|---|
| 0 Provenance and parity | **complete, G0 PASS** | `node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-metrics/baseline.ts` | `results/baseline/parity.json` sha256 `83e610b9e1b9168a3070d3f96bfa6738fcb9730d639c2a77abddc49158bf69f8` | sealed; refuses rerun |
| 1 Metrics + tests | complete (G1: 20/20 tests) | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-risk-metrics/tests/*.test.ts` | — | rerunnable |
| 1 G-S stop gate | complete on the 51 audit subjects (1,532 price-stop exits, 0 failures; inside the centres record) | — | — | — |
| 2 Margin model | code + tests done; scenario/overlay runner not written | | | |
| 3 Candidate audit centres | **complete** (51/51 parity) | `node --max-old-space-size=16384 --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-metrics/audit.ts centres` | `results/audit/centres.json` sha256 `7a62da0e6350b63610b3856b4e4cf12cea9f22f7126a69366079cc328a8a538b` | sealed |
| 3 Neighbourhoods | **running** | `research/vg-l0-risk-metrics/chains/stage3-nbhd.sh <keys…>` in units above | `results/audit/nbhd-*.json` | a sealed file refuses rerun: rerun only the missing keys |
| 4 Pipeline audit | not started | notes: `notes/stage4-code-trace.md` (subagent trace, to be spot-checked) | | |
| 5 Selector comparison | not started | | | |
| 6 Proposed method | not started | | | |
| 7 Deliverables, QA, commit/push | not started | | | |

## Constants

- Seeds: none new; neighbourhood draws = Assignment 3's `drawsOf(cfg, famOf('select', ['select', rep, 'C24']))`.
- Budget cap 6,200 fresh simulations (PROTOCOL §10). Used so far ≈ 8 (S0) + 51 (S3 centres) + dry runs (51 + 51 + 4).

## On disk versus in memory

- Findings so far (to be written into reports from sealed records): New L0 development MDD $19,459.83 (2023-01-25 →
  2023-02-24) = $9,124.10 profit giveback (lot 27 D1·GDX) + $10,335.73 principal loss (lots 28, 29); max trade principal
  loss on development ≈ $8,093 (liquidation basis).

## Guards

- Do not edit any frozen study (`research/vg-l0-full-joint/`, `research/vg-l0-risk-families/`, 5B, NL0, the standard).
- FULL is previously examined history; opened only for fixed sealed candidates (read-only replays).
- Do not rerun sealed records; P2 rules are frozen in PROTOCOL §9 (amendment needed for any change).
- Disclosure: scratch dry runs (no records) opened D24 and FULL for engineering checks before sealing; all door
  openings by study code are in `results/doors.jsonl`.
