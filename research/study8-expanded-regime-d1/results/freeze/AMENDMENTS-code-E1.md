# Study 8 — amendments and disclosures (append-only)

Each entry states its UTC time and kind:
- **amendment:** a rule change after the freeze;
- **disclosure:** an incident or a fact the report must mention, with no rule change;
- **pre-freeze record:** written before the freeze, so the protocol still holds its content.

Each entry also states its reason and exposure. Hash chain: each entry records the sha256 of this file **before** the
entry was appended. A hash of the file after the entry cannot sit inside it. The local hash-chain head
(`results/chain.jsonl`) is copied here after each sealed phase.

## R0 — 2026-11-01T15:45Z — pre-freeze record (independent methodology review and verification)

- **Chain:** first entry (no earlier content).
- **Review:**
  - A fresh, read-only agent reviewed the draft protocol (sha256 `3c4ded12…`) and the code before the freeze. Its
    report is `reviews/METHODOLOGY_REVIEW.md` (sha256 `1a9f212a…`), verbatim.
  - It found **no critical issue**, 6 major (M1–M6), 25 minor (m1–m25) and 5 notes.
- **Verification pass:**
  - The same agent then verified the resolutions against the revised protocol (sha256 `55c29468…`) and code. Its
    report is `reviews/METHODOLOGY_REVIEW_VERIFICATION.md` (sha256 `7168464e…`), verbatim.
  - It confirmed M2–M6, found one gap in M1 (shared imported modules not pinned), two new major issues (N1: ranking
    memory at 32-D/40-D; N2: test-stage code unexercised before a test door, with statuses printed before the seal)
    and six minor notes.
- **Resolution:**
  - Every finding of both passes was resolved in the protocol and code before the freeze. `PROTOCOL.md` §13 lists each
    resolution; the protocol at the time of this entry has sha256 `22eebc37…`.
  - Only the review files' header lines (reviewer description and arrival time, taken from the session transcript)
    were corrected after the first quotation of their hashes (`b2fa75c1…`, `d3c92601…`). The reports' text is
    verbatim.
- **Pre-freeze code changes** in response to the reviews and to the author's own pre-review check:
  - `integrity.ts` (new): pins, including the transitive import closure;
  - the door-log and chain-head bindings (`records.ts`, `data.ts`);
  - the gates (`gates.ts`);
  - the freeze command, which seals both review files (`main.ts`);
  - `seal`'s door-opening count, `acknowledge-code`, and gating of the `pool` and `research-configs` commands
    (`commands.ts`);
  - dimension-scaled budgets, the lean ranking with identical order, and removal of the unused frozen-VGT fallback
    (`search.ts`, `context.ts`);
  - lite evidence, clipping mass, finite E3 and the k = 16 report-only design (`evidence.ts`);
  - non-finite violation treated as infeasible (`fitness.ts`);
  - the partial best year and NaN restored on cache reload (`evaluate.ts`);
  - training ledgers and the PBO comment (`qualify.ts`);
  - role assignment as a pure function with ledger-distinct extras, and the sealed rulebook (`select.ts`);
  - in `test.ts`:
    - the stage as a reusable pipeline with a fresh memory cache;
    - T6 and T7, every shortlist member gated, the Study 7-equivalent gates;
    - persistence, return rank, gap risk and the G-PA comparator;
    - enforced tracker and lot checks, statuses printed only after the seal, the stored `--confirm` result;
  - research-config labels for gated members (`poolrun.ts`);
  - P1 W23, P3 exact sets and W13 rows, N1 stress fills, the grid-only label, the T0 dry-run gate (`parity.ts`);
  - 12 unit tests;
  - the watchdog in `scripts/run_jobs.sh`;
  - the preserved smoke test (`results/pilot/smoke.ts`, `smoke-output.txt`).
- **Exposure:** none.
  - No search, qualification or test had run, and no economic figure of any candidate was seen.
  - The only data doors opened were the two pre-freeze `pilot-F24` openings (door log lines 1–2): the timing pilot,
    and the smoke test that printed booleans.
  - The ranking benchmark used synthetic random configurations only.
- **Disclosure (smoke test):** the smoke script imported Study 6's minute-series module from the main checkout's
  path. The file is byte-identical in both checkouts (sha256 `be94e23c…`).

## E1 — 2026-11-01T15:56Z — amendment (code fix to an engineering check; no rule, seed, threshold or data change)

- **Chain:** sha256 of this file before this entry `6a031cfcacafcce0569bb544f7833346627930c8e52cddcfdeb6796c2535600a`.
  Chain head at the time: entry 1 `protocol` `19e9913b07894adae626143e29754f404464a9810710f74d8970033aae9089a1`.
- **What happened:**
  - The first `npm run study8 -- parity` (15:46:01Z–15:55:14Z) wrote `results/parity/parity.json` with `passed: false`
    and stopped, as the protocol requires. Every gate passed except **P5**: P4, P1 (147 replay-versus-engine
    comparisons, 0 differences), P2, P3 (27/27 W29 and 27/27 W13 Study 7 rows to the cent; B5 anchors), N1 (110
    checks), C1, D1, T0 and G1.
  - P5 failed because its code read Study 7's period keys `DEV` and `VAL`, which Study 8's period list does not have
    (it names those windows `TRAIN-F21` and `TEST-F21`). The six re-run GDX controls therefore had `undefined` period
    figures.
  - Their other P5 fields matched: IDs, grids against Study 5, and minute drawdowns exactly to the dollar
    (e.g. G-PA 34,133.92 both). The registry check passed for all five books.
  - This is a defect in the check, missed when adapting Study 7's parity code; it is not an engine or provenance
    discrepancy.
- **Preserved, not deleted:**
  - attempt 1's record `results/parity/attempt-1/parity.json` (sha256 `769bf7b2…`, body `d0f05d9e09d4…`);
  - its restart-probe outputs `results/parity/attempt-1/restart/`;
  - its log `results/runlogs/parity-attempt-1.txt` (sha256 `89792d2a…`).
  - No chain phase was sealed for it.
- **Change:** `src/study8-expanded-regime-d1/parity.ts`, P5 only: the keys are `TRAIN-F21` (= Study 5's DEV,
  2017-06-15 → 2021-12-31) and `TEST-F21` (= Study 5's VAL, 2022-01-01 → 2023-12-31, the same sessions on the W23
  door). One header comment line was updated too. A diff against the frozen tarball shows only these lines. The code
  change is acknowledged in the chain as phase `code-E1`.
- **Rerun:** parity is rerun **in full**, with the original configuration and seeds, as attempt 2. It is labelled so
  in `BASELINES_AND_PARITY.md` and the checkpoint.
- **Exposure:** none. Parity reads only the frozen configurations and known anchors. No search, qualification or test
  had run.
- **Also after the freeze (tooling outside the pinned code, deciding nothing):**
  - `src/study8-runners/` (the `study8-run` adapter, its README and tests);
  - `config/research-pools/study8-local-runners/S8R-VXR-frozen.json` and `S8R-VXRG-frozen.json` (B5's books
    verbatim);
  - the `study8-run` script in `package.json`.
  - **Departure from the review note:** the adapter requires the sealed `test-F24` phase but does not append to the
    study's door log. A user run must not modify the study's records; each run's `runner.json` is its provenance.
