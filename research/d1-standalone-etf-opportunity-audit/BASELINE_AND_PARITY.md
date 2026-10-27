# Baseline and parity

**Result: 486/486 checks passed** (2026-10-27T15:32:03.894Z → 2026-10-27T15:34:26.693Z; `results/parity/PARITY.json`). Nothing in this study was
compared before every check passed. The sample was preregistered in `results/parity/PARITY_SAMPLE.json` (written
2026-10-27T15:29:21Z, before any run of this study), chosen by symbol type and window, never by outcome.

## What was reproduced

1. **Stored source vectors (16):** the final representatives of VGT, GDX, XBI, KRE, XRT, SPLV (weak / low
   volatility), TLT (rates; a lot open at the cutoff), EWZ (emerging-market country), GLD (commodity trust), DBC
   (broad commodities, sparse, screened-down); the final `alternative-1` of GDX and XRT; the fold-a representatives of
   XBI and GDX (cutoff 2020-06-30; GDX open at the cutoff); the fold-b representatives of VGT and SMH (cutoff
   2021-12-31; SMH open at the cutoff). Each ran through the frozen N-book engine (the completed audits' runner) at its
   original cutoff, 5 bps and 11%, and matched the stored Stage A record in **every** field: trades, closed/open,
   wins, losses (exact); net, interest, friction, best/second/third/worst, mean, median, loss sum, minute and daily DD,
   nets by exit year (to the cent); occupied days (1e-6). The canonical file hash and the loaded-bars hash of every
   sampled symbol equal the source profile's, and every grid is identical.
2. **Engine reconciliation:** the source's Stage A used its trace + replay fast path; this study uses the full engine.
   They agree exactly. The one definitional difference is a lot open at the cutoff: the engine marks it at the close
   without exit friction, the source counts its liquidation value. This study adopts the source's
   liquidation-equivalent net (exit friction and interest to the last session) and keeps the engine's figure as
   `engineNet`; both reconcile to the cent (TLT final, GDX fold-a, SMH fold-b).
3. **Sealed same-window controls** (`research/d1-ranked-preemption/results/controls/final/CONTROLS.json`,
   2016-01-04 → 2023-12-29): VGT primary (B1), B5 (A) and B4 at 0, 2, 5 and 10 bps (fixed: lots, liquidation and
   engine net, minute and daily DD, interest, friction, held calendar days) and their 20% portfolios at 5 bps (end
   equity, max daily % DD, strategy net, lots, borrowing dollar-days).
4. **The brief's full-history anchors** (2016-01-04 → 2026-10-13, 5 bps, 11%), to the cent and 0.01 pp: S (VGT
   primary) $176,260.47 / $19,534.41 / 21 lots / $2,958,025.76 / 32.78% / 35.21%; B4 $284,244.74 / $28,659.34 / 76 /
   $3,608,484.05 / 34.65% / 37.01%; B5 $486,207.77 / $26,509.97 / 94 / $5,410,976.72 / 29.67% / 31.09%; C0
   $2,279,768.98 / 33.89% / 35.76%.
5. **Causality:** runs cut at 2022-06-30 close exactly the lots that the runs to 2023-12-29 close by then (same entry
   and exit minutes, reasons, prices and nets); the lots open at the cut are the same. Later bars cannot change an
   earlier outcome.

| Group | Checks | Passed |
| --- | ---: | ---: |
| data | 48 | 48 |
| stored | 304 | 304 |
| controls | 111 | 111 |
| anchors | 21 | 21 |
| causality | 2 | 2 |

### Headline checks

