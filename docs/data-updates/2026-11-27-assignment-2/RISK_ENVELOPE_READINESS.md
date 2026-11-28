# Risk-envelope pilot: compatibility and readiness (no pilot launched)

**Nothing was launched.** No risk-envelope pilot job, search, preflight-gated stage or other research optimization ran
in this assignment. The only optimization was GPU Phase 9's fixed-seed engineering mini schedule (D19), which is an
acceptance device and is never research evidence.

## 1. Actual status: the pilot already ran and is COMPLETE

The brief asks to verify "readiness". The repository shows that the bounded pilot and all its follow-ups were executed
and sealed before this assignment. Nothing about them is pending.

| Study | Branch (ancestor of this release) | Status | Outcome (sealed) |
|---|---|---|---|
| Risk-envelope pilot NL0-REP 1.0.0 (`research/vg-l0-risk-envelope-pilot/`) | `research/vg-l0-risk-envelope-pilot` `7f69d0d2` | COMPLETE 2026-11-22T11:38Z | **worse** by the precommitted rule (Δ21 −$4,456.27, Δ24 −$21,830.38; H1/H1′ fail, H2 and H3 hold). Report §13: keep the original method |
| Stage A sensitivity RES-A 1.0.0 (`research/vg-l0-risk-envelope-sensitivity/`) | `0c2f9dd5` | COMPLETE 2026-11-22T16:45Z | replays and analysis only |
| Stage B RES-B 1.0.0 (`research/vg-l0-risk-envelope-stage-b/`) | `1c1f9e72` | COMPLETE 2026-11-23T06:54Z | P3 non-inferior and superior on C21/C24; recommendation: **do not adopt P3, keep P0** |
| Stage B diagnostics RES-BD 1.0.0 (`research/vg-l0-risk-envelope-stage-b-diagnostics/`) | `48090c55` | COMPLETE 2026-11-23T08:14Z | Decision register R1 keep P0; R3 **close the risk-envelope investigation**; R2 a 40 % ceiling only as a hypothesis for a future, separately authorized test on new data |

**Follow-up gate:** the user's review of these reports. A further envelope study would be a new study needing the user's
authorization. It would need its own protocol, an adoption of the current standard (5.0.0, which requires `dateRanges`
and `dataPins`) and its own job configuration. The sealed pilot is never rerun.

## 2. Compatibility of the combined implementation

| Item | Check | Result |
|---|---|---|
| The pilot's code and the risk-envelope library | `git diff 7f69d0d2 <candidate> -- src/risk-envelope src/vg-l0-risk-envelope-pilot src/gpu-backend/lab.ts src/gpu-backend/pool.ts` | **empty**: metric definitions, the one interpretation (`policy.ts limitOf`: `(denominator × pct) / 100`, binary64, a value equal to its limit passes), percent normalization on the fixed $100,000 C0 (never peak equity), the liquidation and marked bases, `checkEnvelope` and the `…\|risk` archive key are byte-identical to what the pilot ran |
| The configuration it ran | `research/vg-l0-risk-envelope-pilot/PROTOCOL.md` §2 (frozen `723eea5d…`) | CTRL `nl0-control@1.0.0`: marked DD ≤ 35 % → $35,000. EXP `re-40-25-25@1.0.0`: marked DD ≤ 40 %, principal loss ≤ 25 %, banked DD ≤ 25 % (liquidation basis) of C0. Not altered |
| CPU tests | `src/risk-envelope/tests/{policy,labRisk,diagnostics}.test.ts`, `src/vg-l0-risk-envelope-pilot/tests/*` in `npm test` | see `TESTS_AND_INTEGRITY.md` |
| The official GPU delivery of the envelope | GPU Phase 9 gates R1–R3 (threshold edges of the restored Assignment 3 archives on D21/D24, finalists on D24 under four option sets, 1,000 random genomes on D19), A3 (the C19 replay with the envelope requested = sealed), A4 (risk mini CPU = GPU; risk = plain decisions), Q1 (qualification and rankings under both policies) | see `GPU_ACCEPTANCE.md` |
| Chronological decisions | the pilot's own doors and fold order are sealed in its records; the date-boundaries change keeps every door's bytes (GPU Phase 9 gate D1: every real-data door's GPU dataset = Phase 7's) | see `GPU_ACCEPTANCE.md` |
| Its preflight | `npm run research-preflight -- --study research/vg-l0-risk-envelope-pilot` | BLOCKED (§9.9) only while the record is stale; after the Phase 9 record: see `TESTS_AND_INTEGRITY.md` |
| Branch dependencies | the pilot, Stage A, Stage B and the diagnostics branches | all are ancestors of the release: no further integration is needed. RES-BD R6 asked to keep them unmerged until review; the user's Assignment 2 authorization of the integration covers them as the lineage's required ancestry (`INTEGRATION.md`) |

## 3. What would be needed to run another envelope study (not done; the user's decision)

1. The user's authorization and a new study namespace with its own `PROTOCOL.md`. RES-BD's R2 frames any 40 % idea as a
   hypothesis on new data.
2. An adoption of standard 5.0.0: scope `optimization` or `continuation`, `dateRanges` R1, `dataPins`, and
   `evaluationBackend` `gpu-required`.
3. A job configuration through `openOfficialGpuSession` and `openJob`. It is officially runnable only while
   `config/gpu-backend/acceptance.json` is ACCEPTED and matches the tree.
4. None of this is blocked by missing code: the delivery, the library and the jobs exist and are accepted.
