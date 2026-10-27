# VGT standalone phenotype inventory

Written on 2026-10-27 before any new robustness experiment. At that point only two things had been run: the existing
regression (`npm run pools -- verify`) and the baseline parity (`npm run vgt-robustness -- baseline`). Sources were
found by searching `config/`, `research/*/`, `src/phenotype/`, `src/multi-etf-allocator/`, `src/app/` and `docs/`, then
spot-checked by hand. Nothing below was created, edited or re-hashed by this study.

## Result

**One runnable, registered and frozen standalone VGT D1 phenotype exists: `VGT / primary`.** The audit tests it alone.

- **There is no VGT `lowDd`.** The registry has no such phenotype, and neither does any pool, allocator or frozen
  manifest. The "All-lowDd" pool B4 uses VGT **primary**; its lowDd books are XBI, XRT and KRE.
- The only VGT vectors that carry a "lowDd" label are in-sample research picks of earlier studies (§C). None was
  registered, frozen or made runnable as a phenotype, so none is promoted here.

## A. Registered or frozen VGT D1 phenotypes (the tested set)

| ID | Registry entry | Eight parameters (X / Y / stop / hold / L / buffer / P / W) | Candidate ID | Parameter sha256 (pool pin) | Provenance | Frozen? | Semantics |
|---|---|---|---|---|---|---|---|
| **VGT-primary** | `config/phenotypes/D1/VGT.json` `primary` (file sha256 `3e77a419…`, one commit `3701df68`) | 21.6% / 0.3% / 7.3% / 8 d / 74 s / 2.9% / 9.0% / 60 s | `d1-ebc9f639b3` | `62978dff…11981b5` (`config/pools/B4.json`, `B5.json`) | The shipped constants of `src/app/allIn-trailingBuy-postExitContinuation.ts`. Selected by the VGT recovery-eligibility program and kept by VGT D1 refinement as "a local maximum" (`research/vgt-d1-refinement/RECOMMENDATIONS.md`). | Yes. It is pinned in B4, B5, the prospective freeze (`research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`), the frozen controls (benchmark **B1 = "VGT D1 alone (primary)"**) and the registry test (`src/phenotype/tests/registry.test.ts`, eight configurations, one of them VGT). | D1: net-profit trailing stop, post-exit continuation, the same entry rule. This is exactly the VGT book of B4/B5. |

Evidence that nothing else is registered:

- `config/phenotypes/D1/VGT.json` holds only `primary`.
- `src/phenotype/tests/registry.test.ts` pins the shipped set at exactly eight configurations, and VGT appears only
  as `VGT/primary`.
- `src/multi-etf-allocator/phenotypes.ts` refuses any VGT vector that differs from D1's shipped constants.

**How it is run here:**
- The standalone is a one-book pool: `[VGT primary]` through the frozen N-book engine
  (`src/portfolio-aware-d1/nbook/engine.ts`).
- The configuration is exactly what `src/pools/run.ts` builds: shadow policy, one $100,000 slot, 11% simple
  interest, stops at the stop, arming from 2017-06-15.

**Baseline parity** (`results/baseline/baseline.json`, 47/47 checks):

- **Frozen controls.** At 0, 2, 5 and 10 bps per side, fixed and portfolio, every summary field equals
  `research/joint-16-etf-d1/results/controls/controls.json` `all.B1.*`.
- **Existing standalone CLI.** At 0 bps (the strategy file has no per-side cost) it matches trade by trade on dates,
  times, fills, reasons, interest and net:
  `npm run app -- allIn-trailingBuy-postExitContinuation VGT all - - - <dir> --phenotype primary`
  ($178,574.30, 21 trades).
- **The B4/B5 VGT book.** The VGT book's 21 virtual trades inside B4 and B5 are the standalone's 21 lots. B4 funds 14
  of them, and B5 funds 12.

## B. Named VGT configurations of other strategy families or stop rules (excluded: not D1 phenotypes)

