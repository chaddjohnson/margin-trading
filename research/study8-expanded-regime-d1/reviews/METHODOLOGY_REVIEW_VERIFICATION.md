# Independent methodology review — verification pass (before the freeze)

The same reviewer agent verified the resolutions of `METHODOLOGY_REVIEW.md`, read-only, against `PROTOCOL.md` sha256
`55c29468…` and the revised code. Report returned 2026-11-01T15:38:36Z (session transcript) and recorded verbatim below. The resolutions of its
new findings are in `PROTOCOL.md` §13 and `AMENDMENTS.md` R0.

---

# Study 8 verification pass (read-only): revised protocol and code

**Checked:** worktree `/home/chad/projects/margin-trading-study8`, nothing frozen. `PROTOCOL.md` sha256 is `55c29468…` and the review file is `b2fa75c1…`; both match AMENDMENTS R0. `tsc --noEmit` and `eslint src/study8-expanded-regime-d1` are clean, and the unit tests pass 11/11. The tests changed nothing in the worktree: `results/` still holds only `doors.jsonl`, `pilot/` and `runlogs/`. I read nothing under `data/` and modified nothing.

**Verdict:** M2–M6 are resolved in code. M1 is resolved except for one gap. Two new major issues should be fixed before the freeze: the search's ranking sort can exhaust memory at the new 32-D/40-D archive sizes, and the new test-stage code has never run on real data before the first test door. Both fixes are cheap.

## M1–M6

- **M1: not fully resolved.**
  - **What works:** `integrity.ts` pins the code digest of this namespace, the `engineFiles` digest, the data, splits, partitions and distribution files, and the numeric rulebook. The freeze also writes a code tarball.
  - **Where it is enforced:**
    - `requireIntegrity` runs at every non-pilot door (`gates.ts:202`) and in `seal`, `freeze-selection`, `record-audit`, `pool` and `research-configs`.
    - `acknowledge-code` needs an AMENDMENTS entry and seals a `code-<ID>` phase.
    - The constants have no acknowledgement path.
    - `test.ts:215–216` refuses unless the live constants equal those sealed in `FROZEN_SELECTION.json`.
    - A forged `code-*` entry is read unverified at `integrity.ts:71`, but `verifyChain` rejects it in the same gate.
    - If `protocol_freeze.json` is missing, the integrity check is skipped, but every gate then fails closed through the chain.
  - **The gap:** shared modules that decide the study are outside both `codeDigest` and `engineFiles` (`evaluate.ts:61–79`). No gate would notice a post-freeze edit to:
    - `study6-b5-kre-robustness/designs.ts` (`pointFromUnits`, clipping), which builds every neighbourhood;
    - `study5-gdx-b5-three-etf/grid.ts` (`latinOffsets`, `quantile`), which every share, p10 and p90 gate reads;
    - `study7-stability-first-d1/context.ts` (`frozenGrids`, `gdxControls`), i.e. B1, the controls, the tier and E3;
    - `optimizer/nsga2.ts`, `rng.ts` and `sobol.ts`;
    - `multi-etf-d1/space.ts` (box and probes);
    - `d1-robust/pbo.ts`;
    - `b4-b5-robustness/analysis.ts`;
    - `study6-b5-kre-robustness/evaluate.ts` (the minute series, now asserted);
    - Study 6 `parity.ts` and Study 5 `engine.ts`.
  - **Fix:** add the full transitive import closure of `src/study8-expanded-regime-d1/` to the pinned engine set. Alternatively, in `requireIntegrity`, require `git diff --quiet bce526f -- src config ':!src/study8-expanded-regime-d1'` and no untracked files under `src/` outside the namespace. Then say so in PROTOCOL §2.3.
- **M2: resolved.**
  - The data, `partitions.json`, `splits.json`, `distributions.csv` and its manifest are hashed against the frozen values before any bar is read (`gates.ts:202` → `integrity.ts:84–95`).
  - The partitions hash is part of the door id (`data.ts:76, 147`).
  - Operational note: `data/*` are still links into the user's live checkout, so a data refresh there stops the study, as designed. Tell the user not to refresh data until Study 8 ends.
- **M3: resolved.**
  - T6 and T7 are in `testGatesOf` (`test.ts:134–143`). The whole-run floors use the run's y and give lot years 3 on every test door. The test-window floors use yTest rounded to 0.01 (`test.ts:81–89`), giving 3/1 for F19–F21 and F24 and 2/1 for F23, as stated.
  - The gates apply to every holder and member and are sealed in `testRules`.
- **M4: resolved.**
  - Every shortlist member is gated (`test.ts:518–545`): holders reuse their full evidence; other members get the lite evidence, which carries every field T1–T7 and the Study 7-equivalent gates read (decisive sets, `perRep`, in-box pair, d8 pair, stresses, train and test period statistics). E3 uses B1's `test-d8` sets with the same labels.
  - Persistence, `s7Equivalent`, insufficient evidence, return rank and outcome classes match §8.4–§8.5. The protocol states the comparison is descriptive and names the confounds.
- **M5: resolved in code.**
  - The islands really do use `budget.population` (`search.ts:377–444`).
  - The combinations, joint LHS, rung-1 cap and new configurations per island are scaled; the values match the §7.1 table and the unit test.
  - This change creates new issue N1 below.
- **M6: resolved.** §5 now lists in-box (Q2b/T2b) and k = 8 (E3) as gating, matching the code.

## New issues

