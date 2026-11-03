# Recommendation

**Retain the frozen benchmarks exactly as previously recommended: B5 (All-lowDd + GDX `portfolioAware`) as the optional
forward-test candidate, B4 (All-lowDd) as the defensible default. This study adds no ETF, removes no book and retunes
nothing.** Nothing here is a live-trading instruction.

## Why

1. **No configuration met the preregistered training standard.** 36,513 subsets of the 16 ETFs with jointly searched D1
   vectors were evaluated on training through one causal shared pool; 20 structurally diverse ones went through the full
   robustness battery; none passed all ten gates. The binding gate is the joint-parameter plateau (T6): moving every
   member's every parameter by one small step (X/stop/buffer/P ±0.5 point, Y ±0.1 point, hold ±1 day, L ±5, W ±10)
   leaves a median of only 20–73% of the training net, against the required 75%.
2. **The benchmarks fail the same test.** B5's joint-neighbourhood median is 55% of its training net (B4 58%, B1 70%),
   and only 25% of B5's neighbours keep the fixed-pool drawdown within $35,000. B5's training figure — like the search's
   leaders' — is a peak of a rough function: small parameter changes re-time a lot, which re-times which signal finds
   the pool free, and the effect cascades. This is a property of D1 shared pools in 2017–2023, not of one vector.
3. **The leading training result is a re-timed 2020, built from inspected vectors.** R1 = {XBI, XRT, KRE, GDX} — B5's
   books without VGT, with XBI/XRT/GDX retuned slightly and KRE's `lowDd` vector unchanged — made $467,806 on training
   (B5 $388,489) at a lower drawdown ($21,626 vs $26,510) and passed every gate except T6. But 95% of its advantage over
   B5 is 2020 (different XRT and GDX lots in the crash and recovery), its joint-neighbourhood median is 53% of its net,
   2,026 searched configurations beat B5's training net (a lead of this size is unremarkable for the maximum of a search
   this large), and its members are mostly the earlier studies' training-optimized, holdout-inspected vectors. It was **not**
   evaluated on holdout or final data and should not be treated as a candidate.
4. **Breadth does not help under one shared lot.** No subset of 12 or more ETFs met the $35,000 drawdown limit; the
   best 9–11-book subsets made about $290,000 with ~$33,000 drawdowns. The extra ETFs (EWZ, GLD, IWM, IWN, TLT, VOOG,
   XLE, XLF, XLU, XLY, XOP) contributed, at best, small additions to the four-ETF core.

## Caution flags

- B5's own acceptance by the previous study rested on one-parameter probes and seven post-training GDX lots, two of
  which carry its holdout/final gain. This study's joint-neighbourhood evidence weakens, rather than strengthens, the case
  for B5 over B4 as anything more than a forward test.
- The full-history maximum percentage drawdowns (March 2020) are 29.67% (B5), 34.65% (B4) and 33.89% for the
  unleveraged 60/40 core alone: the 30% ideal is a property of luck in one crash, not a guarantee.
- VOOG is tradable under the tested rules, but its training-period minute bars are thin (median 134 bars per session,
  311 shares per bar); any VOOG book would need execution-cost testing at real size first.

## What would count as evidence next

- **Forward data only:** sessions after 2026-10-13, run with the frozen B4/B5 vectors and rules (`npm run
  portfolio-aware-d1 -- run --config P-add-GDX --dataset all` for B5 once newer data exists; this study's
  `npm run joint-16-etf-d1 -- run --config B5|B4|B1` gives the same figures).
- **If a further study is wanted,** the finding to build on is the plateau test itself: rank configurations by their
  joint-neighbourhood median (or another smoothed objective) during the search rather than by the peak net, and
  preregister the plateau threshold from measured neighbourhoods of unoptimized configurations. That would be a new,
  separately preregistered study — not a re-run or re-ranking of this one.
