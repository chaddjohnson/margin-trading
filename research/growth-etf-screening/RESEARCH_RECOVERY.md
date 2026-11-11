# RESEARCH_RECOVERY — Priority 7A: bounded Growth suitability screening across other ETFs

## Top screen

- **Updated:** 2026-11-11T21:14Z (UTC, from the clock). **Status: INCOMPLETE** — stage S3 (pilot done; freeze next).
- **Authority:** the brief `brief/BRIEF.md` (sha256 `c86c1a76…7b01`); the optimization standard 2.0.0 (`2005a88c…0105`, read
  in full 2026-11-11T20:20Z). `PROTOCOL.md` drafted (NOT yet frozen; amendments R1–R3 pre-freeze); adoption re-adopted
  at each draft edit (`npm run getf -- readopt`); preflight PASS.
- **Complete (sealed, `results/seals.jsonl`):** universe (d6267bcb…) + R1 (XLF untested) → 60 eligible; DOORS.json
  (eee86341…); TRANSFER_MANIFEST.json (9 vectors); parity.json (730 checks, 0 failed). Bench (XLK D24: ≈ 135–140 eval/s,
  CPU-bound; W = 8, K = 2). Pilot (P18; `.cache/growth-etf-screening/pilot/`): every stage path passed (ref), sizing
  (study budgets: ≈ 5,200–5,800 fresh per ETF job on D19, ≈ 30 s wall), graceful/worker/unit interruption tests and
  dup-keys (see `results/pilot/PILOT.md` once written). Unit tests 12/12.
- **Running:** the study-size interruption tests (scratch script `interrupt2.sh`; units `getf-pilot-int2-*`).
- **Next:** PILOT.md, readopt, `npm run getf -- plan`, `freeze-protocol`, commit (code + records + protocol), then the
  study chain unit `getf-chain` (RUN_COMMANDS.md; W=8 K=2).

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
