# RESEARCH_RECOVERY — risk-envelope pilot (NL0-REP 1.0.0) — COMPLETE

**Top screen (times from `date -u`)**

- Updated: 2026-11-22T11:38:00Z. **COMPLETE.** Every stage done: engineering gates (E1, E3–E6 sealed; E2 from the official CTRL
  phases: 8/8 lanes, 27/27 qualification records), protocol freeze, official searches (16 lanes), union qualifications,
  C21 selection → D23 interval, C24 selection → frozen selection → FULL authorization → FULL validation once; census,
  CPU diagnostics, tables, report, regression; handoff ZIP (see Delivery).
- **Outcome (precommitted rule): worse** — Δ21 −$4,456.27, Δ24 −$21,830.38 (H1/H1′ fail); H2 holds (1 member); H3
  holds ($32,168 vs $45,820). Requested pilot evaluations 291,392 (bound 693,652; ceiling 700,000).
- Authority: `brief/BRIEF.md` `5a9dfe8f…`; `PROTOCOL.md` `723eea5d96fb986b…` frozen by `results/protocol-freeze.json`
  (`627017dc…`); amendments head **D2** (P1–P9, D1 pre-freeze; A1 code fix with `results/amendments/A1.json`; D2 test
  fix); code digest frozen `b61f771d…` → A1 `32166079…`.
- Running: nothing (`systemctl --user list-units 'vgl0rep*'`).
- Follow-up gate: the user's review in the original conversation (REPORT.md §13: keep the original method; no successor
  search recommended). Do not rerun any sealed stage; do not merge into `main`.

## Environment (verified 2026-11-22T09:52Z)

| Item | Value |
|---|---|
| Node | v24.21.0 (`.node-version` 24.21.0); every evaluating process `node --no-maglev` |
| GPU | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, 763 MiB used / 31,346 MiB free, idle |
| Jobs | none running (no research unit, no node study runner) |
| Disk | 624,335,704,064 B free on / |
| Acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED); out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json` |
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` 3.0.0 sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (= registry current) |
| Reference method | NL0 1.0.0 sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` |
| Data | GDX `77dba9b21c4b6849…`, VGT `2ee06310f2fa8926…` (Priority 3 pins) |

## Proposal files at the start (Phase 7 readiness package; byte-identical to READINESS_MANIFEST.json)

| File | sha256 |
|---|---|
| PROTOCOL_PROPOSED.md | `4f7c215fd586c7c4ec0f119b510e949da4ad9961a6c5a29fdd790f03cc4966d0` |
| DECISION_REGISTER.md | `c74390d2674683852556b446db9fca5f97cd94ea97081b5a319300551be33122` |
| EXECUTION_PLAN.md | `bd118e23d55a72f3694d77ae9a02bbb3df571fafe047d90eeaf5e6c14adf1f1b` |
| IMPLEMENTATION_PLAN.md | `64f154d9d46437e53b5fdd5868a75b76c2c2f53b96f9b1f40a784da35523cdaa` |
| DIAGNOSTICS_SPEC.md | `c722bc11918a10d87d2cdb6bca2f4d3dde8516257e467bd0dd0abdd10c6e5172` |
| SCALING_CHECKS.md | `55677725998e0f23ad632274930d7b8c9a1d44d4a384b9853ffd75cf1864b8f1` |
| README.md | `0f4480705f0cdb78420668ad2fe3a5ed1b6511a4ac835087f4c55a6a1c52d482` |

## Verified facts so far (from files)

- Hash-selected cell: min over the 63 non-legacy cells of sha256("vg-l0-risk-envelope-pilot/cell/" + id) = `GB0.VD1`
  (`0260e9f0…`); both pilot cells are in Assignment 3's `broad1` part.
- Sealed Assignment 3 CTRL lane `requested` (research/vg-l0-full-joint/results/search/*/broad1.json): C21 GA0.VA0 R1
  12,946, R2 18,170, GB0.VD1 R1 15,685, R2 24,513 (= 71,314); C24 8,584, 19,922, 16,933, 17,049 (= 62,488).
- Assignment 3's per-lane worst case (budgets.ts laneWorstCase, broad) = 40,642 → per-lane cap 41,000.
- N/original = Assignment 3 `FROZEN_SELECTION.json` finalist `C24/informed/GD.VB/R2#1 profit` (`rc1-f1a8b57cb02455c3`,
  cell GD1.VB0); FROZEN_SELECTION sha256 `4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7`.

