# Amendments — bounded optimization-process audit (optimization-process-audit)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.

## Before the freeze

(none)

## After the freeze

### A1 — 2026-11-10T23:05Z — the G7 check mis-read the sealed encoding of non-finite values (engineering; no result changed)

- **What happened.** `results/stage1/reproduction.json` (sealed 2026-11-10T23:04:47Z) records 94 checks: G1–G6 pass
  (88 checks, including every published fold outcome and sequential path to the cent) and all 6 G7 checks fail. The
  G7 check read the subjects' sealed search records with plain `JSON.parse`; those records store an unmeasured
  neighbourhood's robust net and p90 DD as the strings `"__-Inf"` / `"__Inf"` (the subjects' store encoding), which
  the check compared with `null` instead of −∞ / +∞.
- **Change.** `g7Checks` decodes the sealed records with the subjects' own `decode` and compares exactly; the corrected
  G7 is sealed separately as `results/stage1/g7-recheck.json` (archive scan only, no fresh simulation). The failed
  record stays sealed and is reported. Dependent stages require either 0 failures in `reproduction.json`, or failures
  only in G7 **and** a committed G7 recheck with 0 failures (`assertParity`).
- **Results that existed.** The protocol freeze, the archive scans, the inventory and the reproduction record. A scratch
  check before this entry decoded the six sealed search records and found **0 mismatches in 3,571 entries**.
- **Effect.** None on any measurement, gate threshold or later stage; it corrects a comparison in the harness.

### A2 — 2026-11-10T23:21Z — erratum to the frozen POLICIES.md rationale (wording only; no formula, choice or result changed)

- **What.** `POLICIES.md` (frozen; sha256 in `results/stage2/POLICY_FREEZE.json`) says the neighbour-overlap share at C19
  was "0.26–0.98" and that "in 4A the median neighbour earns 64%–104% of its net inside the centre's leading-episode
  window". From `results/stage1/mechanism.json`: the C19 range is **0.26–1.00** (4A's C19 lower-drawdown holder has
  1.00), and the 64%–104% range holds for 4A **from C21 on** (4A C19 values: 0.96, 0.41, 1.01).
- **Why here.** The file is part of the sealed freeze and is not edited; this entry corrects its rationale text.
- **Results that existed.** Every Stage 1–4 record.
- **Effect.** None: the policies' formulas and choices do not depend on the rationale text. REPORT.md uses the
  corrected figures.

### A3 — 2026-11-10T23:21Z — operational: futility stop recorded; Stage 4 validation not run

- **What.** The sealed Stage 3 analysis classifies P1, P2 and P3 as "no demonstrated improvement", so by PROTOCOL.md
  §7.6 the C24 choices were frozen and committed (`results/stage4/C24_FREEZE.json`, `futile: true`) and
  `npm run opa -- stage4 validate` was not run (its code refuses under futility). No FULL door was opened by this
  study. The report tables are produced by `tools/optimization-process-audit/tables.ts` (outside the pinned code).
- **Effect.** As the protocol prescribes; no rule changed.
