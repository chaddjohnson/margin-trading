# Mechanism selection (5C) — what is tested, what is not, and why

Predeclared before any momentum result (with `FIRST_PRINCIPLES_AND_HYPOTHESES.md` §5 and `MECHANISM_CATALOG.json`
v1.1, which holds every exact definition, default and parameter box). Bound by the protocol freeze.

## 1. The prototype panel

| Panel | Mechanism (5A) | Group | Type | Own OUT | Search dims (incl. h, t) |
|---|---|---|---|---|---:|
| E01 PP | M01 peak proximity | G1 level | hysteretic level | dd ≥ d_out | 4 |
| E02 HD | M02 financing-hurdle drift | G2 rate | hysteretic level | A_N < a_out | 5 |
| E03 ER | M07 directional efficiency (variant of E02) | G2 rate | hysteretic level | ER ≤ e_out | 5 |
| E04 CU | M03 two-sided CUSUM | G3 sequential | level | down-CUSUM ≥ h_out | 5 |
| E05 RF | M04 rising floor | G4 structure | event | close < floor (1 − b) | 4 |
| E06 CV | M05 calm advance | G5 volatility | hysteretic level | σ_10 ≥ v_out or N-return < 0 | 5 |
| E07 BA | M06 breakout acceptance | G4 structure | event | 20-session low close | 4 |
| E08 CE | M08 compression → expansion | G4 structure | event | close < entry box low | 4 |
| E09 TB | M09 upward trailing buy (minute clock) | G7 intraday | intraday event | 20-session low close | 3 |
| E10 TH | M09-B breakout trailing buy (minute clock; variant of E09) | G7 intraday | intraday event | 20-session low close | 3 |
| E11 DP | M11 durable permission + fast trigger | G8 campaign | event (permission) | permission OFF | 4 |
| E12 PC | M10 shallow-pullback continuation | G4 structure | event | close < pullback low | 4 |

Exploratory, descriptive only (never searched or selected): **X-CS** (M15 closing strength) at its defaults.

## 2. Brief A–K coverage

| Brief seed | Where it is tested | Note |
|---|---|---|
| A upward trailing buy + immediate protective exit | E09 (rebound from the post-exit low), E10 (breakout above the exited high), TPL stops active from the fill bar | two different price paths, as the brief asks |
| B shallow-pullback continuation | E12 | uptrend prerequisite first; not a small D1 dip |
| C rising floor | E05 (entry and own OUT), X3 (as an exit) | causal zigzag pivots |
| D default-long with defensive absence | E01 (long near the high, absent after a drawdown), Z2 (volatility-scaled always-in sizing), C-ALR (reference) | continuous leverage shown, not recommended |
| E acceptance / reclaim after breakout | E07 (persistence above the level) | covers persistence, **not** a retest-and-reclaim pattern |
| F directional efficiency | E03 (with an 11% drift floor) | grouped with E02 |
| G expansion after consolidation | E08 | few events expected |
| H progressive commitment | Z1 (tranches) | matched-capital reporting |
| I progress/time economics exit | X6a (maximum hold), X6b (stall vs financing), X6c (indefinite) | |
| J hysteretic state machine | hysteresis in E01–E04/E06; A3 single-threshold ablation; E11's three states | churn measured |
| K renewable campaign / independent re-arming | campaign state, R0–R5 and R3F, E11 | first entry vs re-entry split |

Beyond A–K: E04 (sequential CUSUM drift detection), E06 (volatility-regime calm advance), E02's explicit financing
hurdle, E11's durable permission, X5b (probation with cheap invalidation), A1 (exhaustion filter), A2 (weekly clock).

## 3. Exits, re-entry, sizing and modifiers (M2 diagnostics on H; never selection inputs)

Exits OX, CX1 (= X1 = X6c = X8P), CX2 (= X8T), X2 volatility-scaled, X3 structural floor + emergency stop, X4 two-layer,
X5a profit stages, X5b probation, X6a maximum hold, X6b stall, X8OR, X8AND, HS; re-entry R0–R5 and R3F; sizing Z0–Z2;
modifiers A1–A3. The single M3 template TPL (own OUT + hard h + trailing t + R3F) is fixed now so that these
diagnostics cannot choose it.

## 4. Excluded, with reasons

- **M16 intraday-versus-overnight drift:** the documented overnight-return effect contradicts its premise for equity
  ETFs; a positive backtest would most likely be data-mining.
- **M17 volume asymmetry:** ETF minute volume is dominated by arbitrage, creation/redemption and hedging, not end
  investors; no adjustment exists in the canonical data.
- **M19, M20:** modifiers, tested as A1/A2 on E02. **M12, M13, M14, M18:** exit or sizing mechanisms (X5b, Z1, X6, Z2).
- **Cross-asset confirmation:** outside the brief's VGT-only scope.
- **M15 closing strength:** weakest causal prior and noisiest daily signal; kept as the descriptive X-CS so that its
  result is still reported and counted.

## 5. Controls

C-SMA (200-session average), C-DON (55/20 Donchian), C-TSM (12-month momentum, monthly), each also with the TPL default
exits; C-AL (one lot, drifting exposure), C-ALR (monthly re-sized always-long fixed slot), C-IDLE; VGT D1 primary
(context only). Never optimised.
