# RESEARCH_RECOVERY — Study 4: two-tier D1 allocator (shallow/deep, joint optimization)

## Top screen

- **Updated:** 2026-10-30T05:37:04Z. **Status: COMPLETE** (task executed and closed; Study 4 committed as `2bcc2f8671c901954d23f7c96945d16c1dabcad4` and pushed to `origin/research/study4-two-tier-d1-allocator`, remote HEAD = local HEAD verified 2026-10-30T05:37:04Z). Every stage ran; `results/FINAL.json` sealed 04:54:41Z (file sha256 `925ea7fed31d94ed…`, body `66a785d87bc76b85…`): **no nominee**. Labels as coded: 4B risk-incompatible, 4C no demonstrated incremental benefit, 4D-A no demonstrated, 4D-A0P risk-inc., 4D-B risk-inc., 4D-B0 no demonstrated, 4D-C risk-inc., 4D-C0 risk-inc. **D1 (final review):** 4A's refinement left 18,432 of 1,428,480 planned 4A vectors (1.29%) unevaluated in F21–F23 and H; V2 passes as coded and fails under the literal protocol text (then every label "invalid/incomplete") — the user decides which reading binds. Phase statuses: 4A **incomplete** (98.71% of floor), 4B, 4C, 4D-A/B/C, 4E complete; 2024–2025 and 2026 not evaluated; B5 unchanged; no live trades.
- **Follow-up gate (needs the user):** the V2 reading for D1; any new study, any 2024+ data access, any change to live/paper/shadow configurations.
- **Brief:** `brief/CLAUDE_STUDY_4_TWO_TIER_D1_ALLOCATOR_SHALLOW_DEEP_JOINT_OPTIMIZATION.md`, sha256 `9cb40a09…` (read in full).
- **Protocol:** FROZEN 2026-10-29T20:25:32Z, `PROTOCOL_FREEZE.json` body `4d2f5e50f27c65f00b588e92073d25f016ff7595c8b38e5c9917e05781ac4396`.
  Amendments A1–A5 + A5 addendum + disclosure D1 (A1–A3 before any outcome-bearing run; A4 a 4D floor-coverage fix after the first F20 4D-A record, superseded and rerun; A5 the evaluation-crash fix after the evaluation door opened; D1 the 4A floor shortfall found by the final review; `AMENDMENTS.md`, `results/amendments.jsonl`).
- **Code freezes (development):** `results/CODE_FREEZE.json` (freeze 1, 21:14:59Z, body `51a534db…`, digest `87b46c2a…`;
  F20 SPEC/4A/4B/4C sealed under it) and **`results/CODE_FREEZE-2.json` (in force; 21:36:59Z, amendment A4, body
  `5cd75c85c475df0c61243aa75ee6702c33ff05a589bce9f8e65062e1ec0c682c`, file sha256 `657558c4…`, digest `203fb76ec8e7ee55…`, 92
  files)** bound to parity records `results/parity/*-203fb76ec8e7ee55.json` (B5 373/373, synthetic frozen, reference
  synthetic, reference F20 — all PASS). A4: the 4D refinement could not spend its floor (first F20 4D-A record 217,649 /
  240,000; moved to `results/superseded/F20/4D-A-freeze1/`, sha256 `14218e5c…`; archive `046bdee9…`); fixed by
  escalating-radius refinement that fills the whole floor. Do not edit any development-closure file (see freeze hashes).
  Evaluation code (`evaluation.ts`, `final.ts`, `verify.ts`, `main.ts`) is frozen separately by `freeze-evaluation`.
- **Running:** nothing (H runner task b5pfspqts exited 0 at 04:54:18Z).
- **Next action:** none. STOP for the user's review (follow-up gate above). Do not merge, open a PR, force-push or touch broker systems.
- **Data door:** outcome-bearing bars authorised only through 2023-12-29. Never run `npm test` in this checkout.

## Environment

