# Robust D1 pool discovery over an expanded ETF universe (Phase 2)

**Status: complete (2026-10-25). Verdict: no advancement — keep B5 (All-lowDd + the GDX `portfolioAware` book).**

| Question | Answer (evidence label) |
|---|---|
| Does selecting on the risk-aware neighbourhood score persist forward inside training (H1, G-WF)? | **No.** Robust pick at the 40th percentile of random controls in fold-a; no robust pick in fold-b. G-WF failed (E2). |
| Does peak selection persist? | Worse: bottom 3% of controls in both folds, validation drawdowns $49k / $69k (E2). |
| Is there a pool structurally different from B5 with comparable smoothed fitness (H2)? | Not found. The only passing finalist, GDX KRE XBI XLE, is a seeded-arm descendant of B5 (Jaccard distance 0.5). The unseeded arm's best (FXI SLV XLI XLK, S ≈ $199k) never reached the pooled candidates (E1). |
| Do non-US-equity mechanisms add smoothed pool value (H3)? | Not shown. GDX (real assets) is in every pick and finalist; EDV (rates) appeared in fold-a picks; no rates, credit or non-US member survived to the final round (E1). |
| What was nominated and evaluated on 2024–2026? | Nothing (G-WF failed). The benchmarks are retained. |
| R1/R4 on `all` (RETROSPECTIVE, inspected history) | Post-training fixed P&L $70k / $71k: about $28k more than B4 and about $27k less than B5. Labelled inspection only. |

Figures and caveats: [RECOMMENDATION.md](RECOMMENDATION.md) and the reports below. Amendments 1–3 are in
PROTOCOL.md §24. Amendment 1 was recorded after the pilot outcome and is disclosed as such.

**What this is.** Phase 2 of the robust D1 programme: the implementation and execution of the design reviewed in
`research/d1-robust-design-review/` (Fable 5.1, Phase 1, unmodified), with the user's approved changes. Which nonempty
subsets of an integrity-gated ETF universe — each member with its own eight D1 parameters — give stable net profit
through one causal fixed-$100,000 shared pool, ranked by a **risk-aware neighbourhood score** rather than a peak, and
does that selection procedure persist forward inside training?

**Who reads it.** The user; an independent reviewer; a later study that starts from these records.

## Documents

| File | Content |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) | the authoritative, frozen protocol (every constant mirrored in `src/d1-robust/context.ts`) |
| [APPROVED_DEVIATIONS_FROM_FABLE.md](APPROVED_DEVIATIONS_FROM_FABLE.md) | clause-by-clause traceability of every change to the Phase 1 design |
| DATA_AND_UNIVERSE_AUDIT.md, INGESTION_RUNS.md | every ETF attempted, rule outcomes, splits, liquidity, hashes, retries and cleanup |
| PILOT_CALIBRATION.md | the unoptimized random controls by cardinality and the mechanical calibration (`pilot_freeze.json` per window) |
| CACHE_AND_CAUSAL_PARITY.md | controls reproduction and the parity matrix |
| WALK_FORWARD_RESULTS.md | folds a and b, arms J (robust) and Q (peak), validation, G-WF |
| SEARCH_COVERAGE.md, POOL_FAMILIES_AND_REFINEMENT.md, NEIGHBORHOOD_ROBUSTNESS.md | the final round |
| FROZEN_SELECTION.json, HOLDOUT_FINAL_RESULTS.md | the selection freeze and the locked confirmation |
| RETROSPECTIVE_R1_R4.md | the four labelled R1/R4 `all` runs (inspected history) |
| IMPLEMENTATION_AUDIT.md, RECOMMENDATION.md | tests, parity, determinism, hashes; the recommendation |

## Runbook (Node v24.21.0; `npm run robust-d1 -- <command>`)

```bash
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH   # engines ≥ 24.21.0
npm run robust-d1 -- commit-draft                    # pre-ingestion commitment of the protocol text (done once)
npm run robust-d1 -- ingest XLV XLP …                # Tier 1, then Tier 2 (download → import --keep-source → verify → cleanup)
npm run robust-d1 -- ingest XLB --resolve            # a split-blocked symbol after its split is registered with a source
npm run market-events -- verify                      # the full split and ledger verifier, once per batch
npm run robust-d1 -- audit                           # eligibility D1–D5 → results/audit/universe.json
npm run robust-d1 -- benchmark                       # unit costs (no P&L printed) → results/benchmark/tier.json
npm run robust-d1 -- freeze-protocol --changes research/d1-robust-pool-discovery/results/changes-since-commitment.txt
npm run robust-d1 -- controls                        # B1/B4/B5/C0 reproduced to the cent
npm run robust-d1 -- parity                          # P0–P4 on the expanded universe
npm run robust-d1 -- pilot --window fold-a           # likewise fold-b, final (pilot_freeze.json each)
npm run robust-d1 -- walkforward --round fold-a      # arms J and Q → PICKS.json (write-once)
npm run robust-d1 -- validate --round fold-a         # opens validation bars only after PICKS.json
npm run robust-d1 -- walkforward --round fold-b && npm run robust-d1 -- validate --round fold-b
npm run robust-d1 -- gwf                             # the procedure gate (write-once)
npm run robust-d1 -- determinism                     # library + first 2,000 fold-a J evaluations re-run, byte for byte
npm run robust-d1 -- search                          # the final round (unseeded + seeded arms)
npm run robust-d1 -- freeze-selection                # FROZEN_SELECTION.json, always (incl. no advancement)
npm run robust-d1 -- confirm-b                       # the independent reporting batch (after the freeze)
npm run robust-d1 -- evaluate                        # with nominees once (then --confirm); here: the no-advancement record
npm run robust-d1 -- research-run --config R1 --mode fixed --dataset all --cost 5 --acknowledge-retrospective   # ×4 (R1/R4 × fixed/portfolio)
npm run robust-d1 -- amend --stage <stage> --change "…" --reason "…" --outputs <paths>   # a technical amendment before a stage's first output
npm run robust-d1 -- tables
```
