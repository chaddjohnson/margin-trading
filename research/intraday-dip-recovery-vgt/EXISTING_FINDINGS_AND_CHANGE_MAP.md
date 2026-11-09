# Existing findings and change map — short-term VGT dip recovery, Phase 1

Written 2026-11-09 (UTC) before any search of this study, from the repository's own records and code (read in this
session; paths cited). It records what was already known, including the outcomes of 2025–2026 that earlier work
examined, and exactly what this study changes. It is not a result of this study.

## 1. What was read

| Record or code | What it says that matters here |
|---|---|
| `research/intraday-d1-vgt/REPORT.md`, `PROTOCOL.md`, `FROZEN_SELECTION.json` (body `1dd6700c…`), `RESEARCH_RECOVERY.md`, `AMENDMENTS.md` (A1) | The completed Intraday D1 study (2026-11-06): canonical D1's rules re-clocked to B-minute periods, searched by Study 8's V-track on 2016–2024. **No feasible configuration** (0 of 7,890 at rung 1); no role holder; recommendation "no robust edge". Its near-misses failed only Study 8's $10,000/yr neighbourhood-median bar (C5/E1). |
| `research/intraday-d1-vgt/results/qualify/qualification.json` | The frozen shortlist (four "infeasible on training" fillers, all B 130, X 4.96% — the box maximum, S 0.98%, H 3,949 trading minutes — the box maximum). Shortlist #1 `id-5.1v.e.1f.1y.t.1y.6.1f`: development net **$71,245.59**, minute DD **$17,279.91**, 83 lots. |
| `research/intraday-d1-vgt/results/report/diagnostics.json` | Development-only diagnostics: at X < 0.5% the unbiased screen's median net was −$173,904 at 5 bps (median 2,446 trades, $244,485 of costs); profitability rose toward daily-like parameters. The most profitable genuinely intraday configuration (B 15, X 0.32%) made $41,659 at 5 bps from 679 trades (23.7 bp pre-cost gross per trade) and held a median 3 days; only 16% of its trades closed in their entry session, **because D1's profit-conditioned stop stays off while a trade is under water and the maximum hold sells only at a period open**. Best configuration per B: about $74k–$100k development net at 14–21k DD (neighbourhoods below Study 8's bar). |
| `research/intraday-d1-vgt/audit/D1_AUDIT.md` | Canonical D1 = `src/app/allIn-trailingBuy-postExitContinuation.ts` (architecture `D1`, `src/phenotype/architectures.ts:37-109`). Its stop is profit-conditioned (active iff shares × stop − investment − interest > 0, decided before each session, not latched), entries only in sessions that start flat, exits only in sessions that start long, maximum hold in calendar days, buffered loss after the hold, post-exit continuation after a net-profitable exit. **Canonical D1 has no material-loss re-entry restriction, lower-price re-entry rule or recovery reset**; those belong to older `allIn` variants (`allIn-trailingBuy-bufferedLoss-noReentry.ts` and kin) and are not added here. |
| `research/intraday-d1-vgt/audit/RULE_PARITY_DESIGN.md`, `METHODOLOGY_TRANSFER_MAP.md` | How the session became a period, which clocks hold and interest use (the hold in scheduled trading minutes, interest by calendar days between session dates), and how Study 8's pipeline transferred (screen → rung 1 → NSGA-II islands → rungs 2–3 → refinement → shortlist → selection 2 × 128 / confirmation 3 × 128). Study 8's own thresholds (C3, C5, C6, C7 floors) were imported there; **the present brief and standard 2.0.0 forbid such floors here** (§2.6). |
| `research/intraday-d1-vgt/audit/STUDY8_AUDIT.md` | Study 8's executable search, fitness and evaluation (`src/study8-expanded-regime-d1/`), its weak out-of-fold rank persistence (PBO > 0.5 in most track-folds). |
| `research/intraday-d1-vgt/audit/PRIOR_INTRADAY_AND_INFRA_AUDIT.md` | Older minute studies (`research/vgt-intraday-study/`, `research/vgt-minute-optimizer/`, `research/risk-management/allin-minute-conversion/`) studied the **daily-clock `allIn.ts` dip-buy** (one decision per session, 78-session high, daily stop updates, 8-calendar-day hold, a re-entry restriction) on the legacy file `VGT-2016-2025-1-minute.csv`, which **contains 2025 rows**. None is D1, none is a fixed short-term variant of this study's rules, and their windows overlap validation; **they are not used as controls** (§3 below). VGT minute data quality: sparse minutes (median 286–371 bars of 390), no duplicates or invalid OHLC 2016–2024, median minute dollar volume $62k–$89k in 2016–2017 rising to $437k in 2024. |
| `src/intraday-d1/engine.ts`, `periods.ts`, `parity.ts` | The verified Intraday D1 engine and period clock (parity P1/P2/P3 sealed there). **Used read-only here** as the oracle of this study's L0 rung (parity P2) and for the clock. |
| `src/app/allIn-trailingBuy-postExitContinuation.ts` (via `src/app.ts`) | Run unchanged on the D24 bytes for parity P1. |
| `src/study8-expanded-regime-d1/search.ts` (`rankOrder`), `src/optimizer/{nsga2,rng,sobol}.ts`, `src/study5-gdx-b5-three-etf/grid.ts` (`latinOffsets`), `src/vgt-d1-growth-joint/fitness.ts` (`quantile`) | Imported read-only: constrained-rank ordering, NSGA-II operators, seeded RNG, scrambled Sobol, Latin offsets, the standard's quantile. |
| `docs/research/OPTIMIZATION_STANDARD.md` 2.0.0, its registry, `STUDY_PROTOCOL_TEMPLATE.md`, the adoption template, `src/research-standard/preflight.ts`, `CLAUDE.md`, `docs/claude/context-recovery.md` | The governance this study adopts (`STANDARD_COMPLIANCE_MAP.md`). |
| `config/phenotypes/D1/VGT.json` | Daily D1 `primary`: X 21.6% Y 0.3% stop 7.3% hold 8 days L 74 sessions buffer 2.9% P 9% W 60 sessions (candidate `d1-ebc9f639b3`); "2024–2025 was inspected by earlier VGT programs". |

## 2. Previously examined 2025–2026 outcomes (disclosed; the validation window is therefore not an untouched holdout)

- **Intraday D1 shortlist #1** (its one-time diagnostic validation, `research/intraday-d1-vgt/REPORT.md` §5):
  validation +$6,184 (2025 +$7,415; 2026 to 2026-10-30 −$1,231), 13 trades; failed its T3 and T5 there.
- **Daily D1 `primary` (B1)** on the same economics: development $135,359; validation +$40,901 (2025 +$47,463, 2026
  −$6,561), 4 trades.
- Daily D1's own 2025–2026 history (`research/vgt-d1-refinement/results/baseline/baseline.json`,
  `docs/vgt-d1-primary-discrepancy.md`), Study 8 and the Priority 1–5A studies also examined VGT through 2026-10-30.
