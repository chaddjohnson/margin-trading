# Protocol — walk-forward robustness failure investigation (New L0 family)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
replay). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This is a **diagnostic**: no search, no re-optimization, no new selection, no new rule. It explains why the walk-forward
(earlier-cutoff) procedures behind New L0 and its follow-ups selected VGT + GDX D1 + VGT Growth portfolios whose
subsequent drawdowns exceeded $35,000, and recommends methodology changes for the user's review.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.1.0`, sha256 `ac5c2c69987faa8d2b0dba7dfd452e278658167fa172ab210a8a2e8de7696f9b` |
| Read / adopted (UTC) | read in full before 2026-11-13T18:31:53Z (the first clock reading taken after the read, `date -u`) / adoption time in `STANDARD_ADOPTION.json` |
| Adoption manifest | `research/vg-l0-walk-forward-diagnostic/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-l0-walk-forward-diagnostic`) |
| Scope | `diagnostic` (standard §0.1: §1, §2.1, §3.4, §5, §6 apply; §5.8 and §2.9 where relevant; a diagnostic never searches) |
| Brief | `research/vg-l0-walk-forward-diagnostic/brief/BRIEF.md`, sha256 `fb939d2596623cdbc6abd83493f01343097d800d6f124e199fa699376a818d3e` |
| Branch / base commit | `research/vg-l0-walk-forward-diagnostic` from `73712149e5529beb6b2efca7f222a0a67347932d` (tip of `research/vg-l0-shadow-eligibility`) |
| Reference method | none reproduced. NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`) is read as the description of the audited procedure only |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | No roles and no primary: nothing is selected (`objective.prioritizes = not-applicable`, allowed for a diagnostic). The audited studies' sealed roles and primaries are the objects of study. |
| AD2 | §1.2, §1.4, §1.6 | adaptation (stricter) | FULL (2025–2026) is **never opened**. Only Priority 3's development byte-prefix doors D19, D21, D23, D24 are read, and only to replay already-sealed selections. Every slice replayed (2020–2021, 2022–2023, 2024) was already opened by the audited studies; nothing here feeds back into any selection. |
| AD3 | §4, §1.8 | adaptation | No search, no cutoff repeat, no new candidate (a diagnostic never searches, §0.1). Fresh simulations are bounded replays of sealed configurations (§7 cap). |
| AD4 | §5.1 | adaptation | No new engine. Each subject is replayed with its own study's evaluation code and must first reproduce its sealed fold record to the cent (gate G3, §12). |
| AD5 | §6.3 | adaptation | Diagnostics run no tuning benchmark (§6.3); in-process replays in one contained systemd unit; observed memory reported. |

## 1. Question, objective and outcomes

- **Question:** why did the earlier-cutoff (C19 → C21 → C23) procedures repeatedly select VGT + GDX D1 + VGT Growth
  portfolios whose 2020–2024 drawdowns exceeded $35,000, when the frozen New L0 (selected with later data) shows about
  $20,386 over full history; and what, if anything, should change in the optimization methodology before TSLA/MSFT?
- **Objects of study (sealed, not changed):**
  1. 5B L0 arm independent procedure (`research/vg-lifecycle-matched-optimization/`): −$29,358.01, sequential DD
     $67,214.22.
  2. Trading-session independent procedure (`research/vg-l0-session-hold/`): +$25,237.54, DD $58,866.62.
  3. Shadow-eligibility B1 fresh joint (`research/vg-l0-shadow-eligibility/`): +$71,407.39, DD $80,475.04.
  4. Shadow-eligibility B2 fresh sequential: −$11,516.74, DD $74,307.21.
  5. Context (records only, no replay unless a question needs one): Priority 2, Priority 3, 3B, 3C, 4A, 5B L1/L2, 7A
     sequential records and the process audit's archive reselection.
- **Outcomes:** for each hypothesis H1–H8 of the brief, one label: **directly verified**, **strongly supported but not
  proven**, **not supported**, or **unresolved**, each with numbers and source paths; a bug audit; ranked recommendations
  for review (no change is adopted). "No bug found" is a valid outcome and is said explicitly.

## 2. Prior knowledge and provenance

- All of 2016-01-04 → 2026-10-30 has been examined by Priorities 2–9, the process audit and Strategy Lab. The fold
  slices are not untouched; their outcomes were published before this study. This study is **retrospective
  diagnosis**, never precommitted out-of-sample evidence.
- New L0, C4, C4-refined, VG #2 (D) and every fixed control were chosen with later data in view; their 2020–2024 slice
  paths are **descriptive** (hindsight), never a walk-forward test.
- Already-sealed analyses reused, not repeated: the process audit's archive reselection and hindsight cohorts for 3B
  and 4A (`research/optimization-process-audit/`), 5B's episode-dependence diagnostics, the session and shadow studies'
  robustness tables.

## 3. Data, doors and windows

- Priority 3's byte-prefix doors (`.cache/vg-d1-growth-joint/doors/<SYM>-<D>.csv`, verified by size, sha256 and last
  row by Priority 3's `openPrefixDoor` before parsing):

| Door | Last session | GDX sha256 | VGT sha256 |
|---|---|---|---|
| D19 | 2019-12-31 | `528786451a8fa1ab40c3ba784937581d8a74d6ec088c9110f8655f64c3ac1e48` | `a2e4c721eee98fd0ad1f96f413c99c953b3804fdfe033c4e44e866d31dce81d1` |
| D21 | 2021-12-31 | `3f98c79b4f8d20b50a15e7d6951936b47cb00872dd27484f6dff9299a5402e84` | `681742034cde1b9d52580b50b8f0c7f02d3c6bc54b9428f3f427a788f9a2a60e` |
| D23 | 2023-12-29 | `a9ea93aaace8f2a7cc29988c366b8ea1c7888bee5e2072a0703ec4a16a71b002` | `920f3a20299b3241759fcc70b15045f4634ff3b7d423125c8abe87edbb5a812c` |
| D24 | 2024-12-31 | `f78dbe2a1f88666b0095bde886903af4453df79147bc96da7dc916011ff5094c` | `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb` |

- Common complete endpoint of the canonical files (recorded for the manifest only; FULL is not opened): 2026-10-30, as
  verified by the audited studies.
- Folds as executed by the audited studies: C19 trains on D19 (2016-01-04 → 2019-12-31), slice 2020-01-02 → 2021-12-31
  evaluated on D21; C21 trains on D21, slice 2022-01-03 → 2023-12-29 on D23; C23 trains on D23, slice 2024-01-02 →
  2024-12-31 on D24. Fold runs are continuous from 2016-01-04; slice P&L = marked net at the slice end − marked net at
  the boundary close; slice DD = the reset period DD after the boundary; the sequential path chains the fold primaries'
  slice marks with 5 bps on $100,000 per open lot closed or adopted at a switch, and its DD is not reset at boundaries.
- Door log: `results/doors.jsonl` (this study's own; the audited studies' logs are never written).

## 4. Subjects

- **S-paths:** the four objects of §1, each with its three fold primaries as sealed in the studies' `results/folds/`
  records (labels and ids taken from those records, never re-derived by a new rule).
- **Evaluated alternatives:** every row already evaluated on the same slice by the audited fold stages (role holders,
  seed-level replicate primaries, controls). Their sealed slice P&L and DD are read from the records; replays of them
  are allowed only for trade-level features (§6 D4).
- **Descriptive controls:** New L0 (fixed, chosen with later data) on the same slices; VG #2 (D) where already sealed.

## 5. Engine and conventions (unchanged; read from the audited code)

- One exclusive funded $100,000 slot; no compounding, preemption or simultaneous funded positions; same-instant order
  D1 → GDX → VGT; 5 bps per side inside fill prices; 11% simple interest on outstanding principal by calendar day
  (365-day year); fractional shares; Growth lifecycle L0; D1 shadow lifecycle; harmonized D1 arming from 2016-01-04.
- **Marked net** = realized + Σ open lots (shares × latest price − outstanding principal − accrued interest). **DD** =
  maximum minute drawdown of the marked net (strict tracker, every regular-session minute close while a lot is held and
  every session close), in dollars on the fixed $100,000.
- Code per subject (gate G3 decides acceptance):

| Subject | Code | How |
|---|---|---|
| 5B L0 | `src/vg-lifecycle-matched-optimization/life.ts` `runLife(…, 'L0')` = Priority 3's `run` | this branch's checkout (Priority 3's engine unchanged here; evaluation digests recorded by G2) |
| Shadow B1/B2, New L0 control | `src/vg-l0-shadow-eligibility/evaluate.ts` `run(door, quad, o, sh, detail, marks)` | this branch's checkout |
| Trading-session | `src/vg-l0-session-hold/unit.ts` `runUnit` at commit `18674b39` (branch `research/vg-l0-session-hold`) | a temporary detached worktree in the session scratchpad with copied (not linked) door files; removed at the end; never committed to |

## 6. Diagnostics (all report-only; hindsight labelled)

| ID | Diagnostic | Source | Fresh simulations |
|---|---|---|---|
| D1 | Experiment audit: folds, doors, slices, selection rule, gates, budgets, structures, parameter vectors, training statistics, slice results, sequential reconciliation (Σ slice nets − charges = net) | sealed records | 0 |
| D2 | Independent recomputation of every sequential DD (peak, trough) from the audited studies' fold mark caches (`.cache/<study>/folds/study/C*-closes.json`, the arrays the sealed DDs were computed from) and from this study's replays | caches; replays | 0 |
| D3 | Trade-level chronology of each fold primary on its slice: funded lots (book, entry/exit, net, interest, MAE, exit reason), refusals with occupants, slot occupancy, the top minute-DD episodes (peak, trough, recovery) and each lot's contribution to each episode (one slot: equity differences across the lot's open interval inside the episode window) | replays on the evaluation door | ≤ 40 |
| D4 | Causal family removal on the slice (each enabled family or book disabled, complete pooled replay): slice net and DD | replays | ≤ 120 |
| D5 | Selection trace: rank and training statistics of each fold primary inside its sealed qualified set; gates and confirmation tails; the same for the evaluated alternatives; rank correlation of training statistics with slice P&L/DD among evaluated rows; seed-level replicate dispersion (structures, parameters, slice outcomes) | sealed records | 0 |
| D6 | Training-versus-slice exposure: per subject, the training worst lot, worst MAE, lots, independent episodes, top-episode share (training-door replays) against the same on the slice | replays on training doors | ≤ 400 |
| D7 | Local versus chronological robustness: the fold primaries' sealed training neighbourhood statistics against their slice DD; optionally each fold primary's own sealed **selection** neighbourhood draws regenerated by the audited study's code and seeds and replayed on the slice (training-qualified neighbours: do they breach too?) | records; replays | ≤ 3,500 |
| D8 | Bug audit: door hashes and last rows; boundary indices; causal prefix (a training-door run equals the evaluation-door run to the boundary); sequential stitching and switch charges; maximum-hold semantics on the failing lots (calendar days vs sessions as configured); split/adjustment sanity (no unexplained single-minute price jumps > 15% in VGT/GDX door files over 2016–2024); accounting identity Σ lots = net | replays; door files | ≤ 60 |

- **Cap:** 4,200 fresh simulations in all, on development doors only; archive and record reads counted apart. A
  diagnostic that would exceed its row cap is reduced and the reduction disclosed, never silently expanded.
- **Hindsight rule:** no diagnostic chooses a candidate. Where an alternative did better on a slice it is reported as an
  oracle observation, never as something the procedure could have selected.
- **Labels:** every causal claim states whether it rests on a complete chronological replay (D4) or on descriptive
  attribution (D3); standalone or virtual trade P&Ls are never summed as a pooled effect.

## 7. Search, budget and stopping

Not applicable (no search). Budget: 0 distinct proposals; ≤ 4,200 fresh simulations (§6).

## 8. Robustness instrument

Not re-specified. D7 reuses each audited study's own neighbourhood function, radii, seeds and labels unchanged.

## 9. Gates and report-only evidence

No qualification gate is applied. The audited studies' sealed gate verdicts (Q1–Q6, V1–V3, chronological verdicts) are
reported as sealed and never relabelled (§2.8 discipline applies to every candidate named here).

## 10. Chronological procedure tests

None new. The sealed verdicts stand ("chronologically unsupported" for objects 1–4).

## 11. Validation plan

Not applicable: FULL is not opened (AD2).

## 12. Engineering gates (before any diagnostic is used)

| Gate | Requirement |
|---|---|
| G1 | Every audited record used verifies against its study's `results/seals.jsonl` (sha256) |
| G2 | Evaluation digests recorded: Priority 3 (`vg-d1-growth-joint/lab.ts` `codeDigest`) equals its sealed `147cad7c17eff3fa…`; 5B's and the shadow study's digests are recorded beside their sealed values |
| G3 | Each fold primary replayed with its study's code reproduces its sealed fold row to the cent: slice net, slice DD, boundary equity, whole net, whole DD, lots, ledger signature |
| G4 | D2's recomputed sequential DDs and nets equal the sealed sequential records to the cent |

A failed gate stops every dependent diagnostic until explained; it is reported, never hidden.

## 13. Resources and recoverability

- Replays run in transient systemd user units in `vgwfd.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one
  unit at a time, single process; observed memory reported.