| Name | Family / difference from D1 | Where | Status | Why excluded |
|---|---|---|---|---|
| C2 swing "balanced" (K 55, Ys 0.6%, Z 0, stop 4.0%, hold 26, buffer 0.4%) | Swing-low no-dip entry. It has no X/L dip condition and no post-exit continuation. | `src/app/allIn-trailingBuy-swingLow.ts`; `research/vgt-d1-refinement/RECOMMENDATIONS.md` | In-sample alternative architecture ("a different strategy, not a D1 variant"); not a registered phenotype | A different strategy family. Its returns are not D1 performance. |
| C2-maxNet, C1-shipped (always-armed), C1-maxNet | Swing-low or always-armed entry | `src/d1-refinement/finalists.ts`, `allIn-trailingBuy-alwaysArmed.ts` | Rejected by vgt-d1-refinement | A different family, and rejected |
| B-A / B-B (gross-threshold / gross-breakeven stop), B-C (two-stage), B-D (always-active stop) | D1's eight parameters with a different stop rule | `src/app/allIn-trailingBuy-postExitContinuation-stop*.ts` | B-A and B-B gave the same trades as D1 on the research files and are a "cleaner formulation". B-C and B-D were rejected. | Different stop semantics. B-A/B-B are not materially distinct from D1, and B-C/B-D were rejected. |
| Shared-margin "B2" (gross-breakeven D1), "B3" (D1 with P 8.6%), P2s (a D1 + swing-low paper-book policy) | Labels and policies inside `research/vgt-shared-margin-portfolio` | `src/shared-margin-portfolio/strategy.ts` | Program-internal labels. The program recommended deploying D1 alone. | B2 is the same as D1; B3 is a research vector (§C); P2s is a two-strategy policy |
| Set 2, Trades2, and other pre-D1 file-4 variants | No post-exit continuation | `research/trailing-buy-variants/` | Superseded by D1 | Different exit semantics |

## C. Research-only VGT D1-architecture vectors (not promoted)

These are in-sample search candidates, finalists or screening representatives. None was registered or frozen, and
the studies that produced them kept D1 primary.

| Label | Vector (X / Y / stop / hold / L / buffer / P / W) | Source | Status |
|---|---|---|---|
| A2-lowDd | 22.4 / 0.8 / 7.8 / 8 / 82 / 2.4 / 9.0 / 60 | `research/vgt-d1-refinement/D1_LOCAL_OPTIMIZATION.md`; `src/d1-refinement/finalists.ts` | In-sample refinement, with Y at the box edge. It is documented only as a parameter vector, not as a file (`IMPLEMENTATION_AUDIT.md`). |
| A2-maxNet | 23.8 / 0.2 / 7.3 / 8 / 62 / 1.6 / 9.2 / 69 | same | In-sample. Its selection rule loses to frozen D1 on the earlier folds. |
| A1-p86 (= shared-margin B3), A1-p92w69, A1-p89w169, D3 (P 7.0%) | D1 with one or two of P/W changed | `research/vgt-d1-refinement/results/finalists/finalists.json` | In-sample plateau points |
| D2, D4, D5; J-postExit-lowDd / -balanced / -maxNet | Various | `research/vgt-recovery-eligibility/results/finalists/` | In-sample. The program reports negative walk-forward for the joint picks. |
| ranked-preemption VGT representatives (d1-5f38a1fd7d, d1-a13304d396, d1-681c3ac3cc), RP-final-DB-R2 VGT (d1-ec282fdd00) | Various | `research/d1-ranked-preemption/standalone/*/VGT.json`; `config/research-pools/d1-ranked-preemption/` | Screening "survivors" and research-only pools. No nominee was advanced. |
| diverse-d1 VGT books (T-u-f2/-f3 d1-3489531ebb / d1-f0fdf23844; T-s-f1…f5; J-s-f6/f8) | Various | `config/research-pools/diverse-d1-2026-10-26/`; `research/d1-diverse-pool-discovery/results/rounds/final/selection.json` | Research-only. They failed the final gates ("no advancement"). |

Different programs also define "lowDd" differently:
- vgt-d1-refinement: the lowest drawdown with net ≥ 80% of maxNet;
- recovery-eligibility and multi-etf-d1: the same with ≥ 75%.

**Disposition:**
- Evaluating any vector in §C as a "phenotype" would promote a search candidate after the fact, so none is run.
- §B entries belong to other families, or are reformulations with identical trades, so none is treated as
  apples-to-apples D1 performance.

## Runnable commands for the tested phenotype

```bash
npm run vgt-robustness -- fixed VGT-primary          # one $100,000 lot, all, 5 bps, 11%: every trade + summary
npm run vgt-robustness -- portfolio VGT-primary      # $300,000 60/40 core, 20% of equity per lot
npm run app -- allIn-trailingBuy-postExitContinuation VGT all --phenotype primary   # the existing CLI (0 bps)
```
