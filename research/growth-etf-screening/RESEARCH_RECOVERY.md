# RESEARCH_RECOVERY — Priority 7A: bounded Growth suitability screening across other ETFs

## Top screen

- **Updated:** 2026-11-11T23:04Z (UTC, from the clock). **Status: COMPLETE** — implemented, run, validated once,
  reported; committed and pushed (see Push). **Stop for the user's review; 7B does NOT start.**
- **Authority:** brief `brief/BRIEF.md` (sha256 `c86c1a76…7b01`); optimization standard 2.0.0 (`2005a88c…0105`);
  **PROTOCOL.md FROZEN** (sha256 `70bda053f5a46e2e…`, `results/protocol-freeze.json`, committed `10aad620`
  2026-11-11T21:15:44Z); amendments R1–R4 (pre-freeze) and A1 (post-freeze, report-only).
- **Deliverables (sha256 prefixes):** `REPORT.md` (`4e8275c6…`), `FROZEN_SELECTION.json` (`bef0f80d…`, committed
  `f07c7039` before FULL), `results/validation/validation.json` (`95d61816…`, committed `8af2aeec`),
  `results/final/selection-C24.json` (`75ce0bc5…`), `results/final/diagnostics.json` (`23f21046…`),
  `results/folds/sequential.json` (`ac91dcad…`), the cutoff selections C19 `5ec4e9ce…` / C21 `77a21ad4…` / C23
  `e526578a…`, `results/archive-manifest.json` (`1873e529…`), `results/tables/*.md|csv`, `UNIVERSE_MANIFEST.json`,
  `TRANSFER_MANIFEST.json`, `results/parity/parity.json`, `results/pilot/PILOT.md`; roadmap updated
  (`docs/research/ROADMAP.md`: Priority 6 reviewed; 7A complete; 7B pending review).
- **Result (one line):** no convincing new-ETF Growth opportunity — the universe procedure was chronologically
  unsupported (sequential DD $57,711.81); the frozen shortlist XHB, EEM, GLD mostly failed 2025–2026 (only GLD passed,
  +$6,152.97, reset DD $32,933.23); recommendation: stop, or at most a narrow gold-only 7B.
- **Running:** nothing (the chain unit `getf-chain` ended with CHAIN DONE 22:57:21Z; validation 22:58:42Z).
- **Follow-up gate (the user's):** review REPORT.md; decide on 7B (stop, or the 7B-gold scope of REPORT.md §9). No merge,
  deployment or trading.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/growth-etf-screening` from `6f0ccce2` (Priority 6
  end). No worktree. Node v24.21.0. Host 16 threads / 59 GiB.
- The user's Strategy Lab server (`npm run start:vpn`, cwd `apps/strategy-lab`) ran throughout, untouched (HTTP 200 at
  23:00Z); nothing under `apps/strategy-lab/` or `state/strategy-lab/` changed.
- Canonical data unchanged (the 60 eligible files' sha256 are in the universe manifest). Doors in
  `.cache/growth-etf-screening/doors/` (8.1 GB, git-ignored, rebuildable byte for byte from the canonical files).

## Stage table (all complete; sealed records verify: `npm run getf -- verify`)

| Stage | Command (repository root) | When (UTC) | Output | Guard / resume |
|---|---|---|---|---|
| Universe + doors | `npm run getf -- universe`; `universe-r1` | 20:38–20:42Z | `UNIVERSE_MANIFEST.json`, `results/doors/DOORS.json`, R1 | sealed; refuses rerun |
| Transfer manifest | `npm run getf -- transfer-manifest` | 20:52Z | `TRANSFER_MANIFEST.json` | sealed |
| Engineering gates | `launch --unit getf-parity -- parity` | 20:53–21:01Z | `results/parity/parity.json` (730 / 0) | sealed |
| Bench, pilot, interruption tests | scratch scripts (RUN_COMMANDS.md) | 21:02–21:14Z | `.cache/growth-etf-screening/pilot/`, `results/pilot/PILOT.md` | engineering only |
| Protocol freeze | `npm run getf -- freeze-protocol` | 21:15:43Z | `results/protocol-freeze.json` | sealed, committed `10aad620` |
| Study chain | `systemd-run … chains/study.sh` (unit `getf-chain`, W=8 K=2) | 21:15:52Z–22:57:21Z | screens C19–C24, selections (committed before their slices), folds, sequential, transfers, final, diagnostics, frozen selection | each step skips sealed records; ETF jobs resume from archives |
| Validation (FULL, once) | `launch --unit getf-validate --wait -- validate --workers 8` | 22:57:52Z–22:58:42Z | `results/validation/validation.json` | sealed; FULL never reopens |
| Tables, audit | `tools/growth-etf-screening/tables.ts`; `getf -- audit-compute --write` | 22:59Z | `results/tables/`, `results/archive-manifest.json` | regenerable |

## Constants

Seeds `deriveSeed('growth-etf-screening', …)`; budgets `src/growth-etf-screening/budgets.ts` (1,024 proposals per ETF per
cutoff; worst case 6,821 per ETF job); ceiling 2,000,000 fresh simulations — **spent 1,188,014** (archive audit;
ledger 1,184,305 fresh, 94,666 hits). Windows: development 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30.

## Guards

- **Do not rerun:** any sealed stage; FULL is opened once. A 7B (if commissioned) is a new study namespace.
- **Next authorised step:** none without the user (review; 7B decision).

## Disclosures

- R1: XLF moved to the untested list before any performance screening (unadjusted 2016-09-19 special distribution).
- R3/R4: the first worker-kill and unit-kill pilot tests were void (one ended before the kill; one stopped at the
  preflight because the protocol draft was edited mid-test); all three were repeated on the final code and passed.
- A1: the sealed sequential record's per-part `sliceDd` runs to 2024-12-31; the report uses the fold evaluations' slice
  DDs; verdicts unaffected.
- The R2–R4 entries' first timestamps were estimates; they were corrected to clock-based times before the freeze.
- No recovery was needed (no compaction or interruption of the study chain).
- Verification at the end: `npm run getf -- verify` (every sealed record), the study's 12 unit tests pass, `tsc` clean,
  ESLint 0 errors on the study code; the root `npm test` (run after validation, when reading 2025–2026 data no longer
  breaks a door): 1,436 tests, 1,425 pass, **7 fail — the known pre-existing failures** (allIn/allin-original byte checks
  and the Study 7 final-door parity; 1,424 / 7 before this study's 12 tests), 4 skipped.

## Push

- `git push -u origin research/growth-etf-screening` (new branch, no force; outside the sandbox, first attempt,
  2026-11-11T23:08:17Z). `git ls-remote origin research/growth-etf-screening` = `052b1c47074da8bd…` = local HEAD (the
  report, roadmap and checkpoint commit). `main` untouched; no merge, deployment or trading. This push record follows as
  its own commit, pushed the same way.
