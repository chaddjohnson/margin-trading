# RESEARCH_RECOVERY — Priority 7A: bounded Growth suitability screening across other ETFs

## Top screen

- **Updated:** 2026-11-11T22:58Z (UTC, from the clock). **Status: INCOMPLETE** — stage S5 (validation next/running).
- **Authority:** brief (`c86c1a76…`); standard 2.0.0; PROTOCOL.md FROZEN (`70bda053…`, freeze committed `10aad620`);
  amendments R1–R4 (pre-freeze), A1 (post-freeze, report-only: sequential part `sliceDd` runs to 2024-12-31; use the
  fold evaluations' slice DDs).
- **Complete (sealed, 556 records verify):** C19/C21/C23 screens + selections (committed `5f115f1e`, `52504dbd`,
  `b8aace04` before their slices) + fold evaluations; sequential (universe UNSUPPORTED: net +$1,292.58, DD $57,711.81;
  own procedures supported: EEM, GDX, GLD, IAU, XHB); C24 screens; transfer lane; final selection (shortlist XHB, EEM,
  GLD; IAU substitute; near misses IAU, SMH, IWF; universe primary C24/SMH#1); diagnostics; **FROZEN_SELECTION.json**
  (sealed 22:57:21Z, committed `f07c7039` 22:57:42Z). The chain unit `getf-chain` finished (CHAIN DONE 22:57:21Z).
- **Do not rerun:** any sealed stage; FULL may open ONCE (validation).
- **Next:** `npm run getf -- launch --unit getf-validate --wait -- validate --workers 8` (FULL once; sealed
  `results/validation/validation.json`), then tables, audit-compute, REPORT.md, roadmap, checkpoint, commit, push.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/growth-etf-screening` created from `6f0ccce2`
  (Priority 6 pushed end; contains standard 2.0.0 and every reused runner). No extra worktree (user preference).
- Node v24.21.0 (`.node-version`). Host: 16 threads (Ryzen 7 9800X3D), 59 GiB RAM, swap full (vLLM, outside).
- The user's Strategy Lab server runs from this checkout (`npm run start:vpn`, server cwd `apps/strategy-lab`, started
  ≈ 20:16Z). Nothing under `apps/strategy-lab/` or `state/strategy-lab/` is touched; the branch switch changed no file.
- `npm test` (whole suite) reads post-2024 data: run only this study's synthetic tests before validation opens.

## Decisions so far (in conversation, to be written into PROTOCOL.md)

- Universe rules: reuse Study 9 S0's D1–D5 (`research/study9-etf-pool-discovery/DATA_AND_UNIVERSE_AUDIT.md`) re-checked on
  today's files: expected 61 eligible (GDXJ/OIH start 2016-05-02, XLRE misses 2 sessions → untested list).
- Engine: Priority 3's pooled engine unchanged (4A's path) with only the Growth slot enabled, the ETF's door in the slot;
  prefix doors per ETF with forward split adjustment (the explicit-file loader does not split-adjust; 11 ETFs split
  inside development). Parity vs canonical `runRiseTrading` + `summarizeSimulation` on every ETF.
- Search per ETF per cutoff: 1,024 proposals, two paired seeds × two protected cells; hard ceiling 2,000,000 fresh
  simulations in all.
