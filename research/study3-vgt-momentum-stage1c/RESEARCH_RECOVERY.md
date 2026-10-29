# Research recovery checkpoint — Study 3, Stage 1c (D1-inspired protection for standalone VGT momentum)

## Top screen (read this first)

All times UTC (`date -u`); machine file listings show local time (CET = UTC+1). Run commands from the repository root.

- **Updated:** 2026-10-29T17:40:45Z (clock). **Status: COMPLETE — Stage 1c finished. Verdict (frozen rubric) "no demonstrated
  edge" (failed g, f, e2); nomination none. Committed and pushed: `6dbbd7edb3cc3ba7ddb71ea5cac9807f3dcfbd77` on
  `research/study3-vgt-momentum-stage1c` (new branch; `git ls-remote origin
  refs/heads/research/study3-vgt-momentum-stage1c` = `6dbbd7ed…` at 2026-10-29T17:40:31Z; upstream set). This
  checkpoint update is a follow-up commit on the same branch.**
- **Follow-up gate (needs the user's decision; nothing is authorised):** whether to run any 2024–2025 validation
  (not recommended: nothing is nominated), whether to start Stages 2–4 (VGT D1+momentum, B4+momentum, B5+momentum —
  not recommended on this evidence), a newly frozen study of A×B as a drawdown limiter against C-SMA, or the Study 4
  two-tier D1 allocator. No merge, PR or force-push was made.
- **Brief:** `brief/BRIEF.md` sha256 `c68bb4fb836b8a79945e1adae5c1fc164e008708cbbcf68dbdf3a7f2fdfedcef`.
- **Protocol freeze:** 2026-10-29T15:22:58Z, `PROTOCOL_FREEZE.json` sha256
  `540697db80f0ec5e1875671d0f211c4bc6474d126ccba28cce7a702d7334c2f0`, body `9c82742aa2777c312c5908aed4a7e404bdc197b725083331794cbcca86b8ac47`;
  binds PROTOCOL v1.2 (`192c7287…`), ENGINE_CONTRACT (`a2cdb357…`), EXPERIMENT_MATRIX v1.1 (`f86b21e7…`),
  MECHANISM_CATALOG (`f631d032…`), brief, make_matrix.py, three disposition files. **Never edit these files; changes
  only via AMENDMENTS.md.** Amendment head: **A3** (2026-10-29T17:31:45Z, post-outcome descriptive: degenerate
  C-ALZ1|reset row); A2 (17:01:56Z, C-ALR|reset); A1 (15:46:53Z, pre-outcome).
- **Code freeze:** 15:48:17Z, `results/code_freeze.json` sha256 `376330be6103c300936dc524149f8165a94e9afe398daa4084471af57e649055`,
  manifest `c0cea3914c5b1584…`, 87 files. **Do not edit any file in the manifest** (src/study3-vgt-momentum-stage1c/**,
  imported Stage 1/1b/lib files, package files). `scripts/report_tables.py` is not in the manifest.
- **Sealed records (all verify; do not rerun any stage):** audit 15:04:45Z `0a5dacef9b28d36a9fcc9cc3d7e8fe98aa3e4e4295c1d52c4046ccf1bc8a726c`;
  parity 15:48:00Z `39a39cc8bf91de5cae6b293eeaa41c74c6f2358f73d0746b1c70e28175ce4fcb`; develop-A 15:56:46Z
  `55cc82c6379b0d911ccfac2b216f094a641f0cf4aa1a9f1204b83db48506ff49`; develop-B 16:08:08Z
  `09d638bdd867c3c3677df421d3cbbf2aee95446e1c734360abbc5621698c9519`; develop-C 16:22:50Z
  `47e300a7f536f55a8ced7b795abea33a670b15922cff8ae1100f9e6dc13f25cc`; develop-D
  `690cf0c9efc8ebdd3c806fbbada0c53fff7628cdeb0ff95c4396622da1469d61`; develop-H 16:55:41Z
  `c0e541600bff0443a548be171a2568a1a51a9e66bbaad5e0d3ce0dd3eb10b576`; evaluate 16:57:06Z
  `6d697dd42c88a8b10129bc18737abe3356cc61e3665cf3827fbff1c521e293dd`; robustness 16:58:11Z
  `c9b8269f95af183b9b7d76cd8a64b7108b75c06fa43db77aca940d29711e6b87`; analysis 16:58:28Z
  `be873bd2a42811d2f125976792a487c8494aa358af2e8f8732951e1a346b4e26`. Develop archives
  (`results/payloads/develop-*/archive.jsonl.gz`) are git-ignored and exist only in this checkout.
- **INCIDENT (disclosed, PROTOCOL §1.6b):** baseline `npm test` 14:23–14:25Z in the main checkout with data present.
  Never run `npm test` in the main checkout; suite only in a data-less worktree with `--test-timeout=180000`.
- **Final data-less suite:** finished 17:12:17Z, 784 / 733 pass / 8 fail / 28 cancelled / 15 skipped (= baseline + 36
  new passing); worktree removed. `tsc --noEmit` clean, ESLint 0 errors / 7 warnings (rerun before 17:38:06Z).
- **Final audit:** independent read-only agent, received ≈17:25Z; verbatim `reviews/FINAL_AUDIT.md`; verdict supported,
  1 MAJOR + 8 MINOR reporting findings, all adopted (`reviews/FINAL_AUDIT_DISPOSITIONS.md`). Reports, README,
  IMPLEMENTATION_AUDIT §1/§4/§7, A3, `report_tables.py` (fail closed; Pareto H, DD dates, grids, ledger fills) and
  `results/tables/` (regenerated) updated; stray `research/…/research/` and `scripts/__pycache__/` deleted.
- **Running processes:** none (no worktree besides the main checkout; no agent running).
- **Next:** none — stop for the user's review. **Do not rerun any stage; do not reopen 2024–2026 data.** Deliverables:
  README.md, FINAL_COMPARISON_AND_RECOMMENDATION.md, PROTECTION_RULE_ABLATIONS.md, ENTRY_EXIT_MATRIX_AND_OPTIMIZATION.md,
  CHRONOLOGICAL_SELECTION_AND_2022.md, NEIGHBORHOODS_AND_GENERALIZATION.md, ENTRY_EXIT_REENTRY_INTERACTIONS.md,
  TRADE_LEDGER_AND_RISK.md, IMPLEMENTATION_AUDIT.md, AMENDMENTS.md (A1–A3), reviews/ (incl. FINAL_AUDIT.md and
  FINAL_AUDIT_DISPOSITIONS.md), sealed records (hashes above), regenerable `results/tables/`.

## Results so far (from sealed records; for the reports)

- **Verdict:** no demonstrated edge — failed (g) [excess ≥ +$2k in 1 window only; margin over C-SMA annual reset
  +$2,673 < $5,000; Σ excess +$10,783 passes], (f) [58.6% of 128 perturbed paths positive and ≤ $35k DD; median Σ W
  +$21,845 < 50% of Π1], (e2) [campaign giveback share 0.606 > 0.5; Σ − largest campaign +$14,312 and Σ − largest leg
  +$21,374 pass]. Passes: (a) validity, (e) evidence (10 own exits, 10 first entries in 4 windows, long 72.5%), (c)
  window DDs 23,198 / 11,086 / 22,004 / 14,170, chained 24,193, (b) Σ +51,669, (d) [2022 −6,415 vs Π1-off −46,766;
  trend windows 58,084 vs off 72,219 → retention passes], (h) all five stresses (Σ 45.9k–62.3k, DD ≤ 24.9k).
  Π-NET: risk-incompatible (DD 66,551). Π1-S2 fails b, c, g (Σ +16,664, DD 41,287); Π1-reset = Π1. Nomination: none.
- **Selection null:** Π1 at the 90th percentile of the deep random-champion null (median Σ +19,286); not
  selection-indistinguishable; 2022 at the 94th percentile.
- **Picks:** A E09|XT|rep|010 (B); B E04|XRP|rep|110 (A+B); C E09|XRP|rep|111 (A+B+C); D E02|XE|rep|010 (B);
  H E11|XRP|or|100 (A). P*-000: A E04|XN|rep, B E09|XT|rep, C E03|XRP|rep, D E02|XE|rep, H E11|XRP|or.
- **Knock-outs:** Π1-sub-110 = Π1 exactly (C inert on the verdict path); A only Σ +18,562 / DD 56,786 (2022 −48,457);
  B only Σ −4,235 / DD 71,192 (2022 −66,245); A+B Σ +51,669 / DD 24,193 → the 2022 gain is an A×B interaction, fragile:
  paired perturbed share Π1 > Π1-off only 33.6% → primary protection statement does NOT hold (ΔΣ +26,216, ΔDD
  −31,870). Procedure statement holds (Π1 vs Π-000: +68,104 / −21,824; Π-000 Σ −16,435). Fixed parent gated: 0 of 7.
  2022 statement holds (target-year-informed).
- **2022 trades (Π1):** fold-C pick entered 5 times in 2022, four exits by losing hold (−10,540, −78, −3,650, −1,487),
  last trade +6,543 at the 2023-01-03 transition; trade classes vs off: 2 off-only losers avoided (−29,381), 1 same
  entry exited earlier (−10,540 vs −21,554), 4 Π1-only (+1,328).
- **Counterfactuals on Stage 1b's Π1 (hindsight):** A15+C best 2022 (−6,193; Σ +31,482; DD 15,699); C alone blocks #12
  and #13 but re-enters later and worsens 2022 (−38,748); B10 leaves the three trades unchanged; A exits them sooner.
- **Controls:** C-ALR flat +54,502/47,576; C-SMA flat +45,729/45,036, reset +48,996/33,946; C-DON reset +32,860;
  C-TSM reset +43,577; C-STOP flat +11,141 / reset +40,216; C-AL reset +71,331/41,285.
- **Counts:** development 5,111,641 + evaluate 338 + robustness 2,619 = 5,114,598 configurations.

## Environment

- Branch `research/study3-vgt-momentum-stage1c`, created 2026-10-29T13:53Z in the main checkout (clean) from
  `2a7996ddd5585849964a795151ac7a80d56f419f` = verified `origin/research/study3-vgt-momentum-stage1b` head after
  `git fetch` (contains Stage 1b completion `70257acc…` and Stage 1 head `db6a3ec8…`). Pushed 2026-10-29T17:40Z with
  upstream `origin/research/study3-vgt-momentum-stage1c`; study commit `6dbbd7edb3cc3ba7ddb71ea5cac9807f3dcfbd77`.
- Recovery policy: `3ef43015…` is in `origin/main`, not an ancestor of the Stage 1b head, but `CLAUDE.md`
  (blob `f45cab65…`) and `docs/claude/context-recovery.md` (blob `c0c4d05e…`) are byte-identical on Stage 1b, `main` and
  the policy commit; both loaded in this session. Not repeated / not cherry-picked.
- Node v24.21.0; 16 cores; 59 GB RAM.
- Data `data/VGT/data.csv` sha256 `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` (local, git-ignored;
  same as Stage 1b).

## Inspection findings (stage 0, written before 2026-10-29T14:21Z; an earlier estimated time was corrected)

- Stage 1 lives at `research/study3-vgt-momentum/` (not `…-first-principles`); Stage 1b at
  `research/study3-vgt-momentum-stage1b/`. 1b sealed records: door `loadedBarsSha256` per history end in
  `results/records/audit.json` (A `b99dd76f…`, B `e05fd150…`, C `b8915bc5…`, D/H in the file); pick keys in
  `results/payloads/develop-*/selection.json.gz` (`picks.rod.key` etc.); Π1 values in `records/evaluate.json`
  (Σ +12,573.36, DD 42,881.89).
- **D1 primary** (`src/app/allIn-trailingBuy-postExitContinuation.ts` sha256 `de0935c3…`, `config/phenotypes/D1/VGT.json`
  sha256 `3e77a419…`, read-only): `maximumHoldDays 8`; `daysHeld = (sessionDate − entryDate)/day ≥ 8 &&
  profitAt(session.open) < 0` (strict, interest through the session date, **no fees**), fill at the next trade
  after the open (`firstTradeFrom(bars[0].time + 60)`), repeats every session; trail 7.3% from post-entry **intraday
  high**, raised after each session, never lowered, active only if `profitAt(stop) > 0`; stop-gap at the open
  beats the max hold; buffered intraday loss exit 2.9% from day 8; **no cooldown, no material-loss rule** (ancestor
  files had a *lower*-price re-entry rule, opposite direction to the brief's C). Header comments of the file still
  mention 15 days / 0.5% (stale).
- Throughput (synthetic, 1b engine, single thread, 1,760 sessions): 5–10 ms/run, E09 ≈ 20 ms → ≈ 0.5 ms/eval on 14
  workers.
- Disclosure: at session start `sha256sum data/VGT/*` hashed the whole data file (bytes incl. 2024–2026 rows, no bar
  parsed or used). Stage 1c code will never parse a row past the cap.

## Design decisions taken so far (to be written into PROTOCOL.md; not binding until frozen)

- Engine = copy of 1b engine + overlays A/B/C (off ⇒ bit-identical to 1b); independent reference by a separate agent.
- Entries E01–E12; exits XF, XF-T, XV, XS, XT, XRP, XRD, XD, XP, XO, XE, XU + new XN (D1-style profit-conditional
  trail); own contracts replace/OR (XO = retain) → 25 exit-contracts × 12 × 8 masks = 2,400 cells; R3F, Z0.
- A: literal timestamp rule relative to the session's first bar, net at open incl. sell costs, strict < 0, primary
  fill = next trade after the open (= D1), idealized same-open fill as sensitivity. B: sessions, discard semantics.
  C: gross raw loss ≥ X, next purchase decision price ≥ exitRaw(1+Y), consumed by the next purchase.
  Loss record is account-level, updated only by own-rule exits, persists through boundaries (reset = sensitivity).
- Search: first pass 256 Sobol + refs + 2 × J33 per cell per history; deep refinement of ≤ 22 (entry, exit-contract)
  pairs × all 8 masks; fixed-parent overlay-only ablation; picks P*, P*-NET, P*-mask.

## Guards

- No 2024/2025/2026 bar may enter any computation (loader cap ≤ 2023-12-29, as Stage 1b).
- Never modify Stage 1, Stage 1b, Studies 1–2, D1, B4/B5, allocator, `config/`, `data/`.
- Commit/push only the Stage 1c branch; no merge/PR/force-push.