- Repo root: `/home/chad/projects/margin-trading` (main checkout). Branch `research/study4-two-tier-d1-allocator`
  created 2026-10-29T19:21Z from `9d9513bf58639b0dce6db7dedef19474e2b9ff4b` (= verified
  `origin/research/study3-vgt-momentum-stage1c` after `git fetch` the same minute).
- `origin/main` = `3ef43015…` (not an ancestor of the branch; CLAUDE.md and docs/claude/context-recovery.md identical
  to main's — `git diff origin/main HEAD -- CLAUDE.md docs/claude/context-recovery.md` empty).
- Working tree at branch creation: two untracked user files `research/study3-vgt-momentum-stage1c/._.DS_Store`,
  `research/study3-vgt-momentum-stage1c/results/payloads/._.DS_Store` — not ours; never add, delete or commit them.
- Node v24.21.0 (`.node-version`), 16 cores, 59 GB RAM.

## Stage table

| Stage | Status | Notes |
|---|---|---|
| S0 inspection + source audit | complete | `SOURCE_AND_CONFLICTS_AUDIT.md` |
| S1 protocol + matrix + search plan | complete | revision 2 |
| S2 independent methodology review | complete | 2 reviews returned ≈19:55Z/19:57Z, verbatim + dispositions in reviews/ |
| S3 protocol freeze | complete | 2026-10-29T20:25:32Z, body 4d2f5e50… |
| S4 engine + oracle + B5 parity + embargo guard | complete | B5 373/373 to the cent; fast = frozen replays; fast = independent reference (synthetic 2,164 pools + F20 60 pools); records `results/parity/*-203fb76ec8e7ee55.json` |
| S5 code freeze | complete | freeze 1 21:14:59Z body 51a534db…; freeze 2 (A4) 21:36:59Z body 5cd75c85… (in force) |
| S6 per-fold 4A–4D (training only), seal selections | complete | F20→F23 sequential under freeze 2 (restarted 21:37Z). F20 records (file sha256 / body, first 16 hex): SPEC `74397061…`/`2d265f7b…`, 4A `c34a379c…`/`22b1a417…`, 4B `fb742bab…`/`9cc3798c…`, 4C `084ed3e5…`/`244c5770…` (these four under freeze 1, unchanged by A4), 4D-A `315123d4…`/`b1e14d60…` (240,000), 4D-A0P `afa83e19…`/`4097e596…` (240,000), 4D-B `c6a0fa0c…`/`44e64d6f…` (240,000), 4D-B0 `ff5463aa…`/`d8558b04…` (240,000), 4D-C `89f8616d…`/`4ed392c3…` (536,000 = 400,000 + predeclared extension; pick no-fill), 4D-C0 `f4544e13…`/`14511928…` (400,000; no-fill); SELECTION `ef151ce6…`/`52be0056…` (development picks: 4B, 4C, 4D-B filled; 4D-A, 4D-A0P, 4D-B0, 4D-C, 4D-C0 no-fill). **F21 complete** (22:23:32Z → 23:34:51Z): SPEC `6ce6ef20…`/`b4e4f628…`, 4A `feacf2ca…`/`781ed41f…`, 4B `74960369…`/`eac5f705…`, 4C `7f5422b6…`/`9575c693…`, 4D-A `56bfd823…`/`f15bdb63…` (240,000), 4D-A0P `bb7a4584…`/`3c7a2cba…` (240,000), 4D-B `13232ef0…`/`40810e59…` (320,000, extended), 4D-B0 `2a3c64c9…`/`79c39ad8…` (240,000), 4D-C `35ce2874…`/`e596fea8…` (536,000, extended), 4D-C0 `bd4b3aef…`/`55c55656…` (400,000), SELECTION `0964cec0923fb3d0…`/`d3d2625ece424d70…` (all filled except 4D-B0). **F22 complete** (23:34:51Z → 01:04:24Z): SPEC `91bc3bc2…`/`7452a7cf…`, 4A `d7ff872f…`/`424a0d62…`, 4B `17334e14…`/`6e711b8f…`, 4C `c3cc72d3…`/`59a807d5…`, 4D-A `efcc9158…`/`47235c35…` (240000), 4D-A0P `898331aa…`/`a70287de…` (320000), 4D-B `14861549…`/`efe7b637…` (320000), 4D-B0 `017d79c2…`/`1986c824…` (240000), 4D-C `680a2f6a…`/`3a4d5321…` (536000), 4D-C0 `b68a6e21…`/`a4264385…` (536000), SELECTION `0f04b13321fc8222…`/`768d9c57f5db09c1…` (all filled). **F23 complete** (01:04:24Z → 02:43:47Z): SPEC `7aa63b24…`/`3480ec46…`, 4A `4b4522fa…`/`28ca1d43…`, 4B `a9ac1837…`/`327d0678…`, 4C `7144de87…`/`e4a72b95…`, 4D-A `e99432ae…`/`607db616…` (320000), 4D-A0P `d217f304…`/`1193f0d2…` (240000), 4D-B `6f828820…`/`dac2ea94…` (240000), 4D-B0 `228e253a…`/`ed20fe6d…` (240000), 4D-C `51b24b9e…`/`deeef77b…` (536000), 4D-C0 `9dfb8aeb…`/`1e52bbc8…` (400000), SELECTION `475488e4cbeb35ea…`/`519a2e4cf9b314a3…` (all filled) |
| S7 4E evaluation, robustness | complete | first run crashed (A5, nothing sealed); refrozen 02:52:32Z body `a5d4e956…`; rerun 02:52:39Z → 02:57:15Z, exit 0, sealed `results/evaluation/RECORD.json` (sha256 `cd25f855…`, body `350e949d…`). **Rerun check passed:** 4B −27,669 / reset −55,199; 4C −48,533 / −50,971; 4D-A −67,337 / −49,319; 4D-A0P −87,312 / −92,856 — identical to the crashed run's printed values. 16/16 reference checks pass |
| S7b H (in-sample description, nominee source) | complete (02:58:12Z → 04:54:18Z; SELECTION sealed 04:54:17Z) | `npm run study4-allocator -- develop H 14` (requires the sealed evaluation) |
| S8 reports, final review, data-less test suite, commit + push | complete | commit `2bcc2f86…` pushed (new remote branch; `git ls-remote` = local HEAD) | `final` sealed 04:54:41Z (no nominee); reports generated; data-less suite done (identical failure set to baseline); `verify` 89/90 (the one failure: superseded A4 record's stale archive path, documented in IMPLEMENTATION_AUDIT §6); final review next |

## Git

- Branch `research/study4-two-tier-d1-allocator` from `9d9513bf…`; Study 4 commit
  `2bcc2f8671c901954d23f7c96945d16c1dabcad4` (259 files: `package.json` + the two Study 4 namespaces; `results/logs/`
  force-added; `results/archive/` git-ignored), pushed 2026-10-30T05:37:04Z to `origin` as a new branch; `git ls-remote --heads origin
  research/study4-two-tier-d1-allocator` = `2bcc2f86…` = local HEAD. A follow-up commit records this checkpoint. Not
  merged, no PR, no force-push. The two untracked `._.DS_Store` files under Study 3 Stage 1c remain untracked and untouched.

## Worktrees

- The scratch data-less worktree (session scratchpad, detached at `9d9513bf`, only `data/partitions.json`) was used for
  the repository suite via `scripts/dataless_suite.sh` and **removed** 2026-10-30 ≈05:34Z (`git worktree list` shows only
  the main checkout).

## Guards

- Do-not-rerun: every sealed F20–F23 and H stage record and SELECTION; `results/FINAL.json`; `results/evaluation/RECORD.json` (sealed; `evaluate` refuses); the evaluation freeze. Do not edit any earlier study, B4/B5 configs, phenotype JSONs, prospective records.
- Commit/push only the Study 4 branch, only after final review (authorised by the brief §11).

## Key facts established in S0 (on disk in the audit)

- B5 2016-01-04→2023-12-29 fixed anchors (5 bps): net 388489.25791641016, minute DD 26509.97304978661, daily DD
  23788.608981739657, 82 lots, 155 virtual trades, interest 37791.7808219178 (`research/joint-16-etf-d1/results/controls/controls.json` training.B5).
- Frozen fast path: `traceBook` (src/portfolio-aware-d1/trace.ts) + `replayFixedPool` (replay.ts); synthetic timing 5–8 ms/trace, 3–8 ms/replay.
- Universe 61 symbols (`research/d1-ranked-preemption/results/audit/universe.json`).

## On disk versus in memory

- Reports: all generated from `report_templates/*.md` by `scripts/report.py` (README.md and IMPLEMENTATION_AUDIT.md are
  templates too — edit the template, never the generated root file). FINDINGS written (2026-10-30 ≈03:10Z) for 4A, 4B,
  4C, 4D, 4E, DEEP_TIER, ALLOCATION; still to write after H and `final`: README results and FINAL_COMPARISON findings
  (the six questions, strongest candidates, next gate), and the audit's compute/tests/scope sections.
- `scripts/report.py` additions (no data access): `dd()` ($ and % of slot), exposure, per-trade B5 preservation,
  H picks, FINAL tables, door log + `door_input_hashes.csv`, `selection_books.csv` (phenotype hashes), seed stability,
  4A library summary, B5 idle gaps.
- Baseline data-less suite (worktree at `9d9513bf`, no Study 4 files): 784 tests, 733 pass, 8 fail, 28 cancelled, 15
  skipped (data-dependent tests; log `results/logs/dataless_suite_base.log`, failure list
  `results/logs/dataless_suite_base.failures.txt`). **Study 4 run (final):** `scripts/dataless_suite.sh <worktree> <out>
  study4` 2026-10-30 ≈03:16–03:24Z: 812 tests, 761 pass, 8 fail, 28 cancelled, 15 skipped; failure set identical to the
  baseline (`results/logs/dataless_suite_study4.log`, `.failures.txt`). The first Study 4 run (03:06–03:14Z,
  `dataless_suite_study4-run1.log`) had one extra failure: `tests/doors.test.ts` "refusals fire before any read" assumed
  the checkout is outside the OS temp directory and that the selections/evaluation are unsealed; the test was made
  location- and state-independent (doors.ts unchanged); 28/28 Study 4 tests pass in the main checkout and the worktree.

## Disclosures

- **Final review** (`reviews/FINAL_REVIEW.md`, dispositions `reviews/FINAL_REVIEW_DISPOSITIONS.md`): no blockers; MAJOR
  1 → disclosure D1 (4A floor shortfall, both V2 readings); MAJOR 2 → A5 addendum (three files changed; proven by
  `scripts/a5_diff_proof.py`, `floorsMet` unchanged); minors disclosed or fixed (door wording, hash cross-check 29/29,
  E11 ties, parity minimums, `doors.refusals.test.ts`, latency wording).
- `verify`: 89/90 — the one failure is the superseded A4 record's stale archive path (archive moved; hashes match;
  IMPLEMENTATION_AUDIT §6).

- **A5 (after the evaluation door opened):** the first evaluation run crashed after printing B5's 2020–2023 increments and the chained/reset ΣΔ of 4B, 4C, 4D-A and 4D-A0P (all negative; exact figures in AMENDMENTS.md A5). Nothing was sealed; the fix is mechanical; the evaluation is rerun in full; the door log has two evaluation openings. The final report must state this.

- Throughput note (no correctness effect): the predeclared extension runs the four islands one after another and the
  converged populations yield few new children per generation, so only ~4 of 14 workers are busy during an extension
  (F20 4D-C extension ≈ 7 min). Floors are still met by the A4 refinement fill.
