# Implementation audit

What was checked, by whom, and what deviated. Every check below was run on the final state of the study (Node
v24.21.0; logs under `results/logs/`, local and git-ignored).

## Integrity checks (deterministic)

| Check | Result | Record |
|---|---|---|
| Source census: sealed STAGE_A bodies, 611 profile/phenotype file hashes, three archives, the shortlist anchor | 16/16 | `results/inventory/source-checks.json` |
| Parity (preregistered sample, sealed controls at 0/2/5/10 bps, portfolios, full-history anchors, causality) | 486/486 | `results/parity/PARITY.json` |
| Base-run parity of all 21 tested vectors before any other Stage 3 family | 386/386 | `results/parity/BASE_PARITY.json` |
| Fold boundary parity (mark at each search-end close = stored Stage A net), 119 vectors | 100% | `results/analysis.json` `selection` |
| Bound price-only catalog recomputed identically by the analysis | identical | `results/catalog/catalog.json` |
| Per-lot accounting identity net = gross − interest − friction (every base lot) | largest error 1.1e-11 | `results/verify.json` |
| Protocol freeze and amendment chain | 34 bound files, amendment A1 (reporting) | `PROTOCOL_FREEZE.json` |
| Read-only inputs unchanged (64 data files + partitions, 72 config files, 824 prior-research files) | unchanged | `results/baseline/*` |
| Outside the study only `package.json` changed, by one script line; no untracked file outside | yes | `npm run standalone-opportunity-audit -- verify` |
| Every specified run stored with a matching specification hash (7,825) | yes | `results/runs/*.jsonl` |
| No research phenotype read after 2023-12-29 (every stored run ends on or before its window's end) | yes | final audit, `reviews/final-audit.md` |

`npm run standalone-opportunity-audit -- verify`: **all checks passed** (freeze with A1, baselines, isolation, census,
runs, accounting, fold parity).

## Tests and static checks

- Study tests (`src/d1-standalone-opportunity-audit/tests/`, bound by the freeze): **38/38** — episode catalog,
  attribution and dip capture, families and independence, deep condition, OAT and joint designs (common random
  numbers; VGT primary's design equal to the VGT audit's), shortlist independence from concentration and runs, door and
  CLI refusals, every flag threshold, F4/F8 states, standing, axes and the ETF rule.
- `npm test` (whole repository): **690/690**. `npx tsc --noEmit -p .`: clean. `npx eslint src/d1-standalone-opportunity-audit`: clean.
- Existing verifiers: `npm run pools -- verify` — all checks passed; `npm run vgt-robustness -- verify` — all checks
  passed; `npm run pools -- forward status` — the prospective freeze `407a669b…` verifies, observations 0.
- `npm run ranked-preemption -- verify` fails **only** its code-freeze check on this branch, because later studies added
  `src/` files after it was frozen (its manifest spans every `src/**/*.ts`). In a detached worktree it passes at its
  own commit `40da6ddf` and fails identically at this study's parent `b21ed711`, before any file of this study existed.
  Its guard was not relaxed; this study verifies its sealed records directly. (The worktrees held the tracked files
  and a link to `node_modules`; an attempted link to the canonical data landed inside the tracked `data/` folder
  instead of replacing it, so those runs saw only `data/partitions.json` — every check passed at `40da6ddf` all the
  same. The worktrees were removed afterwards and all 65 canonical data files re-hashed unchanged.)

## CLI demonstrations (every documented command run; outputs in `evaluations/`, git-ignored)

`list`, `compare`, `show GDX:representative`, `fixed XME:representative` ($216,939.72, 20 lots), `fixed
XME:representative --cost-bps 10` ($214,704.70), `fixed VGT-primary --portfolio` (strategy net $172,641.06 = the
sealed control), `fixed VGT-primary --end 2026-10-13` ($176,260.47 = the brief's anchor), `fixed source:fold-a:XBI`
($88,698.89 to 2021-12-31). Refused as designed: `fixed XME:representative --end 2024-06-28`, `fixed
config/phenotypes/D1/GDX.json`, `fixed source:fold-a:XBI --end 2022-01-03`. The `compare` view crashed on its first
demonstration (it read a field the revised standing record no longer has); it was fixed in report-only code
(`views.ts`, unbound) and re-run.

## Independent reviews

| Review | When | Outcome | Dispositions |
|---|---|---|---|
| Pre-freeze methodology (`reviews/methodology-review.md`) | 15:49→16:07Z | not ready: 3 critical, 9 major, 15 minor | all addressed before the freeze (`reviews/METHODOLOGY_DISPOSITIONS.md`) |
| Confirmatory (`reviews/confirmatory-review.md`) | 16:23→16:27Z | ready, conditional on N1–N5 | N1–N5 applied before the freeze |
| Final audit, fresh reviewer (`reviews/final-audit.md`) | ≈ 17:02→17:14Z | no critical; classifications exact; 3 major and 13 minor presentation items | all fixed in report text or amendment A1 (`reviews/FINAL_AUDIT_DISPOSITIONS.md`) |

## Deviations and disclosures

1. **Shortlist v1 → v2** after seeing v1's output (merit slots added; S5 changed no selection), before any candidate run.
2. **Catalog v1 → v2** after seeing the price-only v1 catalog (chained families merged eight years into one family for
   GDX, XME and SLV); the 126-session window was chosen after seeing those counts; independence is counted at 252.
3. **`SHORTLIST.json` regenerated at 16:16:08Z** (labels and two disclosure fields; same selection); the 15:37 bytes the
   first reviewer read (`d4d7b69d…`) were overwritten, not archived (amendment A1).
4. **Protocol miscount** of fold vectors (122/244 stated; 119/238 actual) — amendment A1; the code always enumerated the
   stored representatives.
5. **Amendment A1** is the only amendment; it is a reporting correction recorded after all outcomes, changing no rule.
6. The **ranked-preemption verifier** is checked at its own commit (above); detached worktrees in the session
   scratchpad were used for that and are not part of the study.
7. **Report text was corrected twice by verification against `analysis.json`** before the final audit (transcription
   slips and two false claims, e.g. "seeds agree") and once after it (the dispositions above).
8. Distributions of non-VGT ETFs are absent from the data (estimated in `PORTFOLIO_AND_CAPITAL_EFFICIENCY.md`); minute
   ordering, stop fills, liquidity, margin calls and the Vanguard 30-day rule are idealised or absent.
9. No network, broker, credential or download was used; no file under `config/`, `data/`, an earlier `research/` study or
   the prospective freeze's code closure was written.

## Git delivery

Only this study's files are committed: `research/d1-standalone-etf-opportunity-audit/` (logs excluded by the
repository's `logs/` rule), `src/d1-standalone-opportunity-audit/` and the one `package.json` script. The branch
`research/d1-standalone-etf-opportunity-robustness` is pushed to `origin` (no merge, no PR, no force). The commit hash
and the push confirmation are recorded in `RESEARCH_RECOVERY.md` by a follow-up commit (a commit cannot contain its own
hash).
