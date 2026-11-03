# Dispositions — methodology review 1 (pre-freeze, protocol v1.0 draft)

Review: `METHODOLOGY_REVIEW_1.md` (verbatim; sha256 `bf65039e558608f51e7760360c89406ce13e1d68af26c3b902db740e832474e5`).
Written 2026-10-28 after the review and **before any momentum outcome**; all changes land in `PROTOCOL.md` v1.1,
`MECHANISM_CATALOG.json` v1.1 and the code, before `freeze-protocol`. The engine and the independent reference were
both changed and re-checked (16/16 tests, fast = reference on every adversarial path and random walk).

| # | Sev. | Disposition | Where |
|---|---|---|---|
| 1 | BLOCKER | **Accepted.** Planned count per family-history = 1,024 + 128 + 32d + 16 = 1,168 + 32d (shortlist centres are not re-evaluated); M1 panel counted separately. Caps: 16,000 per history, 80,000 total. Each history computes its planned count from its M1 gate outcomes and refuses to start if it exceeds a cap (no truncation). FP §5.6 corrected by an appended note. | P §8; `context.ts search`; FP §5.6 note |
| 2a | BLOCKER | **Accepted** (already the engine's behaviour; now written): state machines start at their first defined input from 2016-01-04; level states start OUT; a level state IN at the first decision close is a fresh signal. | CAT conventions; P §3 |
| 2b | | **Accepted** (already true: signals are position-independent). Triggers while long are ignored ("suppressed"); an E07 acceptance completing while flat is a fresh trigger. | CAT; P §3 |
| 2c | | **Accepted and implemented.** Campaign clock per type (level: state IN; event and intraday: until own OUT holds at a close; E11: permission ON). An own-OUT condition seen at a close **while long** ends the campaign even when the configuration does not exit on it. | engine `ownOutSeen`; reference `sawOut`; CAT |
| 2d | | **Accepted and implemented.** A fresh signal inside a live campaign is a re-entry of that campaign (rule `fresh`, kind `reentry`) with the new signal's references; R-rule re-entries keep the campaign's references. "First entry" = entry with no live campaign. | engine, reference, CAT |
| 2e | | **Accepted** (already implemented): the R3/R4 reference is Hc = max(raw first fill, closes held) of the most recently stopped trade. | CAT |
| 2f | | **Accepted:** R2 — a fresh signal overrides the cool-down; R5 — no entry (fresh or otherwise) while the campaign is alive; R1 — fresh only. | CAT |
| 2g | | **Accepted** (already implemented): the one-entry rule concerns the session where the entry fills; a close-decided entry after an intraday exit fills next open; an exit signal and an entry signal on the same close → exit only. | CAT; P §3 |
| 2h | | **Accepted:** R3F after OX's catastrophic stop and for every M2X exit except X7's variants; Z1/Z2 tranches are not entries. | CAT |
| 2i | | **Accepted:** a level family's own OUT is the state being OUT at a close. | CAT |
| 3 | BLOCKER | **Accepted** with the reviewer's structure and values: materiality ($2,000), exposure-matched edge **E** against C-ALR scaled by P\*'s exposure, strict **K** (≥ +$5,000 and no worse window drawdown, all three controls), ordered labels incl. "explained by exposure". | P §11 |
| 4 | MAJOR | **Accepted:** R0 (stressed re-simulation of each sealed fold pick over its window, no re-selection: 10 bps, 14%, 25 bps stop slippage incl. gaps, +1 minute) added; r1/r6 for H's P\* labelled identity checks; R needs both H's and D's P\*; R fails if H's P\* is undefined. | P §10–§11 |
| 5 | MAJOR | **Accepted:** procedure path Π (fold picks' window marks chained, peak carried) and T(v) Π minute DD ≤ $35,000; every DD percentage is $DD / $100,000. | P §3, §11 |
| 6 | MAJOR | **Accepted** (matches the code): development net = liquidation mark at the development-end close; pending orders not executed; closed trades exclude the open lot; open lot hashed with exit (−1, −1); S5 hard check that the replay's liquidation mark at b equals the sealed development value. | P §5; S5 code |
| 7a–d | MAJOR | **Accepted** (a, b, d were already the code; written now). (c) the resting level is the maximum of active components and is never lowered, **except** X5b's promotion, whose definition is a deliberate widening (disclosed). | P §3; CAT |
| 7e | | **Rejected, with reason.** A closing print below the stop does not trigger it; the next session's gap check applies. This is the frozen D1 engine's convention (ExitManager scans minute bars only) and matches a resting stop that is live during continuous trading; it keeps D1 and momentum comparable. Disclosed as a convention (a rebound before the next open keeps the lot). | P §3 |
| 7f–g | | **Accepted and implemented:** a close-decided exit at an opening trade through the stop is labelled a gap stop (stop slippage applies); stop slippage applies to gap fills. | engine, reference |
| 8 | MAJOR | **Accepted and implemented:** E09/E10 references accumulate from the exit minute (incl. the rest of the exit session; seeded from 2017-01-03's minutes at the start) and trigger only from the next session; E10's reference starts at the exited trade's Hc, so it is a genuine new-high breakout. Expected default trigger rates are recorded by S2 on synthetic data. | engine, reference, tests |
| 9a | MAJOR | **Accepted:** S2's market-data parity is restricted to fold A's development data (≤ 2019-12-31) and records only difference counts (no net, DD or P&L); full-history parity is re-run in S7 after every seal. The D1 anchor (a registered D1 phenotype, not a momentum candidate) is reproduced on its sealed 2016–2023 record. | P §6 |
| 9b | | **Accepted:** order S4-A → S4-B → S4-C → S4-D → S4-H → S5-A..D → S6 → S7 → S8, code-enforced. | P §6; stages |
| 9c | | **Accepted:** post-freeze defect procedure (amendment, re-hashed code freeze, labelled `rerun-<n>` stages with original seeds, both records kept, verdict on the rerun). | P §12 |
| 10 | MAJOR | **Accepted:** S5 and S7 run each selected pick with R1, R2 and R0 swapped for its re-entry rule (descriptive), with first-entry vs re-entry splits and campaign economics. | P §9–§10 |
| 11 | MAJOR | **Accepted:** T(iv) is now min_F V_F ≥ −$15,000 (no fold singled out); a known-history design-bias register is added. | P §1, §11 |
| 12 | MINOR | **Accepted** (inward step for clamped OAT points, drop if still coincident; half-away-from-zero integer rounding with ≥ 1 step; local tie-break index 1024 + 32k + j; family ties by ID; boundary champions reported). | P §8; search code |
| 13 | MINOR | **Accepted in part:** g1 and feasibility = ≥ 6 closed trades **and** ≥ 3 campaigns; g2 = lots held at a close in ≥ 3 distinct calendar years (participation, not entries), which no longer excludes long holds. | P §7–§8 |
| 14 | MINOR | **Accepted:** C-AL labelled as a drifting-exposure lot; C-ALR is the always-long fixed-slot reference; C-SMA/C-DON/C-TSM × TPL defaults added as control variants; control window DDs reported next to K. | P §9; CAT |
| 15 | MINOR | **Accepted:** ledger formulas frozen (P §13). | P §13 |
| 16 | MINOR | **Accepted** (matches the code): random entries with matched entry rate, the candidate's price stops and holding periods drawn from its own distribution, own OUT unused; percentile reported as descriptive; inverted-state placebo for level families. | P §10 |
| 17 | MINOR | **Accepted and implemented:** delay per fill type (opening fill +k minutes; stop fills at the first trade ≥ trigger + k; minute entries decision + k); entry slippage on every entry fill; X6b's 0.11 is fixed (does not follow the stressed rate); the M5 output list; minute-mutation test added. | engine, reference, tests; P §10 |
| 18 | MINOR | **Accepted:** archive fields extended; Pareto report over development net, minute DD and exposure (capture is in the M4 ledger). | P §8 |
| 19 | MINOR | **Accepted:** P0 (best TPL default among M1-passing families) reported against P\*. | P §9, §11 |
| 20 | MINOR | **Accepted:** counts corrected (N-session-high rules and duplicates of exits noted), A–K table added. | FP note; `MECHANISM_SELECTION.md` |
| 21 | MINOR | **Accepted:** the protocol freeze includes FP and `MECHANISM_SELECTION.md`; the code freeze hashes the whole import closure plus `package.json`, `package-lock.json`, `tsconfig.json`; stages check `git status --porcelain` outside the study; synthetic timing recorded; checkpoint refreshed. | P §6; freeze code |
| 22 | MINOR | **Accepted:** fixed label order; study-level "insufficient evidence"; H's P\* is the candidate carried to any later stage, with the procedure's fold record as its evidence. | P §11 |
| 23 | MINOR | **Accepted:** Z1 one stop from the first tranche's raw fill; Z2 partial sales FIFO (implemented); net per borrowed dollar-day and exposure-scaled Z0 comparison. | engine; P §10 |
| 24 | MINOR | **Accepted:** "positive in ≥ 3 windows" naming, reference rates for defaults/controls, evaluation counts shown, P\*'s development net never quoted as an expectation. | P §11 |
| 25 | MINOR | **Accepted** (integer Sobol mapping floor(lo + u(hi − lo + 1)); other items already true and now written). | search code; CAT |
| 26–31 | NOTE | **Accepted as disclosures** (minute-close sampling, carried lots at b, price-only ≈ dividend yield on exposure, no significance claims, M2 after M3 as a deliberate deviation, narrowed "mirrors D1" claim). | P §12 |