- Results are written once to `results/` and sealed (0444, sha256 appended to `results/seals.jsonl`); a sealed record is
  never rewritten (a rerun writes a new, labelled file). Checkpoint: `RESEARCH_RECOVERY.md`.

## 14. Integrity

`results/protocol-freeze.json` records this file's, the brief's and the adoption manifest's sha256, `HEAD`, the door
pins and the audited authority files' sha256 (5B protocol `7e826064…`, amendments `ddccdb3d…`, sequential `7bf8c744…`;
session protocol `50e441c3…`, amendments `103032c0…`, sequential `e36d47c4…`; shadow protocol `fc6dbdcc…`, amendments
`054a7d67…`, sequential `7ee87c24…`).

## 15. Reporting commitments

- Written analysis, Markdown tables and machine-readable JSON/CSV only (standard §7.7); no charts or images.
- Every dollar figure from a sealed record or a gated replay, with its path; DD in dollars and % of the fixed $100,000,
  with dates.
- Retrospective diagnostics are kept apart from precommitted out-of-sample evidence; hindsight controls are labelled
  descriptive.
- Recommendations name the failure addressed, the evidence, the layer affected (optimizer, selection/qualification,
  risk evaluation, execution engine, strategy rules), what existing results can test, the future precommitted
  experiment, risks (including overfitting from gates invented after seeing failures) and relative cost. Any proposed
  standard amendment is drafted for review only; the standard and NL0 1.0.0 are not edited.
- Limitations: examined history, few independent events, hindsight selection, missing artifacts. Historical compliance
  with $35,000 is not a guarantee of future drawdown.
