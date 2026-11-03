# Recommendation: add no ETF to the All-lowDd allocator

**Decision: keep All-lowDd shadow unchanged (VGT `primary`, XBI/XRT/KRE `lowDd`). None of GDX, XOP, EWZ, TLT, XLE,
XLU or GLD merits addition.** VGT D1 alone remains the independent benchmark. Nothing was promoted to
`config/phenotypes/D1/`.

## Why: funded incremental profit, not standalone profit

- **The pool is busy when these ETFs dip.** On training data the All-lowDd fixed pool holds a lot in 51% of eligible
  sessions (71 lots, 2017-06-15 → 2023-12-29), and the deep dips of the candidates — 2018 Q4, March 2020, 2022 — are
  the same crises that arm VGT, XBI, XRT and KRE. Low daily correlation (GDX 0.16, GLD 0.05, TLT −0.16 with VOOG) did
  not translate into idle-time dips.
- **The idle-time dips do not pay.** Of the predeclared daily proxies, only 0–10 per ETF in six and a half years
  entered while the pool was idle and displaced nothing; at 5 bps per side and 11% interest they net −$758 (GDX,
  without its one +$7,336 episode), −$14,163 (XOP), −$33,445 (EWZ), −$19,209 (XLE); TLT and GLD have none, XLU one.
  Every candidate fails the predeclared economics gate; TLT, XLU and GLD also fail timing or breadth.
- **The real D1 agrees.** Minute-level D1 trades classified against the exact pool (post hoc, non-decisional): every
  candidate's fundable trades are worth less than the baseline trades they would displace — first-order incremental
  −$9,094 (GDX) to −$117,211 (XOP) for unchanged D1. The one candidate already optimized (XLE, eight-ETF program,
  $154,448 standalone in-sample) has **1 fundable trade out of 23**: optimization makes an ETF profitable alone by
  concentrating on crisis dips, which is exactly when the shared pool is full.
- **Not a data or cost artifact.** The result holds at 0 bps, for the 20% proxy, for the 230-session lookback, and
  for any plausible distribution yield (break-even 22.6% for XOP, 60.4% EWZ, 68.7% XLE; GDX's annual December payout
  falls only on its excluded best proxy).

## Risk and costs of the current choice

Unchanged from the existing evidence, re-verified exactly on the old horizon: fixed $100k All-lowDd shadow $294,675.77
net, minute DD $27,968.03; $300k portfolio $2,891,290.87 at 2025-10-13 with a **34.55% maximum percentage drawdown of
daily equity (36.92% minute-sampled), 2020-02-19 → 2020-03-23** — the 25.2% figure is the depth of the largest-dollar
episode, not the maximum percentage drawdown. VGT D1 alone (B): $2,346,272.33, 32.73% daily (35.17% minute). Both sit
above the user's 30% ideal; the All-lowDd daily figure is inside the 30–35% conditional band and its minute-sampled
figure above 35%. On the full canonical history (to 2026-10-13) All-lowDd ends at $3,661,933 with the same March 2020
maximum, and its strategy lost $8,083 in the final window. The earlier cost study found All-lowDd insensitive to 2–5
bps and slightly affected at 10 bps.

## What remains uncertain

- The screen is a daily proxy with predeclared thresholds; the minute-level diagnostics corroborate it, but no
  candidate was optimized, so the evidence that "no optimized phenotype could fit the idle windows" is indirect
  (strongest for XLE, where an optimized vector exists).
- Bid/ask spreads are unmeasured (no quote data); costs were modelled at 0–10 bps per side.
- Candidate distributions were not modelled (price-only, the frozen convention for non-VGT books); the sensitivity
  shows no sign change.
- Holdout and final windows of the candidates are untouched and remain available for a genuinely prospective test of
  any vector frozen in the future.

## Done in this work that stands regardless

- **Split registry completed:** XOP 1:4 reverse (2020-03-30, SSGA Form 8937) and XLE, XLU, XLY 2:1 (2025-12-05, OCC
  memos #57734, #57736, #57733) recorded with their source documents; `npm run market-events -- verify` finds no
  unexplained split-sized move in any of the 16 files. Before this, any canonical run of those symbols across those
  dates read a 287% gain or a 50% crash; no stored result depended on it.
- **New tests:** reverse and successive splits in the loader; a position held across a 1:4 reverse split on the
  standalone runner and on the allocator (both modes) equals the unsplit economy, and the unadjusted bytes book > $200k
  on $100k; standalone and allocator paths agree trade for trade across a split; the March 2020 maximum percentage
  drawdowns (32.7% / 34.6%) pinned against the 2025 largest-dollar depths; the study's training-only data access.

## Commands that reproduce the decision

```bash
npm run market-events -- verify
npm run complementary-etf-d1 -- audit
npm run complementary-etf-d1 -- screen        # selected: none
npm run complementary-etf-d1 -- diagnose
npm run complementary-etf-d1 -- parity
npm run complementary-etf-d1 -- regression
npm run complementary-etf-d1 -- stage-c       # verifies FROZEN_CANDIDATES.json (ae035671…): no candidate
```

No further work is critical. If you want direct optimizer-level evidence despite the screen, the only defensible
target would be GDX (the one candidate whose clean idle-pool proxies were positive with their best episode), run as
an explicitly exploratory, non-decisional Stage B under a protocol amendment.
