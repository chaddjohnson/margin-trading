# AMENDMENTS — risk-envelope pilot NL0-REP (append-only)

Each entry: ID, UTC time, the change, why, which results existed, its effect. Criteria are never loosened after the
results they govern exist. Entries P1–P9 record, BEFORE the freeze and before any pilot outcome, how the authorized
protocol differs from the readiness proposal (`history/2026-11-22-readiness-proposal/PROTOCOL_PROPOSED.md`) and the
method decisions taken while implementing it. No pilot search, qualification, interval or validation result existed when
they were written (only the engineering gates' non-official checks).

- **P1 (2026-11-22, pre-freeze) — job structure.** The proposal ran each cutoff's two arms as one 8-lane job. The
  authorization requires E2 (CTRL = Assignment 3) before any official EXP evaluation. Each cutoff therefore keeps ONE job
  (`C21-search`, `C24-search`) run in two phases: the CTRL phase (new job), then — after both cutoffs' CTRL phases and
  the sealed, committed E2 record — the EXP phase (the same job resumed with its identical definition and archive). The
  EXP phase gets archive hits for evaluations the CTRL phase already made (identical screens): requested counts are
  unaffected; fresh counts are reported per phase. Effect: none on any decision (records are deterministic).
- **P2 (pre-freeze) — union qualification.** The confirmation and selection draws depend only on the cutoff (labels
  ('confirm' | 'select', rep, cutoff)), never on the arm, so a member shortlisted by both arms would receive identical
  evaluations twice. Each cutoff qualifies the union of both arms' shortlists + the two benchmarks once and assesses each
  member under both arms' gates. Legitimate de-duplication; both arms see the same evidence.
- **P3 (pre-freeze) — RA1-adapted.** Added per D-8 (refined): RA1 with S4 = 40 % of C0 in EXP, on the same population as
  original RA1 (`select.ts ra1OrderWith`, tested ≡ Assignment 2's `ra1Order` at 35 %). RA2 (an Assignment 3 secondary
  ablation) is not computed: the authorization names P0, original RA1 and adapted RA1 only.
- **P4 (pre-freeze) — budget.** The 450k stop rule is removed (D-2). The ceiling is 700,000 REQUESTED evaluations over
  search + qualification + the next intervals; the bound is computed from the frozen schedules (693,652) and enforced per
  lane (41,000), per member (653), per subject (264) and per stage (fail closed).
- **P5 (pre-freeze) — the neighbourhood statistic of each arm (RD6).** CTRL keeps Priority 3's nbStats p90 DD rounded to
  cents (Assignment 3's rule; required for E2). EXP compares the unrounded p90 of each gated metric (and the unrounded
  confirmation p10 for Q4) as the authorization requires. The two forms can differ only within $0.005 of a limit; the
  report counts any such case.
- **P6 (pre-freeze) — retained NL0 mechanics.** The violation total keeps NL0's 1e-6 rounding in both arms (D-6; CTRL =
  Assignment 3), so a total excess below 5e-7 of a limit counts as feasible in the search; plausibility and every gate
  compare exactly. The unmeasured penalty is 1 in both arms (EXP's extra neighbourhood parts are 0 when unmeasured).
- **P7 (pre-freeze) — interval content (D-12).** Per distinct primary and benchmark: the detailed centre and the centre
  with the cutoff boundary, the six frozen stresses, the training selection family 2 × 128 regenerated exactly; every one
  with the envelope (whole run). Window principal loss / banked DD and the carried lot's give-back are CPU diagnostics.
- **P8 (pre-freeze) — door order (RD8).** D24 opens for the C24 CTRL phase before the C21 selection exists (E2 precedes
  EXP); the C24 EXP phase, the qualifications and the selections follow; D23 and FULL open behind their sealed, committed
  selections; FULL once for the official validation.
- **P9 (pre-freeze) — the outcome label (PROTOCOL §15)** and the exact H1/H1′/H2/H3 definitions are precommitted.
- **D1 (disclosure, 2026-11-22T10:37:02Z, engineering only, pre-freeze).** The E3 chain (`chains/engineering.sh`) step 6
  (the SIGKILL interruption test) expected exit 137, but GNU `timeout -s KILL` reports 124 when it kills the command. The
  kill had happened (job `gpu-killed`: 615 archived rows, no result, no clean close). The script's expectation was
  corrected to accept 124 or 137, the original FAILED line is kept in `results/logs/engineering-chain.log`, and the chain
  resumed at step 7 (unit `vgl0rep-eng2`); steps 1–5 were not rerun. The killed-and-resumed run then equalled the
  uninterrupted run exactly (`results/engineering/E3/compare-killed-resumed-vs-gpu.json`). No pilot evaluation existed.
- **A1 (2026-11-22T11:10:01Z, after the freeze; a defect fix, no criterion or rule changed).** The chain's step 9 (`select --cutoff
  C21`, a non-evaluating stage) crashed in `stages.ts` `sealedEvidence`: the helper that drops per-lot rows from an
  evidence row assumed the rows were present, but the evidence it was given had been read back from the SEALED
  qualification record, where the rows had already been dropped (`risk.rows` absent, `rowsKept` present). The crash
  happened after the selection rule had been computed in memory and before anything was printed, written or sealed: no
  selection record, no selection outcome and no door opening exists. Results existing at the time: the sealed searches
  (CTRL, EXP at C21 and C24), the sealed qualifications and the sealed E2 / E2-qualification records (all unaffected: they
  were produced by the frozen code `b61f771d…` and are not re-run). Change: `sealedEvidence` is idempotent (keeps an
  existing `rowsKept`); the official guards accept the code closure's digest when it is the frozen one or the target of a
  sealed, committed code-amendment record chained from it (`results/amendments/A1.json`, written by `code-amendment`,
  listing every changed file); job identities record the frozen and the current digest; a regression test
  (`tests/static.test.ts`). No selection rule, gate, threshold, seed, schedule, budget or door changed; the selection
  functions (`select.ts`) are byte-identical. Tests after the fix: 27/27 (`results/engineering/E4/tests-after-A1.txt`).
  Effect: the chain resumes at step 9 (`START=9`); steps 1–8 are not rerun.
- **D2 (disclosure, 2026-11-22T11:26:42Z, after every official stage; a test defect, no decision affected).** The final full
  `npm test` (`results/regression/npm-test.txt`: 1,764 tests, 1,752 pass, 8 fail) showed the 7 known pre-existing
  failures and one new one: the pilot's own static test "the door guards: D23 and FULL refuse without their sealed and
  committed records" had been written for the pre-selection state (it passed at E4); after the C21 selection was sealed
  and committed the D23 guard correctly opened, so the test's expectation was stale. The test now checks the guards
  against the actual stage state (D23 opens iff the C21 selection is sealed and committed; FULL for the validation iff
  its records are committed and the validation is not sealed; FULL for diagnostics only after the sealed validation).
  Tests are outside the code digest (unchanged, `32166079…`). The pilot tests then pass 27/27
  (`results/regression/pilot-tests-after-D2.txt`); the original failing run is kept.