**N1 (major, operational; introduced by M5): the rung-2 ranking can run out of memory, and a resumed job would hit the same failure every time.**
- **Where:** `search.ts:541` and `:562` call `rankOrder(archiveFits)`. That reaches `fastNonDominatedSort` (`nsga2.ts:47–62`), which stores one entry in `dominatedBy` per dominating pair. Under constrained domination every infeasible pair is comparable, so the entries number about N²/2.
- **Size:** with T1 extended to 8 islands, the archive reaches N ≈ 2,560 + 8 × 5,120 ≈ 43.5k (VXRKG) or ≈ 34.8k (VXRG). By my estimate, not measured, that is about 0.6–0.95 billion entries, roughly 5–8 GB or more on Node's 8-byte array slots. Add the point cache: about 0.9M records at ~3 KB each.
- **Consequence:** that exceeds the 12 GB heap. Resuming from the cache replays the same trajectory, so the job would fail again at the same step. The study would stall or need a post-freeze code change partway through the search.
- **Fix (before the freeze):**
  - Rank feasible configurations with the NSGA sort and order infeasible ones by violation. This is provably the same order: infeasible fronts are groups of equal violation, crowding-sorted. Add a unit test asserting identical order to `selectSurvivors` on random mixed sets.
  - Or at least benchmark `rankOrder` on a synthetic archive of 43.5k with mixed violations under `--max-old-space-size=12288`; this needs no data.
  - Consider running fewer 32-D/40-D jobs concurrently.
  - Separately, the §7.1 wall-time estimate of 5–9 h for VXRKG-F24 does not allow for T1 doubling the islands.

**N2 (major, process integrity; cheap to fix): the new test-stage code first runs on a test door, and outcomes are printed before the record is sealed.**
- **What has never run on real data:** gap risk (it throws at `test.ts:255`), the minute-series tracker and lot-order assertions (`test.ts:334, 341`), the lite member loop, persistence and return rank, and the `--confirm` comparison. Neither parity nor the preserved smoke test exercises them; the smoke test covered only the evidence, qualification and minute-series calls.
- **How the risk arises:** `test.ts:503–505` logs each holder's status and failed gates as it goes. A throw after that point, at `test-F19` or later, leaves partial test outcomes visible. Any fix would then be a code change after exposure, or the study stops at the second crash (§7.3).
- **Fix:**
  1. Add a parity-stage dry run of the test-stage pipeline. Use frozen controls, already known, on a parity door with a synthetic plan, run it twice and require the `core()` comparison to be identical.
  2. Log only "done" per configuration, and print statuses after `writeSealed`.

## Minor notes

- **`--confirm` false mismatch after a crashed test is rerun.** `PointCache.set` writes non-finite numbers as `null` (`evaluate.ts`, cache `set`). A rerun that reloads `test-F24.jsonl` therefore stores `top1Share: null` where a fresh run stores `"NaN"`. `core()` (`test.ts` near 690) would then report DIFFERS and throw. Fix: delete the test cache before the one permitted rerun, or normalise `null` back to NaN when loading the cache.
- **The confirm run can sit silent near the watchdog limit.** `--confirm` uses a memory cache, so the watchdog sees only its log (`run_jobs.sh:30–38`). The member loop (`test.ts:518–545`) logs nothing, which is roughly 25–40 minutes for about 30 lite members on the full history. Add a log line per member.
- **`run_jobs.sh:28`:** `setsid` without `-w` is safe here because the backgrounded subshell is never a process-group leader without job control. `setsid -w` would be more robust.
- **T6(b) episode count (`test.ts:307–311`):** the first test-window lot always opens a new episode, even within 10 sessions of a training-window exit. This is harmless because the floor is 1, but §8.4 should define "new episodes" as episodes among lots entered in the test window.
- **Wrong cross-reference:** PROTOCOL.md:559 cites "Study 7 §9.1"; the insufficient-evidence rule is in Study 7 §10.1.
- **The future `study8-run` adapter (§3.2, §10) does not exist yet.** It must require the `test-F24` phase and write a door-log line, as `pool` does.

## Checked and correct

- **Chain:**
  - door-log prefix bindings, and every chain head recorded at a door opening, detect edits and truncation (`records.ts:240–285`);
  - training doors close on `FROZEN_SELECTION.json`, on any `results/test` file or on a test-door line in the log (`gates.ts:184–191, 210–218`);
  - G1 refusals write no door-log line, so they cannot close the training doors.
- **Door order:** pre-freeze, every non-pilot door still fails closed. Test doors need `selection`, `audit` and the earlier folds. `requireParity` now also checks `parity.json` `passed`.
- **`seal` door-opening count:** the purpose strings match `search.ts:185` and `qualify.ts:98`; smoke and restart-probe openings are not counted.
- **Selection:** `assignRoles` is a pure function with ledger-Jaccard extras. The rulebook and the code and engine digests are sealed in `FROZEN_SELECTION.json`, and the test plan carries order, pick, qualified flag and training figures.
- **NaN and non-finite values:** E3 requires finite values; a non-finite violation becomes Infinity, which is infeasible.
- **Parity:**
  - P1 covers W23 (training partition), W24 and W29;
  - P3 checks the exact sets (15 controls, ranks 1–12) and all 27 W29 and 27 W13 rows; I verified that the W13 key scheme matches Study 7's `final.json`;
  - N1 covers next-open and +25 bps fills at both cuts;
  - P5 labels the four Study 5 Track 1/2a controls grid-only.
- **Gap risk:** the field names exist and closed lots' exit times equal their virtual trades' (`replay.ts:370–380, 505–510`; `shadow.ts:67–76`).
- **Watchdog:** cache file names match the log names for search, qualify and test jobs. The search flushes every 30 s. SIGTERM goes to the whole process group, then SIGKILL after 20 s.
- **Protocol text:** the §5 seed table, the §7.1 budgets, the §8.4 T1–T7 and ambiguity rules, the §8.5 statistics and the §13 mapping all match the code.
