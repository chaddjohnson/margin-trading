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
