# AMENDMENTS — Priority 4 staged trailing stops (append-only)

Each entry: ID, UTC time (`date -u`), the change, why, which results existed, its effect. Engineering entries (`E*`)
refine the E0 specification before the protocol freeze; after the freeze, disclosures `D*`, operational `O*` and code
`A*` amendments follow the protocol's rules.


## E1 — 2026-11-23T14:30:20Z (recorded; changes made 2026-11-23T12:50Z–13:00Z, before any official evaluation) — the Growth staged runner and disabled-book semantics

- **Change.** RULE_SPECIFICATION §5 listed `src/vg-d1-growth-joint/books.ts` (`simulateGrowth` / `runGrowthBook` passing
  an optional `staged`). That directory is a frozen legacy-runner directory pinned by the GPU entrypoint audit, so the
  edit was reverted (the file is byte-identical to its base) and the staged Growth runner lives in
  `src/d1-risk-controls-rc3/growth.ts` (`simulateGrowthStaged` / `runGrowthBookStaged`: copies of Priority 3's functions
  with the option; `tests/pooled.test.ts` proves them equal to Priority 3's for both comparators and every stress when
  the stage is absent). **Disabled books** (an option set that disables a book — removals, `d1only`, `gonly`, …): a
  staged configuration is validated against every book's τ₁ regardless of the options; the stage runs only on enabled
  books; counters are reported only for books whose stage ran; the identity comes from the full configuration. CPU and
  GPU implement it identically (Phase 8 parity, option sets).
- **Why.** The entrypoint audit (frozen legacy directories) and an undefined case of the E0 text.
- **Results existing:** engineering only (development parity); no study evaluation. **Effect on the rule:** none.

## E2 — 2026-11-23T14:30:20Z — the study's evidence identity

- **Change.** Assignment 3's `describeEvidence` sets the evidence `id` from the base configuration (`riskId2`), which
  ignores the staged genes; the study's qualification (`src/vg-l0-staged-stop/qualify.ts`) now overrides it with the
  staged-aware identity (`expSpace.cfgId`: the existing identity when OFF, `st1-…` when ON), so an ON member and its
  all-OFF projection never share an evidence id (the selection's maps, the interval subjects and the decomposition use
  it). Found by code review before the engineering dry run; the dry run (`results/engineering/dryrun/`, 11/11 checks,
  non-official, `DRY` seeds) verifies it.
- **Results existing:** none of the study. **Effect on the rule:** none.
