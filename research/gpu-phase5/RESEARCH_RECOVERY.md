# RESEARCH_RECOVERY — gpu-phase5 (parity root cause, atomic dataset cache, performance audit, acceptance, integration)

## Top screen

- **Updated:** 2026-11-20T21:14Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — stage R (root cause) running. Protocol frozen; no measured result yet.
- **Authority:** `brief/BRIEF.md` sha256 `bff746987861bd2837864af4c86ad2f2d980b386e465f0b6dfd0f12a6d221476` (224 lines,
  read in full). `PROTOCOL.md` FROZEN 2026-11-20T21:12:21Z (`results/protocol-freeze.json`, protocol sha256
  `c9ddb605181cda43b804119e3ebe0931e7494423e4ea56fd7c76beae76aa2819`); amendments: none. Standard 3.0.0 (scope
  diagnostic); preflight PASS.
- **Running:** nothing.
- **Next command:** build `tools/gpu-phase5/fresh-loop.ts` (PROTOCOL §4.4–§4.5), then launch it in `gpup5.slice`.
- **Never:** start/implement/preflight/run the risk-envelope pilot; write under `research/gpu-phase4/` or any other
  study; merge into `main` unless Q1 is RESOLVED and Q4 ACCEPTED (PROTOCOL §8); reboot or change driver/display/clock.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/gpu-phase5`** created from
  `0ac3e4e2edb782963bc64673b10347cf979305d4` (= `research/gpu-phase4` on origin, verified with `git ls-remote`
  2026-11-20T21:1xZ; `main` = `research/gpu-phase2` = `research/gpu-phase3` = `3a52cc63…` on origin). No other worktree.
  Branch to restore at the end: **`research/gpu-phase2`** (active at the start, clean).
- Node v24.21.0 (V8 13.6.233.17); units use `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Containment: `gpup5.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) via `tools/gpu-phase5/launch-slice.sh`.
- Provenance: `results/preflight/provenance.json` (binaries, pins, toolchain, data hashes, kernel-log Xid lines).
- Git-ignored: `research/gpu-phase5/{build,cache,results/raw-large,results/logs}`.
- Read-only files before any switch: 86 (study4-two-tier-d1-allocator 76, vg-d1-growth-joint 10); unchanged by the
  switch to this branch.

## Stage table

| Stage | Status | Command (repo root) | Output | Result |
|---|---|---|---|---|
| S0 provenance, reading, protocol freeze | complete | — | `results/preflight/provenance.json`, `results/protocol-freeze.json` | frozen 21:12:21Z |
| R root cause | running | see below | `results/rootcause/` | — |
| C atomic dataset export | not started | | | |
| P performance audit | not started | | | |
| A acceptance campaign | not started | | | |
| I integration or fallback | not started | | | |
| S sealed-file protection | not started | | | |
| E bundle | not started | | | |

## Findings so far (root cause; written before they are relied on)

- The record hash covers, beyond the books and pool hashes: the RC counters (`rc`), and the reductions `recordOf` /
  `riskInputsOf`. CPU side: the record comes from `evaluateDetail`, i.e. a SECOND execution of both D1 books (through
  `d1Cache2`) and two more pool runs — not from the `cache: false` execution whose books and pool are hashed. GPU side:
  the record is computed in a host worker thread from the one decoded pool, then structured-cloned to the main thread.
- Task 33 was the second task of CPU worker 8 (first chunk, tasks 32–35: deterministic assignment) and the 34th
  candidate of host worker 0's first shard: early in a fresh JavaScript context on both sides.
- `canonHash` hashes a number's raw bits; the record of task 33 has two NaN fields (`ddRecoveryT`, `topEpisodeShare`),
  both from NaN literals. V8 13.6 produces different NaN bits by source and tier for COMPUTED NaNs
  (`Math.max(0, ...[NaN])`: `fff8…` unoptimized, `7ff8…` optimized), but literal NaNs are stable; a worker-thread
  structured clone canonicalizes every NaN to `7ff8000000000000`. The CPU record hash of task 33 is `f17d66f4…` under
  seven V8 tier configurations. So NaN bits alone do not explain the event (exploratory, pre-freeze).
- Device side: `initKernel` zeroes every `GbCandOut`; the D1 state is zeroed; the RC counters are copied from it.
- Kernel log: 12 Xid 43 entries since 2026-11-18, all from test binaries during negative suites; none near the mismatch.

## Disclosures

- (none yet)
