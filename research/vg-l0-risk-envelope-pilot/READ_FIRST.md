# READ FIRST — risk-envelope pilot NL0-REP 1.0.0 (results handoff)

**Status: COMPLETE.** The authorized bounded pilot ran in full on the official GPU path, in the frozen order, within
budget. Research only: nothing adopted, deployed, merged into `main` or replacing New L0 / N/original.

## Executive conclusions

1. **Outcome label (precommitted rule): _worse_.** EXP's best qualified centre net was lower than CTRL's at both
   cutoffs — C21 **−$4,456**, C24 **−$21,830** (H1 and H1′ fail). H3 (C21 next-interval DD non-inferiority, $5,000)
   holds: EXP P0 $32,168 vs CTRL P0 $45,820. H2 holds narrowly (one EXP-only qualified, giveback-dominated member with DD
   $35,686).
2. **The envelope is not a relaxation in practice.** Its 25 % banked-capital DD gate (liquidation basis) was the most
   frequent binding constraint (24.6 % / 48.3 % of EXP's profitable, funded centres at C21 / C24, vs 20.7 % / 42.9 %
   failing DD > 40 %). It removed CTRL's best C24 phenotype ($218,842; confirmation p90 banked DD $26,313). A
   principal-loss failure never occurred without a banked-DD failure. The 40 % DD admitted giveback-heavy C21 centres
   (768 EXP-only centres; 3 EXP-only qualified members), none of them the most profitable.
3. **Envelope-adapted RA1 (S4 40 %) chose exactly what original RA1 (S4 35 %) chose** at both cutoffs.
4. **Retrospective next intervals (descriptive; previously inspected history):** EXP's P0 primaries did better than
   CTRL's (2022–2023 −$13,230 vs −$27,810; 2025–2026 +$58,652 vs +$16,049, lower DD); RA1 results were mixed; every
   searched primary was far below the informed benchmarks New L0 / N/original (+$87k–$97k per interval). One seed pair
   per cell on two correlated, inspected intervals: not evidence for adoption.
5. **Recommendation: keep the original NL0 method; a full N/original-scale successor search under this envelope is not
   warranted.** If pursued at all, a separately authorized, replicated study (more seeds and cells), possibly focused on
   the banked-DD gate's basis or level, is the informative next step.
6. **Integrity:** CTRL reproduced Assignment 3 exactly (8/8 lanes, 27/27 qualification records); GPU = CPU on every
   engineering comparison and every diagnostic cross-check; 0 CPU-scored official evaluations; **291,392 requested
   evaluations** (deterministic bound 693,652; ceiling 700,000). One post-freeze defect fix (A1, a crash before any
   selection output) and two test-script disclosures (D1, D2); no criterion changed.

## Reading order

1. `REPORT.md` — the full report (§0 summary; §2 gates; §3 budget; §4–§6 search, disagreement, qualification; §7–§8
   selection and hypotheses; §9 intervals; §10 D1–D3; §11 scaling, stresses, tails, margin; §12 limitations; §13
   recommendation; §15 regression).
2. `PROTOCOL.md` (frozen), `DECISION_REGISTER.md`, `AMENDMENTS.md` (P1–P9 pre-freeze; D1; A1; D2), `STANDARD_ADOPTION.json`,
   `history/TRANSITION.md` (the readiness proposal, byte-identical).
3. `results/tables/TABLES.md` and `results/tables/summary.json` — every table, machine-readable.
4. Sealed records (`results/seals.jsonl`): `results/protocol-freeze.json`, `results/engineering/gates.json` and
   `E1/`–`E6/`, `E2-*.json`; `results/search/C2x/{CTRL,EXP}.json`; `results/qualification/C2x.json`;
   `results/selection/C2x.json`; `FROZEN_SELECTION.json`; `results/doors/FULL-authorization.json`;
   `results/slices/C21-slice.json`, `results/slices/C24-validation.json`; `results/amendments/A1.json`.
5. Report-only analyses: `results/analysis/census-C2x.json` (policy disagreement, cross-assessment, archive-replay
   determinism), `results/diagnostics/population-C2x.json` and `primaries-C2x.json` (D1–D3, DD^L, interval windows,
   scaling, tails, margin examples).
6. Job records and attestations: `results/jobs/<job>/` (identity, events, receipts, telemetry), `results/gpu-attestations/`,
   `results/doors.jsonl`; regression: `results/regression/`.
7. `RUN_COMMANDS.md`, `EXECUTION_PLAN.md`, `chains/*.sh`, `RESEARCH_RECOVERY.md`.

## Identity and hashes

| Item | Value |
|---|---|
| Branch | `research/vg-l0-risk-envelope-pilot` (from the accepted Phase 7 lineage `fc027eed`); `main` untouched `3606f4b3` |
| Protocol | `PROTOCOL.md` sha256 `723eea5d96fb986bb3d285b62201895052d573b2e6154a6fe94e8302c5ef2e78`; freeze record `627017dc69d758a4…` (commit `8b06986e`) |
| Code digest | frozen `b61f771d195c…`; after amendment A1 `32166079a94ed3d7…` (`results/amendments/A1.json`) |
| GPU acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED); binary gb7 `cb2ff30b9cb720c0…`; RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`; evaluation digest `d1a2e490788fa5fa…`; out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json` |
| Standard / method | 3.0.0 `4e8244e65bf1dd7c…`; NL0 1.0.0 `9b387bb47ce02178…` |
| Data | GDX `77dba9b21c4b6849…`, VGT `2ee06310f2fa8926…` (Priority 3 pins; doors D21, D23, D24 byte-prefix pins in the freeze record) |
| Brief | `brief/BRIEF.md` sha256 `5a9dfe8f68d227be2dd429508691bf65574df6a975fa104e5d05c27e747723dd` |

## Not in this package (reproducible on Apollo)

Minute data (`data/GDX/data.csv`, `data/VGT/data.csv`, sha256 above); Assignment 3's `.sqlite.zst` populations
(`.cache/vg-l0-full-joint/jobs/*/archive.sqlite.zst`, untouched; never needed — the comparisons read sealed JSON); the
pilot's job archives and dataset caches (`research/vg-l0-risk-envelope-pilot/cache/jobs/{C21,C24}-{search,qualify}`,
`C21-slice`, `C24-validation`), the engineering and analysis archives (`cache/engineering/`, `cache/analysis/`) and the
per-lot row caches (`cache/lot-rows/`) — git-ignored, kept for audit until the user's review. Re-running a sealed stage
is refused by design; the census replays the searches from the archives with zero evaluations
(`tools/vg-l0-risk-envelope-pilot/census.ts`).

## Decisions left to the user

- Whether to keep the pilot branch unmerged (recommended until review) or merge any part; nothing was merged.
- Whether any follow-up (a replicated envelope study, or a banked-DD-specific study) should be authorized; none is
  recommended on this evidence beyond keeping the original method.
- When the git-ignored job archives may be compressed or removed.
