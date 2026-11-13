# Protocol — Assignment 1: New L0 risk-aware successor foundation (engineering and governance)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
real-data run). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This study is the foundation for a later search for a more risk-robust successor to the frozen **New L0 primary:
VGT + GDX**. It adopts the user-approved standard 2.2.0 and builds, specifies and verifies three optional D1 risk
controls (`SPECIFICATION.md`). It does **not** search, optimize, select, rank, deploy or replace anything. Its outcome is
pass/fail engineering gates and a handoff for Assignment 2.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.2.0`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` (the version this assignment introduces, registered before adoption) |
| Read / adopted (UTC) | 2.1.0 read in full before 2026-11-13T22:45:01Z; 2.2.0 written, reread and registered before the adoption time in `STANDARD_ADOPTION.json` |
| Adoption manifest | `research/vg-l0-risk-controls-foundation/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-l0-risk-controls-foundation`) |
| Scope | `diagnostic` (standard §0.1: bounded runs of a frozen selection that open validation data; no search) |
| Brief | `research/vg-l0-risk-controls-foundation/brief/BRIEF.md`, sha256 `4a2e14f3f923196ab517810e34a74562f25b61b5c2b1a27efa01f2ecdab1c3a5` |
| Branch / base commit | `research/vg-l0-risk-controls-foundation` from `38222fb9acc964f168169db5de75eb0deb317160` (tip of `research/vg-l0-walk-forward-diagnostic`) |
| Reference method | none reproduced. NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`) is read as the record of New L0's origin and conventions only, and is not edited |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | No roles and no primary: nothing is selected (`objective.prioritizes = not-applicable`). |
| AD2 | §4, §1.8 | adaptation | No search, no earlier-cutoff repeat and no chronological verdict, so the §1.8 consequence does not arise (a diagnostic never searches, §0.1). Assignment 2's protocol must declare it (handoff §7). |
| AD3 | §1.2, §1.4 | adaptation (stricter) | FULL (2016-01-04 → 2026-10-30) is opened **only** to reproduce the frozen New L0 under legacy defaults: an already-validated selection with published full-history figures. It is guarded by 5B's sealed, committed `FROZEN_SELECTION.json` and Priority 3's frozen-selection guard. No non-default control is ever run on FULL. |
| AD4 | §5.1 | adaptation | The engine is a research extension (`src/d1-risk-controls/`), not a new strategy engine. Canonical parity is gate G1–G4: trade by trade, zero tolerance, for New L0 and for seeded random configurations. |
| AD5 | §5.9 | adaptation | Not applicable: there is no fold primary or final candidate. The §5.9 instruments are designed for Assignment 2 in the handoff. |
| AD6 | §6.3 | adaptation | No tuning benchmark (diagnostic); one contained systemd unit at a time; the observed memory is reported. |
| AD7 | — | study rule | **No performance figure of a non-default control on real data.** Non-default controls run on real data only on the development doors D21 and D24, for invariants, causality and determinism. The records keep pass/fail counts and output hashes, never a net, drawdown or trade P&L. Assignment 2 must precommit its boxes without having seen how any control performed here. Synthetic demonstrations show exact records. |

## 1. Question, objective and outcomes

- **Question:** can the three D1 risk controls be implemented with exact legacy parity, realistic and causal execution,
  documented semantics and versioned identities, so that Assignment 2 can optimize and compare them without guessing
  at mechanics or touching historical controls?
- **Outcomes:** each gate G0–G7 passes or fails. A failure stops the dependent work and is reported; the legacy engine
  is never changed to make a gate pass.

## 2. Prior knowledge and provenance

- All of 2016-01-04 → 2026-10-30 has been examined by earlier studies, the walk-forward diagnostic and Strategy Lab. New
  L0 was chosen with later data (an informed lane; NL0 §1.2). Its full-history figures ($479,605.18 net, $20,385.99
  minute DD, 46 lots) are published (5B `results/validation/validation.json` row R01; Priority 6 parity).
- The walk-forward diagnostic (`research/vg-l0-walk-forward-diagnostic/REPORT.md`) motivates the controls. It found no
  implementation defect.

## 3. Data, doors and windows

| Door | Use | Guard / pin |
|---|---|---|
| D19, D21, D23, D24 | New L0 legacy parity (G3); random-configuration parity (G4, D21 and D24); non-default invariants and causality (G5, D21 and D24) | Priority 3's byte-prefix pins (size, sha256, last row), verified by `openPrefixDoor` before parsing |
| FULL | New L0 legacy parity only (G1) | canonical files `data/GDX/data.csv` `77dba9b2…`, `data/VGT/data.csv` `2ee06310…`; 5B `checkFullGuard` (sealed, committed `FROZEN_SELECTION.json` `cd223a0d…`) and Priority 3's guard (`e29e35e2…`) |

Doors are opened quietly (no write to any other study's log) and logged in this study's `results/doors.jsonl`.

## 4. Subjects

- **New L0** (`67cfdd9b62d1e16f`, Priority 3 quad `a2e385640ca61012`, Growth·VGT `6b5f909b30cfa516`): 5B
  `FROZEN_SELECTION.json` (sha256 `cd223a0d…`) `crossTestSubjects[R01]`, canonicalized with 5B's `canonicalOf('V', …)`,
  options `{ enabled: { 'G:GDX': false } }`. Its identities are checked on load.
- **Random configurations** (G4): genomes drawn uniformly on 5B's coarse and fine grids (`levelsOf`, `decode`), all
  inclusions V, G and B, from `deriveSeed`-free seeded generators (seed 20261113 + index), recorded by identity.
- **Random controls** (G5): seeded draws over the schema's valid values for both D1 books, independently per book,
  covering every family A–D and the gate. They are recorded by canonical JSON. Their outcomes are never reported (AD7).
- **Synthetic scenarios:** `src/d1-risk-controls/tests/` (fixtures, scenarios) and the demonstrations (§12, G6).

## 5. Engine and conventions (unchanged)

Priority 3's pooled engine: one exclusive funded $100,000 slot, same-instant order D1 → GDX → VGT, 5 bps per side, 11%
simple interest per calendar day (365-day year), stops at the stop level or the gapped open, fractional shares,
harmonized D1 arming from 2016-01-04, the shadow (virtual-book) lifecycle, Growth lifecycle L0. Calendar-day maximum
holds. Shadow-entry eligibility OFF (no such path exists in the runner). Growth·GDX disabled.

## 6.–11. Space, search, robustness instrument, qualification, chronology, validation

Not applicable: nothing is searched, ranked, qualified or validated (AD1, AD2).

## 12. Engineering gates

| Gate | Requirement (all exact, zero tolerance unless stated) |
|---|---|
| G0 isolation | `git diff --stat 38222fb9 -- src apps config` touches only `src/d1-risk-controls/**` and `src/research-standard/**`. Evaluation digests equal their sealed values: Priority 3 `147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88`, 5B `3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b`, shadow `54304b69941e0481d5d36d52c30e76e724596dadd803c6e41489a3633e8c878e`. `git diff 38222fb9 -- research` touches only this study's directory. |
| G1 New L0 full history | Priority 3's legacy `run`/`evaluate` on FULL equals the sealed 5B R01 `record` in every field. With legacy controls, `runWithControls` / `evaluateWithControls` equal Priority 3's: every virtual trade of every book; every funded lot (book, entry and exit instants, raw and cost-adjusted prices, exit reasons, shares, principal, interest, proceeds, net, costs, MAE/MFE); every funding decision (outcome, reason, occupant); every recorded minute-mark change; the minute, daily and period drawdowns; the daily marks; the record. Headline: $479,605.18 net, $20,385.99 minute DD, 46 lots. |
| G2 development ledger | The D24 run's 34 funded lots equal 5B's sealed development ledger (`results/diagnostics/ledgers/C24_L0_informed_R1#1_profit/L0/lots.csv`), field by field as that file records them. |
| G3 New L0 slices | On D19, D21, D23 and D24, the controlled runner with legacy controls equals Priority 3's run as in G1. The D24 record equals 5B's sealed C24 evidence (net $382,721.46, DD $19,459.83, 34 lots, ledger signature). |
| G4 random parity | 60 random configurations × {D21, D24}: the controlled runner with legacy controls equals Priority 3's run as in G1 (books, lots, funding, marks, drawdowns, record). |
| G5 non-default invariants | 120 random (configuration, controls) pairs on D24, and their causal prefixes on D21. Checks: (a) determinism: two runs are byte-identical; (b) causality: every virtual trade decided and closed by the D21 end is identical on D21 and D24, and the D21 run holds nothing the D24 run does not; (c) accounting: Σ funded lots = net, no two funded lots overlap, every funded lot's fills equal its virtual trade's fills; (d) independence: a book without controls equals its legacy book; Growth books equal Priority 3's; (e) protective exits: never on the entry session; a stop-level fill equals L; an opening or minute-open fill is ≤ L; every protective net < 0; (f) holds: under `disabled` no maximum-hold or buffered-loss exit; under `adaptive` every maximum-hold exit is ≥ its effective hold, which is the base or the extended bound; (g) gate: no decision while blocked; every block ends within its cooldown or by recovery; well-formed event sequences. Only pass counts and hashes are recorded (AD7). |
| G6 tests and demonstrations | The module tests, the preflight tests and the full `npm test` (in a unit) pass, apart from the known pre-existing failures (7: `allin-original.ts` ×6 and the Study 7 data-end test). Every non-default mode has a deterministic synthetic demonstration whose expected exit or blocked-entry record is asserted (`results/demonstrations.json`). |
| G7 frozen work intact | `npm run research-preflight -- --all` passes every study (earlier pins with retained-pin notices). Every sealed record of the audited studies still verifies against its `seals.jsonl`. No sealed file is modified (`git diff 38222fb9 -- research` as in G0). |

A failed gate stops every dependent step until explained; it is reported, never hidden.

## 13. Resources and recoverability

- Real-data gates run one at a time in transient systemd user units in `vgrcf.slice` (MemoryHigh 44G, MemoryMax 48G,
  MemorySwapMax 0), single process; observed memory reported.
- **Cap:** 2,000 fresh simulations in all (G1 4, G2 0 (from G3's D24 run), G3 8, G4 240, G5 ≤ 720 (120 × (2 on D24
  + 1 on D21 + up to 3 independence reruns)), plus dry checks). An overrun is disclosed, never silent.
- Records are written once to `results/` and sealed (0444, sha256 in `results/seals.jsonl`); a rerun writes a new,
  labelled file. Checkpoint: `RESEARCH_RECOVERY.md`.

## 14. Integrity

`results/protocol-freeze.json` records this file's, the brief's, the specification's and the adoption manifest's
sha256, `HEAD`, the door pins, the code files of `src/d1-risk-controls/` with their sha256, and the sealed digests of
G0.

## 15. Reporting commitments

- Written analysis, Markdown tables and JSON only (standard §7.7); no charts or images.
- Legacy parity reported with full-history and slice figures of the frozen New L0 only (already published).
- No performance figure for any non-default control on real data (AD7). Synthetic demonstrations are labelled
  correctness demonstrations, not performance claims.
- Limitations: examined history; protective stops are not loss caps; the $35,000 ceiling is a research criterion, not
  an enforceable loss limit.