| Group | Check | Ours vs stored | Result |
|---|---|---|---|
| stored | final VGT representative d1-681c3ac3cc net (liquidation-equivalent) | 125218.3736 vs 125218.3736 | PASS |
| stored | final GDX representative d1-4f034dc898 net (liquidation-equivalent) | 185534.2581 vs 185534.2581 | PASS |
| stored | final XBI representative d1-7518b58e36 net (liquidation-equivalent) | 85550.4012 vs 85550.4012 | PASS |
| stored | final KRE representative d1-02baeb8699 net (liquidation-equivalent) | 109513.8216 vs 109513.8216 | PASS |
| stored | final XRT representative d1-9785d8d566 net (liquidation-equivalent) | 93378.4596 vs 93378.4596 | PASS |
| stored | final SPLV representative d1-304e0a9a8b net (liquidation-equivalent) | 45386.0615 vs 45386.0615 | PASS |
| stored | final TLT representative d1-ea2dfab02c net (liquidation-equivalent) | 44990.4599 vs 44990.4599 | PASS |
| stored | final EWZ representative d1-2c5ad02356 net (liquidation-equivalent) | 111646.7288 vs 111646.7288 | PASS |
| stored | final GLD representative d1-dc2b567bea net (liquidation-equivalent) | 36900.7739 vs 36900.7739 | PASS |
| stored | final DBC representative d1-66b1b89efe net (liquidation-equivalent) | 101029.5417 vs 101029.5417 | PASS |
| stored | final GDX alternative-1 d1-01537c2fa7 net (liquidation-equivalent) | 172183.9979 vs 172183.9979 | PASS |
| stored | final XRT alternative-1 d1-623fefcadd net (liquidation-equivalent) | 108443.3987 vs 108443.3987 | PASS |
| stored | fold-a XBI representative d1-a73f1d01d6 net (liquidation-equivalent) | 71747.4259 vs 71747.4259 | PASS |
| stored | fold-a GDX representative d1-04f8d2a5ed net (liquidation-equivalent) | 152011.6092 vs 152011.6092 | PASS |
| stored | fold-b VGT representative d1-a13304d396 net (liquidation-equivalent) | 106278.0663 vs 106278.0663 | PASS |
| stored | fold-b SMH representative d1-a7ee4a7929 net (liquidation-equivalent) | 119487.3185 vs 119487.3185 | PASS |
| controls | control B1 fixed 0 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 137222.9678 vs 137222.9678 | PASS |
| controls | control B1 fixed 2 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 136477.1735 vs 136477.1735 | PASS |
| controls | control B1 fixed 5 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 135359.0412 vs 135359.0412 | PASS |
| controls | control B1 fixed 10 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 133496.9766 vs 133496.9766 | PASS |
| controls | control B1 portfolio 5 bps (2016-01-04 → 2023-12-29) end equity | 1375791.0282 vs 1375791.0282 | PASS |
| controls | control B1 portfolio 5 bps (2016-01-04 → 2023-12-29) max daily % drawdown | 0.3277634163361198 vs 0.3277634163361198 | PASS |
| controls | control A fixed 0 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 396714.7854 vs 396714.7854 | PASS |
| controls | control A fixed 2 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 393666.5803 vs 393666.5803 | PASS |
| controls | control A fixed 5 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 388489.2579 vs 388489.2579 | PASS |
| controls | control A fixed 10 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 379867.2836 vs 379867.2836 | PASS |
| controls | control A portfolio 5 bps (2016-01-04 → 2023-12-29) end equity | 2270264.3255 vs 2270264.3255 | PASS |
| controls | control A portfolio 5 bps (2016-01-04 → 2023-12-29) max daily % drawdown | 0.2966781505859238 vs 0.2966781505859238 | PASS |
| controls | control B4 fixed 0 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 249173.8984 vs 249173.8984 | PASS |
| controls | control B4 fixed 2 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 246624.8990 vs 246624.8990 | PASS |
| controls | control B4 fixed 5 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 242196.0112 vs 242196.0112 | PASS |
| controls | control B4 fixed 10 bps (2016-01-04 → 2023-12-29) net (liquidation-equivalent) | 233867.1852 vs 233867.1852 | PASS |
| controls | control B4 portfolio 5 bps (2016-01-04 → 2023-12-29) end equity | 1677751.3328 vs 1677751.3328 | PASS |
| controls | control B4 portfolio 5 bps (2016-01-04 → 2023-12-29) max daily % drawdown | 0.3464613481592348 vs 0.3464613481592348 | PASS |
| anchors | S full history 2016-01-04 → 2026-10-13 fixed net | 176260.47 vs 176260.47 | PASS |
| anchors | S full history 2016-01-04 → 2026-10-13 fixed minute DD | 19534.41 vs 19534.41 | PASS |
| anchors | S full history 2016-01-04 → 2026-10-13 portfolio end equity | 2958025.76 vs 2958025.76 | PASS |
| anchors | S full history 2016-01-04 → 2026-10-13 portfolio max daily % | 0.3278 vs 0.3278 | PASS |
| anchors | S full history 2016-01-04 → 2026-10-13 portfolio max minute % | 0.3521 vs 0.3521 | PASS |
| anchors | B4 full history 2016-01-04 → 2026-10-13 fixed net | 284244.74 vs 284244.74 | PASS |
| anchors | B4 full history 2016-01-04 → 2026-10-13 fixed minute DD | 28659.34 vs 28659.34 | PASS |
| anchors | B4 full history 2016-01-04 → 2026-10-13 portfolio end equity | 3608484.05 vs 3608484.05 | PASS |
| anchors | B4 full history 2016-01-04 → 2026-10-13 portfolio max daily % | 0.3465 vs 0.3465 | PASS |
| anchors | B4 full history 2016-01-04 → 2026-10-13 portfolio max minute % | 0.3701 vs 0.3701 | PASS |
| anchors | B5 full history 2016-01-04 → 2026-10-13 fixed net | 486207.77 vs 486207.77 | PASS |
| anchors | B5 full history 2016-01-04 → 2026-10-13 fixed minute DD | 26509.97 vs 26509.97 | PASS |
| anchors | B5 full history 2016-01-04 → 2026-10-13 portfolio end equity | 5410976.72 vs 5410976.72 | PASS |
| anchors | B5 full history 2016-01-04 → 2026-10-13 portfolio max daily % | 0.2967 vs 0.2967 | PASS |
| anchors | B5 full history 2016-01-04 → 2026-10-13 portfolio max minute % | 0.3109 vs 0.3109 | PASS |
| anchors | C0 full history end equity | 2279768.98 vs 2279768.98 | PASS |
| anchors | C0 full history max daily % | 0.3389 | PASS |
| anchors | C0 full history max minute % | 0.3576 | PASS |

### Causality

- PASS — VGT primary: the run through 2022-06-30 closes exactly the lots the run through 2023-12-29 closes by then (12 closed, 1 open at the cut)
- PASS — GDX final representative: the run through 2022-06-30 closes exactly the lots the run through 2023-12-29 closes by then (32 closed, 1 open at the cut)

## Existing verifiers (Stage 0, before this study's code existed)

- `npm run pools -- verify`: all checks passed. `npm run vgt-robustness -- verify`: all checks passed. `npm run pools
  -- forward status`: the prospective freeze `407a669b…` verifies; observations 0.
- `npm run ranked-preemption -- verify` **fails one check, its code freeze**, because later studies (the B4/B5 and
  VGT audits) added `src/` files after it was frozen; its manifest spans every `src/**/*.ts`. Run in a detached
  worktree it **passes at its own commit `40da6ddf`** and fails identically at this study's parent `b21ed711`, before
  any file of this study existed. Its guard was not relaxed; its sealed records are verified by this study's census.
