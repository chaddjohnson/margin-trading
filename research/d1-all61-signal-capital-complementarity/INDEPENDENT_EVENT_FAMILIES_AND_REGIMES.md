# Independent event families, regimes and lead/lag

**Evidence level:** descriptive, retrospective labels that never enter a decision. Sources: `results/leveld/LEVELD.json`
and payloads (`families`, `leading`, `dips`), `results/tables/leveld.md`, `npm run d1-signal-complementarity -- events
--view U --window T`. Definitions (PROTOCOL §6.4): a **cross-ETF family** clusters every decision of every member of a
view-window by an anchor window — it starts at the earliest unassigned decision and holds every decision within 10
sessions after it (inclusive), never chained to later ones; a family is counted **once** in every aggregate. Solo = one
ETF; market-wide = ≥ 10 ETFs. **Independent events** = families whose anchors are ≥ 252 sessions apart. Regimes are
the fixed G1–G13 calendar of the ranked-preemption study; broad shocks G2, G4, G7, G10, G12. Price dip episodes are the
standalone audit's catalog (zigzag 10% on daily closes).

## 1. How many distinct opportunities exist

| View-window | Families (w = 10) | Solo | Market-wide | Decisions in market-wide families | w = 5: fam / solo / mkt | w = 20 |
|---|---:|---:|---:|---|---|---|
| U-T (2017-06 → 2023-12) | 90 | 19 | 21 | **541 of 816 (66%)** | 145 / 39 / 20 | 59 / 15 / 17 |
| U-A (2020-07 → 2021-12) | 25 | 8 | 0 | 0 of 97 | 39 / 14 / 0 | 17 / 4 / 1 |
| U-B (2022-01 → 2023-12) | 34 | 1 | 9 | 200 of 334 | 54 / 4 / 9 | 20 / 1 / 10 |
| P-A | 28 | 1 | 5 | 68 of 195 | 46 / 6 / 3 | 17 / 0 / 6 |
| P-B | 41 | 1 | 23 | 487 of 595 (82%) | 70 / 4 / 25 | 23 / 1 / 15 |
| P-F (context) | 97 | 10 | 37 | — | 153 / 21 / 38 | 58 / 4 / 28 |

The conclusion is robust to the matching tolerance (5/10/20 sessions): counts move, the structure does not.

- **Two thirds of all uniform-rule decisions fall in 21 market-wide families.** The largest are the COVID crash
  (F025–F029, 2020-02-27 → 2020-05-14: 46, 55, 41, 19 and 29 ETFs), Q4 2018 (F011, 27 ETFs) and the 2022 bear market
  (F064–F067 and F072–F073, 17–25 ETFs each). By regime: G7 (COVID) 5 families averaging 38 ETFs; G10 (2022 bear) 18 families
  averaging 12 ETFs; G4 (Q4 2018) 4 averaging 10.
- **Asynchronous events are few and concentrated in a handful of ETFs.** The 19 solo families of U-T belong to XOP
  (12: two in mid-2017, Feb 2018, seven in 2019, Jan 2020, Jul 2021), XBI (3, spring 2021), EWZ (2, Oct 2021), XME (1, Jun 2021)
  and GDX (1, Aug 2023). They are exactly the volatile commodity/sector/EM books. Their 28 solo-family trades netted
  **+$4,718** in total — XOP +$21,084, XBI −$4,928, EWZ −$9,394, XME −$1,809, GDX −$235 (standalone, 5 bps): small and
  concentrated in one ETF. "Solo" means no other ETF signalled; it does not mean the B4/B5 slot was free (§3).
- **Fitted phenotypes are more synchronized in a crisis, not less.** P-B (fold-b A0s) has 82% of its 2022–23
  decisions in market-wide families and a single solo family; the 2022 sell-off appears as 19 G10 families averaging
  19 ETFs.
- **Window A (2020-07 → 2021-12) has no market-wide family under the uniform rule**: the rebound produced few deep dips
  (97 decisions across 61 ETFs, 25 families, 8 solo).

## 2. Independent events by ETF

Per ETF and baseline (`results/tables/leveld-per-etf.csv`, columns `independentIdleClean`,
`independentIdleCleanPositive`): on U-T against B5, the idle-clean decisions of most active ETFs fall in at most one or
two independent events, and **only one ETF (ILF, F7-thin) has idle-clean net > 0, in a single independent event**.
Under the frozen rubric, no ETF shows ≥ 2 independent positive idle-clean events with a positive total.

## 3. Shock versus off-shock regimes

Against B5 on U-T (non-members): 59 idle-clean decisions, 18 in broad shocks and 41 off-shock, but only **8 of the
off-shock ones were profitable**; against B4: 73 (22 / 51; 10 profitable off-shock). Idle-clean decisions by regime
(B5): G1 2, G2 1, G3 12, G4 12, G5 11, G9 10, G10 5, G11 6 — the slot is free mostly in quiet periods (mid-2018, 2019,
2021), when the few signals that arrive are weak; in the broad shocks the incumbents already hold the slot (§ occupancy).

## 4. Who signals first

In multi-ETF U-T families the first decision most often belongs to XOP (8), XBI (8), EWZ (7), KBE (5), GDX (5), XLE (5),
SMH (4), XRT (4) — the high-volatility books reach a 21.6% drawdown first. Leading is descriptive: the first signal of
a family is usually a falling-knife entry, not a better one (`RISK_AND_FALLING_KNIFE_CONTEXT.md`). Per-ETF leading
shares are in the payloads (`leading`).

## 5. Price dip episodes

The catalog finds 628 eligible dip episodes (223 major, ≥ 20%) across the 61 ETFs in the training era — the same
market declines seen many times (one sell-off ≈ dozens of correlated episodes). They are counts of price paths, not of
independent opportunities.

## 6. Reading

H0 is supported: the lucrative deep-dip signals cluster in a few broad shocks (COVID, Q4 2018, 2022) seen by many ETFs
at once, and the asynchronous remainder belongs to a few volatile ETFs whose isolated signals earned little (+$4,718 over 28 trades, almost
all XOP). H4: window A
(rebound) has almost no synchronized events and window B (decline) is dominated by them; complementarity measured in
one regime does not carry to the other (`EXACT_SHARED_POOL_COUNTERFACTUALS.md`).
