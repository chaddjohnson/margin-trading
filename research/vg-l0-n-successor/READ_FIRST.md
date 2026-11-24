# READ FIRST — Priority 5: comprehensive N/original successor optimization (P5-NS)

**Finding.** A GPU-funded, convergence-driven joint optimization of D1·VGT + D1·GDX + Growth·VGT (one exclusive $100,000
slot; S1 OFF; P0 = marked minute DD ≤ $35,000 = 35 % of the allocation) found **no materially stronger successor to
N/original**. Sealed, precommitted outcome: **NO MATERIAL IMPROVEMENT — keep N/original as the preferred research
incumbent and New L0 as the frozen benchmark.** Nothing was adopted, deployed, merged into `main` or sent to a broker.

| | Development 2016–2024 net / DD | Conf. robust / p90 DD | 2025–26 (previously examined) P&L / reset DD | Full net / DD |
|---|---:|---:|---:|---:|
| **N/original** (preferred incumbent) | $388,031.02 / $19,459.83 | $193,011 / $28,012 | $94,669.70 / $20,385.99 | $482,700.73 / $20,385.99 |
| New L0 (frozen benchmark) | $382,721.46 / $19,459.83 | $228,463 / $30,658 | $96,883.72 / $20,385.99 | $479,605.18 / $20,385.99 |
| Best informed (Track N, the formal C24 primary) | $391,852.16 / $19,459.83 | $201,276 / $27,015 | $94,669.70 / $20,385.99 | $486,521.87 / $20,385.99 |
| Best independent (Track F, C24 primary) | $289,140.53 / $28,508.07 | $168,164 / $33,500 | $31,010.33 / $34,380.49 | $320,150.86 / $34,380.49 |
| I1 (Priority 4; S1-enabled; sealed figures only) | $392,020.76 / $19,459.83 | (P4 instrument) | $102,353.23 / $20,385.99 | $494,374.00 / $20,385.99 |

- **Search effort:** 44.6 M official GPU evaluations (1,496 lanes; 2,963,404 proposals; 7,462 islands; 767,723
  refinement moves), **0 budget-bound lanes**, replicate seeds converged (two extra rounds at C19 only); CPU-scored 0.
- **Independent search (Track F):** converged ≈ $100k below the informed region and **failed chronologically**
  (sequential 2020–2024 −$35,959, DD $90,946; the 2020–21 and 2022–23 slices breached $35,000).
- **Informed search (Track N):** returned to N/original's plateau; best +$3,821 centre (+1.0 %), +$8,265 robust,
  −$997 p90 DD — below the precommitted bands (+$10,000 & +$5,000, or −$2,500 p90 DD); identical 2025–26 path. None of
  1,726 qualified C24 members meets either band; one came within $8 of the risk band (−$2,492, single seed; disclosed in
  `REPORT.md` §6.3).
- **Recommendation (brief option 2):** keep N/original as the preferred challenger and New L0 frozen; no further budget
  expansion of this space. Possible next hypotheses (not started): a pre-registered prospective record of N/original and
  New L0; a new protocol on why independently selected D1 parameters break across 2020 → 2022.

## Reading order

1. `READ_FIRST.md` (this file) → 2. `REPORT.md` (narrative, results, limitations) → 3. `DECISION_REGISTER.md` (scope,
adaptations, outcome decisions, **your outstanding decisions F1–F5**) → 4. `FINAL_CANDIDATES.md` (+
`reports/final-candidates.json`: every finalist's vector, ids, gates, criteria) → 5. `ROBUSTNESS_AND_RISK.md` →
6. `CHRONOLOGICAL_VALIDATION.md` → 7. `SEARCH_AND_CONVERGENCE_REPORT.md` → 8. `METHOD_AND_BUDGET_RECONSTRUCTION.md`
(Phase A) → 9. `GPU_PARITY_AND_ACCEPTANCE.md` → 10. `PROTOCOL.md` (frozen; sha256 `2a980c3b…`), `AMENDMENTS.md` (none),
`STANDARD_ADOPTION.json`, `results/protocol-freeze.json` → 11. `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`.

Machine-readable: `results/` (sealed records; `results/seals.jsonl` lists each with its sha256), `reports/tables/*.md` and
`summary.json`, `reports/diagnostics/*.json` (report-only), `results/references/I1-sealed.json`.

## How to inspect the bundle

- `sha256sum -c SHA256SUMS.txt` inside the extracted folder (every file but the checksum file itself).
- `IDENTITY.txt`: branch, commit, remote and its verified head at packaging; how to check out the exact tree.
- `OMITTED_ARTIFACTS.md`: what is not in the ZIP (job archives 196.0 GB, other caches 22.6 GB, market data, the GPU binary, caches) with
  paths, sizes, sha256 and how to restore or reproduce them.
- Source code is not copied: it is in the repository at the commit in `IDENTITY.txt` (`src/vg-l0-n-successor/`,
  `tools/vg-l0-n-successor/`, the study's chains), reproducible with `RUN_COMMANDS.md`.

## Intentionally omitted

Job archives (`research/vg-l0-n-successor/cache/`, 29 job SQLite archives, sha256 in
`reports/diagnostics/job-archives.sha256`), the pilot and engineering caches, market data (`data/`), the GPU binary
(`research/gpu-phase7/build/gb7`, sha256 `cb2ff30b…`), `node_modules`, and per-stage job logs. Visual reports: none (the
standing preference).

**No strategy has been adopted or deployed. Review this handoff before any successor decision.**
