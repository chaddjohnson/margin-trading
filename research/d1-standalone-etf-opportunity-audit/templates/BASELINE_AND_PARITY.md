# Baseline and parity

**Result: {{parity.passed}} checks passed** ({{parity.when}}; `results/parity/PARITY.json`). Nothing in this study was
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

{{parity.summary}}

### Headline checks

| Group | Check | Ours vs stored | Result |
|---|---|---|---|
{{parity.netChecks}}

### Causality

{{parity.causality}}

## Existing verifiers (Stage 0, before this study's code existed)

- `npm run pools -- verify`: all checks passed. `npm run vgt-robustness -- verify`: all checks passed. `npm run pools
  -- forward status`: the prospective freeze `407a669b…` verifies; observations 0.
- `npm run ranked-preemption -- verify` **fails one check, its code freeze**, because later studies (the B4/B5 and
  VGT audits) added `src/` files after it was frozen; its manifest spans every `src/**/*.ts`. Run in a detached
  worktree it **passes at its own commit `40da6ddf`** and fails identically at this study's parent `b21ed711`, before
  any file of this study existed. Its guard was not relaxed; its sealed records are verified by this study's census.