- **This study's rule family was conceived after that history was examined.** The decision to make the stop
  unconditional and to allow same-period trading follows directly from the Intraday D1 diagnosis (§1 above), which
  used development data, but the authors of the brief had seen 2025–2026 outcomes of D1-type rules. Fresh seeds are not
  fresh market history. Validation here is labelled **"validation on previously examined history, not an untouched
  holdout"**.

## 3. Controls and incumbents (verified provenance)

| Control | Provenance | Role here |
|---|---|---|
| Daily D1 `primary`, native | Canonical D1 CLI on the 2016–2024 prefix: $137,222.97, minute DD $19,330.69, daily DD $15,611.46, 17 trades (`research/intraday-d1-vgt/REPORT.md` §1). Costs 0, 11%, no arming date. | Control (reproduced to the cent, parity P1). Not a selectable short-term phenotype: session clock, X 21.6%, profit-conditioned stop — it does not satisfy F1–F4. |
| Daily D1 `primary`, harmonized | Session clock, 5 bps per side, 11%, common arming date 2016-02-01 = Intraday D1's B1 ($135,359 development). | Control. |
| Intraday D1 shortlist #1 (and #2–#4) | Frozen there on 2016–2024 (development only) by Study 8's procedure, as "infeasible on training" fillers; no role holder. Native conventions = this study's economics (5 bps, 11%, 2016-02-01 arming), engine L0. | Control (reproduced to the cent, parity P3). Its **vector** is an incumbent of the informed lane: projected exactly into F1–F4 (inactive genes dropped) it becomes a selectable member under this study's gates. Informed, never an independent or earlier-cutoff seed. |
| Intraday D1 diagnostics' configurations (7) | Development-only diagnostics of that study's search archive (not selections). | Informed seeds of the informed lane only; ablation vectors. |
| `vgt-intraday-study`, `vgt-minute-optimizer`, `allin-minute-conversion` configurations | Older `allIn` daily-clock dip-buy with a re-entry restriction; legacy file with 2025 rows; windows through 2025-10-13. | **Not used**: a different rule family (not D1, not this study's rules) whose selections saw 2024–2025; using them would mislabel an older variant as D1. |
| Study 8 VG #2 and the Growth phenotypes | Multi-ETF daily D1 pools and Growth books. | Not relevant to a one-VGT-book short-term rule; not used. |

## 4. The change map (what this study changes, one mechanism at a time)

| Element | Intraday D1 (L0) | This study | Where |
|---|---|---|---|
| Stop activation | Profit-conditioned (active only when selling would net a profit after interest) | **Unconditional protective stop**, actionable from the fill (L1+, all families) | `engine.ts` `stopWhileLosing` |
| Same-period trading | Entries only in periods that start flat; exits only in periods that start long | **Exit in the entry period** from the fill minute; **new entry after an exit** within the period after a fresh setup; exit orders reaching a period's end wait for the next trade (L2+, all families) | `samePeriod` |
| Maximum losing hold H / buffered loss U | On | Off in F1/F2 and L3–L5; on in F3/F4 (comparison families) | `holdBuffer` |
| Post-profit continuation (P, W) | On | Off in F1/F3 and L4–L5; on in F2/F4 | `continuation` |
| Stop-high ratchet | Once per period from the period's high | **After every completed minute** (a high seen in minute m acts from minute m + 1; the fill minute's high never raises the stop it is exposed to) (L5, all families) | `ratchet` |
| Period clock B | {5, 10, 15, 30, 65, 130} | {1, 5, 10, 15, 30, 65, 130} (1-minute periods added) | `context.ts` axes |
| Box | X ≤ 4.96%, Y ≤ 0.99%, S ≤ 2.48% | X ≤ 9.98%, Y ≤ 2.0%, S ≤ 4.99% (same formulas, same indexes; the old box is a subset, so every old vector is exact) | `context.ts` axes |
| Objective | Study 8's robust-first ranking with C3/C5/C6/C7 floors ($10,000/yr median) | **Actual development net** (centre) subject to centre minute DD ≤ $35,000 and confirmation p90 DD ≤ $35,000; no activity, profit-rate, concentration or breach-rate floor | `PROTOCOL.md` §1, §9 |
| Chronology | F24 only (folds excluded by that brief) | C19, C21, C23 repeats with sealed, committed fold selections and a frozen sequential verdict; C24 then validation once | `PROTOCOL.md` §10 |
| Neighbourhoods | 16 → 64 → 128, selection 2 × 128, confirmation 3 × 128 | The same fidelities; scopes entry/exit/continuation; half and wide radii; tail severity report-only | `PROTOCOL.md` §8 |
| Unchanged | Arming on completed minute closes (the arming minute never buys); trailing low from the arming close, then minute lows; decision at a close, fill at the next observed trade (closing print only for a decision before the close); one $100,000 position, fractional shares, no compounding; 5 bps per side in the entry price; 11% simple interest by calendar days between session dates; no forced end-of-day exit; raw prices, VGT's 8:1 split forward-adjusted in FULL | — | parity P1–P3 prove the unchanged parts |