## Guards

- No official pilot evaluation before: protocol freeze sealed + committed + pushed, E1–E6 passed and sealed.
- Never edit Assignment 3 / Assignment 2 / Priority 3 / Phase 7 source or sealed records; never merge or push `main`.
- D23 opens only after the sealed and committed C21 selection; FULL once, only after the sealed and committed C24
  selection and the door authorization record.
- Budget: ≤ 700,000 requested pilot research evaluations (deterministic bound verified before the first search).

## Stage table (all complete; sealed records in `results/seals.jsonl`)

| Stage | Unit / command | UTC | Record | Resume / guard |
|---|---|---|---|---|
| E4 + E3 | `chains/engineering.sh` (vgl0rep-eng, vgl0rep-eng2 START=7) | 10:22–10:37 | `results/engineering/E3/summary.json`, `E4/tests.txt` | non-official; D1 |
| E1, E5, E6 | verifier, preflight, official-preflight D21/D24 | 10:24–10:37 | `results/engineering/E1/`, `E5/`, `E6/` | — |
| gates, freeze | `$OFF gates`, `$OFF freeze` | 10:37:49, 10:37:59 | `gates.json` `57204e77…`, `protocol-freeze.json` `627017dc…` | sealed; commit 8b06986e pushed |
| search C21 CTRL | vgl0rep-C21-search-CTRL | 10:38:53–10:44:43 | `search/C21/CTRL.json` | sealed |
| search C24 CTRL | vgl0rep-C24-search-CTRL | 10:44:44–10:52:59 | `search/C24/CTRL.json` | sealed |
| E2 | `$OFF e2` | 10:53:00 | `engineering/E2-ctrl-equals-assignment3.json` (8/8) | sealed; ce91c2c7 |
| search C21 EXP | vgl0rep-C21-search-EXP (resumed job) | 10:53–10:58:41 | `search/C21/EXP.json` | sealed |
| search C24 EXP | vgl0rep-C24-search-EXP (resumed job) | 10:58–11:06:41 | `search/C24/EXP.json` | sealed; 92fd04bb |
| qualify C21, C24 + E2-q | vgl0rep-C2x-qualify | 11:06–11:07:52 | `qualification/C2x.json`, `engineering/E2-qualification-C2x.json` | sealed; 3be30d10 |
| select C21 | failed 11:07:53 (A1), resumed 11:10:11 | 11:10:11 | `selection/C21.json` | sealed; 124d7248 |
| interval C21 (D23) | vgl0rep-C21-interval | 11:10:31 | `slices/C21-slice.json` | sealed; 4ad7098f |
| select C24, freeze-selection, authorize-full | — | 11:10:31–32 | `selection/C24.json`, `FROZEN_SELECTION.json`, `doors/FULL-authorization.json` | sealed; b0ae2c0f, df827761, 37406602 |
| validate (FULL once) | vgl0rep-C24-validate | 11:10:56 | `slices/C24-validation.json` | sealed; 556de8b3 (pushed) |
| census C21, C24 | vgl0rep-census-C2x | 10:59–11:09 | `analysis/census-C2x.json` | report-only; archive replay identical |
| diagnostics | vgl0rep-diag | 11:12–11:20 | `diagnostics/*.json` | report-only (CPU) |
| regression | vgl0rep-regression | 11:21–11:37 | `results/regression/` | D2 |

## Do-not-rerun

Every sealed stage above (they refuse to rerun); the FULL door (opened once by the validation; diagnostics afterwards).
