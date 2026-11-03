# Dispositions of the final audit (`reviews/FINAL_AUDIT.md`)

Written 2026-10-29T17:38:41Z (clock). The audit confirmed the verdict ("no demonstrated edge", no nomination) from the sealed payloads;
every finding concerns reports, tables, disclosures or housekeeping. **No sealed record, frozen protocol file or
frozen source file was changed and no stage was rerun.** Edited: the eight report files, README, IMPLEMENTATION_AUDIT,
AMENDMENTS (+ `results/amendments.jsonl`), `scripts/report_tables.py` (not in the code freeze) and the regenerated
`results/tables/`.

| # | Severity | Disposition |
|---|---|---|
| 1 | MAJOR | **Adopted.** "Robust(ly)" removed from README, FINAL §2 and §4.2. The drawdown effect is now stated as "in one retrospective, target-year-informed replay and its parameter perturbations", with the perturbations described as perturbations of the same picks, not independent samples; 62% (79/128) DD-only and 58.6% both-criteria shares quoted separately; the 2022 location of the cut drawdown tagged (target-year-informed). |
| 2a | MINOR | **Adopted.** INTERACTIONS: Π1 beat C-SMA reset by +$2,673, short of the required +$5,000 margin. |
| 2b | MINOR | **Adopted.** INTERACTIONS rewritten from `cells-<h>.csv`: A acts most with XN, XF-T, XP, XV (≥ 81%) and least with XRP (68–80%); B acts on every E09 vector, 69–81% of E06, 37–45% of E10. |
| 2c | MINOR | **Adopted.** ABLATIONS §3: A-only median Δnet $0 / −$909 / −$4,429 / −$2,351 / −$5,434 (A, B, C, D, H); A+B and A+B+C ranges quoted. |
| 2d | MINOR | **Adopted.** 59% replaced by 58.6% (both criteria) and 62% (DD only) in FINAL, ABLATIONS, NEIGHBORHOODS, README. |
| 2e | MINOR | **Adopted.** ENTRY_EXIT and NEIGHBORHOODS: the 100% positive development neighbourhoods are an empirical J128 result; selection requires only φ ≥ 0.75 on J33. |
| 2f | MINOR | **Adopted.** README: passes the five rubric-(h) stresses; the 0 bps stress (+$9,831 / $51,541) is outside the rubric. NEIGHBORHOODS separates the two. |
| 2g | MINOR | **Adopted.** NEIGHBORHOODS legs: Π1-off captured the three 2022 legs as well (92/97/93% vs 91/82/102%); the 2022 gain came from avoided or cut losing entries (tagged). |
| 2h | MINOR | **Adopted.** FINAL and CHRONO: B10 leaves the three 2022 trades unchanged but changes 2023 (+$11,049 → +$14,343; Σ +$12,573 → +$15,867). |
| 2i | MINOR | **Adopted.** INTERACTIONS: two 2021 A sales (trade 5 −$714, trade 6 −$106). |
| 3 | MINOR | **Adopted.** Tags added to CHRONO (a), (d), NEIGHBORHOODS (losses-cut, legs, perturbed 2022), INTERACTIONS (A × B, alternative explanations), ABLATIONS §1. The procedure statement and "2022 improved with trend retention" are now reported in ABLATIONS, CHRONO and FINAL with "in one retrospective, target-year-informed replay". |
| 4 | MINOR | **Adopted.** `report_tables.py` adds `pareto-H.md` (21 of 104 deep-cell champions; reported in ENTRY_EXIT and FINAL), drawdown peak/trough dates (chained and per window, `paths.md`; reported in README, FINAL, CHRONO, TRADE_LEDGER), `rule-stop-grids.md` and ledger fill price / shares / friction columns. Every report now quotes the 5,114,598 configuration count. CHRONO (e) adds the Π-000 comparator (+$23,685). |
| 5 | MINOR | **Adopted.** Amendment A3 (post-outcome, descriptive): C-ALZ1|reset = C-AL|reset (path hash `d73b5c1a…`, Z0 override); row omitted from `paths.md` with a note; IMPLEMENTATION_AUDIT §7. |
| 6 | MINOR | **Adopted.** Stray `research/study3-vgt-momentum-stage1c/research/` and `scripts/__pycache__/` deleted. `report_tables.py` now changes to the repository root itself, stops on a missing record or payload, verifies each develop archive's sha256 before reading it, and leaves `diag-2022.md` as committed (with a notice) when an archive is absent instead of blanking columns. A regeneration from `/tmp` reproduced every pre-existing table byte for byte except the intended changes (`paths.md`, `ledgers.md`, new `pareto-H.md`, `rule-stop-grids.md`). |
| 7 | MINOR | **Adopted (documented).** README "Reproducing": on a fresh clone `status`/`verify` report develop-A…H as BROKEN because the git-ignored archives are missing; `diag-2022.md` cannot be regenerated without them; a rerun restores them deterministically. The verifier (frozen code) was not changed. |
| 8 | MINOR | **Adopted (disclosed).** IMPLEMENTATION_AUDIT §1 corrected (records hold HEAD and the filtered `outside` list); §7 discloses the missing planned-count guards for evaluate/robustness and the narrow (vii) / executability checks, with the auditor's 0-violation result. |
| 9 | MINOR | **Adopted.** RESEARCH_RECOVERY top screen refreshed (amendment head A3, no running processes, audit recorded, stale steps removed); README status rewritten to state only what exists, and the commit/push is recorded in the checkpoint after it happens. |
| 10 | NOTE | **Adopted.** Edge optima (A t2 0.005; B ρ 1.00; C ρ 0.98; D γ 2.57; H ρ 0.97) reported in CHRONO, ENTRY_EXIT, NEIGHBORHOODS, FINAL and README as consistent with (f) failing. |
| 11 | NOTE | **Adopted (disclosed).** IMPLEMENTATION_AUDIT §4 no longer claims a repeated-loss B test; §7 and FINAL §3 disclose the gap and the weak missing-bar stress. `tsc --noEmit` (clean) and ESLint (0 errors, 7 warnings) were rerun by the parent session. |
| 12 | NOTE | No action (verification record). |
