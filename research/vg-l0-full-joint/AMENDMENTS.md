# AMENDMENTS — Assignment 3: New L0 risk-aware successor, full joint optimization

Append-only. Each entry: ID, UTC time, the change, why, which results existed, and its effect. Entries before the freeze
(R…) record draft edits of the protocol and of the engineering gates; entries after it (A…) are amendments under standard
§0.2; operational changes (worker counts, caches) are O… entries. No criterion is loosened once results it governs exist.

## R1 — 2026-11-15T12:37Z — stage V gate V3(b) revised during the pre-registration dry runs (before the freeze)

- **Change.** The first stage-V dry run (`vgl0fj-parity-dry1`, 12:22Z) had one failing check of 17,971: "an active Growth
  step changed Growth's trades in 11 of 40" against a provisional threshold of half the cases for a ONE-fine-step move.
  A single 0.1-point or one-session nudge often leaves discrete signals unchanged, so that threshold measured nothing the
  brief asks for. The check became: an active one-step move always changes the identity (40 of 40, kept); every one of
  the 50 numeric Growth genes and the 7 optional rules (a) changes the engine's parameters in every sampled context
  where it is active and (b) changes Growth's executed trades OR its decision log in at least one of up to 8 contexts,
  under a move by its refinement radius R or to a bound of its box; the ±R trade-change share is reported. The second
  dry run (12:27Z) used trades only with an incomplete fill fingerprint (it omitted the sold fraction `f`) and failed for
  14 genes; an engineering diagnostic (`.cache/vg-l0-full-joint/reach-diag*.ts`, D24, pass/fail and counts only)
  showed every gene reaching the engine's parameters, most changing trades under larger moves, and the reset/renew
  eligibility genes acting only on renewal watches that on VGT 2016–2024 end by supersession or lapse (they change the
  engine's logged state, rarely its trades). The third dry run (12:36Z) passed: 0 failed of 18,087.
- **Results existing.** Only the three stage-V dry runs (pass/fail counts), the diagnostic counts and the unit tests. No
  search, no pilot, no searched configuration's performance. No box, rule, threshold or budget changed.

## R2 — 2026-11-15T13:26Z — the pilot's measurements, R_N and one guard fix (before the freeze)

- **Changes.** (1) `PROTOCOL.md` §8.4: the bench, the calibration, R_N = 4 by the precommitted rule of §8.3, the per-lane
  caps and the expected compute. (2) `stages.ts`: the pilot's first run stopped at its refinement step because a guard
  treated `refine` (shared by the pilot and the study) as a study-only part; the guard now refuses only a pilot-only part
  outside the pilot and a study-only part inside it (no study path changed). No box, rule, threshold, quota, cell or
  budget formula changed; R_N = 4 is the value the draft's code already held.
- **Results existing.** Stage V (sealed, 0 failed of 18,091), the full `npm test` (1,654 tests, the 7 known failures), the
  bench, the straight pilot, the interruption tests and the calibration (pilot outputs in the cache; only timings,
  counts, stops, memory and pass/fail were read). No study search has run. The evaluation digest is unchanged since
  stage V (`2aeeee42…`).
