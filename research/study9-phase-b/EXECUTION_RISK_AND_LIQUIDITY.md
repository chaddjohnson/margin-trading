# Study 9 Phase B — execution risk, stresses and liquidity

**Sources (sealed records only; nothing here feeds a gate or a selection):** the one-time F24 test record
`results/test/F24/test.json` (chain entry 14: the Q7/T4 stresses and the appendix sensitivities, gap risk) and the
report-only post-test record `results/diagnostics/diagnostics.json` (entry 17: per-lot fill bars from the raw minute
files, drawdown episodes, overnight gaps, events). Tables (`tools/build_tables.py test diagnostics execution`):
`test-F24-stresses.md`, `test-F24-risk.md`, `diag-participation.md`, `diag-liquidity.md`, `diag-episodes.md`,
`diag-risk.md`. Whole run 2016-01-04 → 2026-10-29 at the base execution (5 bps per side, 11% simple interest, the
fixed $100k single funded slot, stops at the stop or the gapped open, arming 2017-06-15) unless a stress says otherwise.

**What the $35,000 ceiling is.** A backtest screening rule on the minute-marked net of one $100k margin-funded slot
(strictly below $35k). It is **not** a broker-enforceable stop, not a margin-call model, and not a 35% guarantee on any
portfolio. Section 6 separates it from the user's core-portfolio risk, which this study does not model.

## 1. Stresses (Q7/T4 and the appendix sensitivities; `test-F24-stresses.md`)

Test-window net (2025-01-02 → 2026-10-29) / cumulative run minute DD through 2026-10-29:

| Configuration | Base | 10 bps | 20 bps | 8% | 14% | Next-open stop | +10 bps slip | +25 bps slip | T4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **#2 G4-EWW profit (nominee)** | $31,530 / $22,975 | $30,146 / $23,178 | $27,382 / $23,647 | $32,516 / $22,926 | $30,544 / $23,025 | $31,897 / $23,981 | $30,778 / $23,114 | $29,651 / $23,322 | pass |
| #3 G4-EWW extra | $45,407 / $21,967 | $44,009 / $22,454 | $41,217 / $23,426 | $46,426 / $21,679 | $44,388 / $22,254 | $45,630 / $22,097 | $44,544 / $22,175 | $43,250 / $22,487 | pass |
| #14 N2-SMH profit | $76,540 / $30,112 | $76,053 / $30,210 | $75,081 / $30,405 | $79,392 / $29,965 | $73,688 / $30,260 | $76,817 / $30,072 | $76,150 / $30,237 | $75,565 / $30,424 | pass |
| #15 VG3-IWM robust | $67,039 / $19,172 | $65,965 / $19,267 | $63,820 / $19,456 | $69,077 / $19,123 | $65,000 / $19,221 | $66,789 / $19,172 | $66,061 / $19,280 | $64,594 / $19,443 | pass |
| #16 VG3-IWM extra | $64,837 / $19,717 | $63,811 / $19,929 | $61,763 / $20,354 | $67,278 / $19,602 | $62,396 / $19,832 | $64,712 / $19,915 | $63,954 / $19,865 | $62,631 / $20,088 | pass |
| **Study 8 VG #2 balanced** | $79,925 / $21,304 | $80,778 / $20,128 | $78,299 / $20,512 | $82,637 / $20,884 | $79,299 / $20,141 | $79,999 / $21,495 | $79,023 / $21,614 | $77,670 / $22,080 | pass |
| B1 | $40,901 / $19,534 | $40,452 / $19,738 | $41,686 / $20,144 | $43,293 / $19,386 | $40,655 / $19,682 | $40,661 / $19,187 | $40,650 / $19,761 | $40,272 / $20,100 | pass |
| B5 | $71,986 / $26,510 | $70,851 / $26,710 | $68,583 / $27,232 | $75,420 / $26,387 | $68,369 / $26,633 | $71,666 / $26,162 | $71,387 / $26,736 | $70,488 / $27,076 | pass |

- **28 of 32 F24 holders pass T4**; #18/#19 N2-SMH and #27/#28 N2-EDV fail it (with T3, and T6 for the N2-EDV pair:
  too little test-window activity to survive the stressed economics).
- **The nominee's economics are friction-tolerant within the modelled stresses:** the worst stressed test net is
  $27,382 (20 bps; −13%), the worst stressed run DD $23,981 (next-open stop fill), $11k under the ceiling. Every
  stress also leaves every Phase B holder's test net below VG #2's under the same stress.
- **Arming-date sensitivities** (2017-12-15, 2018-06-15) only remove 2017–2018 lots: the nominee's run net falls
  from $291,397 to $283,336 / $283,977; its test-window net and run DD are unchanged, as for VG #2 ($340,148 →
  $331,731).
- "Passes the modelled fill stress" is an accounting statement about these OHLCV replays. It is **not** evidence
  that a $100k order was executable at the modelled price (§3).

## 2. Stops and gaps (`test-F24-risk.md`, `diag-liquidity.md`, `diag-episodes.md`)

| Configuration | Stop exits | Gapped stops (test window) | Loss beyond stop (run) | Worst gap loss | Worst test-lot MAE | Five worst overnight gaps on held lots |
|---|---:|---:|---:|---:|---:|---|
| **#2 G4-EWW profit** | 46 | 15 (2) | $20,784 | $3,121 | −$7,967 | GDX 2026-04-02 −$6,952; GDX 2020-03-18 −$6,247; KRE 2024-01-31 −$5,048; EWW 2020-04-01 −$4,737; KRE 2020-11-04 −$4,507 |
| #14 N2-SMH profit | 14 | 7 (0) | $5,818 | $1,698 | −$8,944 | `diag-episodes.md` |
| #15 VG3-IWM robust | 17 | 10 (3) | $18,127 | $5,201 | −$10,069 | `diag-episodes.md` |
| **VG #2 balanced** | 24 | 9 (1) | $13,505 | $3,984 | −$11,770 | GDX 2026-04-02 −$7,050; GDX 2020-03-18 −$6,247; GDX 2020-04-15 −$4,706; GDX 2026-06-23 −$4,492; VGT 2025-04-07 −$4,284 |

- A gapped stop fills at the session's opening trade (or an intraday minute that opened through the stop), not at the
  stop; the "loss beyond stop" is the shortfall against the stop price. The nominee lost $20.8k this way over the run
  (KRE $10.7k on 7 gaps, EWW $6.0k on 3, GDX $4.0k on 5), about 7% of its net; VG #2 $13.5k, all GDX.
- The largest single gaps are shared market-wide events (2020-03-18, 2026-04-02 in GDX) that hit the nominee and VG #2
  almost identically.
- The next-open stop stress (all stops filled at the next session's open) raised the nominee's run DD by $1.0k and
  left its test net almost unchanged (+$367).

## 3. Liquidity and participation (`diag-participation.md`, `diag-liquidity.md`)

The engine fills the whole $100k at the first printed trade after the decision: no partial fills, queue, market
impact or participation limit. The base engine was not changed. It has no participation-cap or partial-fill mode,
so the liquidity-aware alternatives are **quantified, not simulated**: "feasible at 10%" is min($100k, 10% of the fill
bar's dollar volume), the size a 10% participation cap would have allowed on that one minute bar.

**Per ETF across the 32 F24 role holders** (ranges over the holders that hold the ETF):

| ETF | Median minute $ (training / test) | $100k ÷ median minute $ (training) | Fills on a bar < $100k | Fills on a bar < $1M | Median feasible at 10% | Lots holding sparse sessions |
|---|---:|---:|---:|---:|---:|---:|
| ILF | $33,504 / $74,109 | 2.98× | 50.0%–78.3% | 96.7%–100.0% | $4,381–$13,824 | 41.2% |
| EDV | $50,888 / $78,566 | 1.97× | 35.7%–71.4% | 83.3%–95.5% | $7,189–$18,488 | 95.3% |
| MTUM | $150,409 / $321,670 | 0.66× | 0.0%–14.3% | 61.5%–83.3% | $31,613–$78,964 | 11.4% |
| EWW | $163,287 / $139,351 | 0.61× | 7.1%–12.5% | 65.6%–78.9% | $46,467–$61,554 | 14.5% |
| XHB | $199,378 / $289,790 | 0.50× | 8.8%–19.6% | 59.1%–90.6% | $35,692–$73,193 | 7.7% |
| VGT | $268,841 / $671,654 | 0.37× | 0.0%–5.6% | 35.3%–61.1% | $69,629–$100,000 | 52.8% |
| KRE | $689,759 / $1,280,299 | 0.14× | 0.0%–1.2% | 0.0%–17.5% | $100,000 | 6.0% |
| GDX, SMH, XLF, IWM | ≥ $1.08M | ≤ 0.09× | 0% | 0.0%–9.6% | $100,000 | 2.5%–9.4% |

(A sparse session has fewer than 300 regular-session minute bars. Sparse VGT sessions are real, not an artefact: the
canonical `data/VGT/data.csv` has 78 such sessions in 2024 and 48 in 2025.)

**ILF and EDV are not realistically executable at $100k in this design.**
- **ILF:** the median training minute trades $33.5k, so a $100k lot is ~3× a typical minute (Phase A's 2.9× flag
  confirmed). In the ILF holders, 50–78% of ILF fills printed on a bar below $100k, and a 10% participation cap would
  have allowed a median $4–14k per fill. **#8 G4-ILF balanced** (a passing nominee): 16 of its 30 ILF fills on bars
  below $100k, median feasible $9,964 at 10%, 8 of 15 ILF lots holding sparse sessions; 12.8% of all its fills are on
  sub-$100k bars, failing the predeclared ≤ 10% fill criterion. **#12 G4-ILF extra**: 27.2%.
- **EDV:** 59 of its 62 distinct funded lots (95%) held sessions with fewer than 300 minute bars: 894 such sessions
  (934 holder-lot sessions in the per-ETF table, which counts shared lots once per holder), almost all in lots entered
  in 2022–2023. The raw `data/EDV/data.csv` has fewer than 300 regular-session bars on nearly every session through
  2022, on 203 of 250 in 2023, 162 of 252 in 2024, 46 of 250 in 2025 and 13 of 209 in 2026. Phase A's "liquid since
  2023" uses a looser threshold, fewer than half the scheduled minutes, under which EDV has no sparse session after
  2024. So the two counts agree on the trend but not the cutoff. EDV pools put 5.4–32.6% of all fills on sub-$100k
  bars; no EDV pool passed F24 anyway (T3, most also T6).
- **Missing bars:** every fill bar exists in the raw minute files (0 missing fill bars in every configuration). The
  engine fills at the next printed trade after a decision, so in a sparse ETF a "next-bar" fill can come minutes after
  the decision; the per-lot decision-to-fill delay is not in the sealed ledgers and is not inferred here.

**The nominee and VG #2.**
- #2 G4-EWW profit: 5 of 203 fills (2.5%) on bars below $100k (EWW 3, KRE 1, MTUM 1). The constraint is EWW and
  MTUM: median feasible at 10% of $46,467 (EWW) and $31,613 (MTUM). KRE and GDX fills were feasible at full size
  (median $100,000). It passes the fill criterion.
- VG #2 balanced: 0 of 95 fills on bars below $100k; GDX median feasible $100,000, VGT $100,000 (p10 $46,482).

**What minute OHLCV cannot tell us:** tick-level fill prices, the bid-ask spread actually paid, queue position, market
impact, hidden liquidity, auction participation at the open (where most gapped stops fill), halts, and whether a
$100k order would itself have moved a thin bar. The 5 bps per side cost and the +10/+25 bps slippage stresses are flat
assumptions; on ILF and EDV bars, a realistic impact cost for a $100k order could exceed them by an unknown amount.
Smaller lots would change the fixed-slot economics (interest, cost and the $35k ceiling scale), so they need a
separately specified study rather than a rescaling of these results.

## 4. Adverse excursions, drawdown episodes and losing streaks (`diag-risk.md`, `diag-episodes.md`)

| Configuration | Run net | Run minute DD | Run daily DD | 5 worst MAEs | Largest lot loss | Longest losing streak |
|---|---:|---:|---:|---|---:|---:|
| **#2 G4-EWW profit** | $291,397 | $22,975 | $18,806 | −$12,353; −$9,570; −$9,285; −$7,967; −$6,975 | −$10,094 | 6 |
| #3 G4-EWW extra | $360,468 | $21,967 | $17,850 | −$9,285; −$7,968; −$7,967; −$7,390; −$7,077 | −$5,334 | 6 |
| #8 G4-ILF balanced | $252,004 | $27,857 | $25,184 | −$19,687; −$14,433; −$13,094; −$9,989; −$9,983 | −$19,702 | 7 |
| #14 N2-SMH profit | $294,679 | $30,112 | $27,201 | −$24,387; −$14,720; −$9,946; −$8,944; −$7,763 | −$3,691 | 1 |
| #15 VG3-IWM robust | $214,928 | $19,172 | $17,078 | −$11,181; −$10,069; −$5,980; −$5,160; −$4,896 | −$5,151 | 1 |
| **VG #2 balanced** | $340,148 | $21,304 | $18,801 | −$11,770; −$11,069; −$9,554; −$8,833; −$8,523 | −$9,114 | 2 |
| VG #1 profit | $308,742 | $31,225 | $28,725 | −$11,575; −$9,595; −$9,554; −$8,523; −$8,495 | −$11,537 | 4 |
| B1 | $176,260 | $19,534 | $15,817 | −$11,047; −$8,258; −$4,890; −$4,657; −$4,453 | −$3,544 | 1 |
| B5 | $484,637 | $26,510 | $23,789 | −$18,023; −$12,179; −$8,258; −$8,005; −$7,925 | −$8,258 | 4 |

(Every role holder's row is in `diag-risk.md`; daily DDs in `diag-episodes.md`.)

**The nominee's five worst minute-drawdown episodes** (peak → trough → recovery, New York time; book P&L during the
episode):

| Depth | Peak | Trough | Recovered | Lots | Attribution |
|---:|---|---|---|---:|---|
| $22,975 | 2020-03-17 11:14 | 2020-03-23 09:46 | 2020-03-25 12:39 | 3 | GDX −$12,881, KRE −$10,094 |
| $22,188 | 2026-06-17 13:42 | 2026-07-31 10:10 | 2026-08-07 09:30 | 6 | GDX −$22,188 |
| $17,902 | 2026-04-01 11:44 | 2026-06-10 15:28 | 2026-06-17 09:46 | 3 | GDX −$17,902 |
| $17,747 | 2022-05-27 15:59 | 2022-10-20 14:29 | 2022-11-08 10:48 | 11 | GDX −$9,998, MTUM −$7,749 |
| $15,891 | 2023-01-25 15:49 | 2023-03-10 13:55 | 2023-03-23 14:07 | 4 | GDX −$15,891 |

**VG #2's:** $21,304 (2026-04-01 → 07-17, GDX); $17,281 (2020-03-19, one GDX lot, intraday); $17,028 (2023-01-25 →
02-24, GDX); $16,842 (2022-08-15 → 09-26, VGT −$9,242, GDX −$7,600); $16,558 (2024-04-12 → 2025-04-07, GDX
−$8,036, VGT −$8,523).

- **GDX drives most of the deep drawdowns of both pools.** All five of the nominee's worst episodes are GDX-led (the March
  2020 one jointly with KRE); three of VG #2's five are (its 2022 and 2024–2025 episodes are VGT-led). The 2026 GDX episodes (April–July) are each pool's worst or second-worst: both reach $21–22k
  from the GDX book alone (troughs 2026-07-17 for VG #2, 2026-07-31 for the nominee). GDX's 2026 path is a common
  risk that neither pool diversifies away.
- **Across the role holders the leading book of the worst episode differs** (`diag-episodes.md`):
  - **GDX** leads it in 10 of the 15 GDX holders (#1–#6, #9, #10, #15, #17) and in VG #1 and VG #2.
  - **KRE** leads it in the G4-ILF holders #7, #8, #11 and #12 (2019–2023 episodes), and in B5 (2020).
  - **VGT** leads it in #16 VG3-IWM extra (2025-10-29 → 2026-03-20).
- **Losing streaks:** the nominee's longest run of consecutive losing lots is 6, against VG #2's 2.

## 5. Event concentration and generality (`diag-risk.md`)

| Configuration | M2020 (02-15 → 04-30) | 2022 | KRE 2023 (03 → 05) | T2025Q2 (03 → 06) | G2026 (03 → 07) | 2025 | 2026 YTD | Ex-best-year (= ex-2020) | 2017-06 → 2020 / 2021 → 2024 | Top lot / top 5 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **#2 G4-EWW profit** | $68,095 | $16,364 | $24,825 | $2,123 | −$1,892 | $2,123 | $29,407 | $155,157 | $161,957 / $97,910 | 13% / 47% |
| #3 G4-EWW extra | $84,563 | $33,713 | $25,463 | $15,531 | −$1,562 | $15,531 | $29,876 | $202,321 | $193,606 / $121,455 | 11% / 39% |
| #14 N2-SMH profit | $28,122 | $9,144 | $21,371 | $43,961 | −$11,836 | $75,993 | $548 | $211,670 | $83,009 / $135,130 | 21% / 63% |
| #15 VG3-IWM robust | $57,715 | $16,152 | $15,280 | $38,547 | $14,893 | $50,317 | $16,721 | $136,305 | $98,920 / $48,969 | 21% / 61% |
| **VG #2 balanced** | $93,264 | $30,087 | $24,473 | $34,080 | $795 | $47,239 | $32,685 | $230,062 | $145,773 / $114,450 | 14% / 52% |
| B1 | $16,764 | $22,145 | $0 | $30,173 | $0 | $47,463 | −$6,561 | $100,964 | $111,257 / $24,102 | 29% / 83% |
| B5 | $89,718 | $84,884 | $25,365 | $30,173 | −$4,080 | $45,679 | $26,307 | $318,749 | $201,849 / $210,802 | 9% / 34% |

- **2020 is every one of these configurations' best year.** Ten weeks of the 2020 crash and rebound produced 23% of the
  nominee's run net and 27% of VG #2's; ex-2020 the nominee earns $155.2k against VG #2's $230.1k.
- **The nominee's late training half is weaker than its early half** ($97.9k in 2021–2024 against $162.0k in
  2017-06 → 2020). VG #2 is more even ($114.5k against $145.8k).
- **2025 is where the G4 pools lag.** In the tariff episode (March–June 2025) the nominee made $2.1k against VG #2's
  $34.1k. The G4 pools hold no VGT, and VGT's rebound after the April 2025 sell-off drove much of the VG, B1 and B5
  test-window profit.
- **The 2023 regional-bank episode** (KRE 2023, March–May) was about as profitable for VG #2, which holds no KRE
  ($24.5k), as for the nominee ($24.8k), so it is not KRE-specific evidence.
- A lower point-estimate DD after adding a book (MTUM in the G4 pools, `POOL_COMPLEMENTARITY_AND_LEDGER.md` §1) is one
  realization on one path. It is not structural protection that will persist.

## 6. Portfolio context (limited; not modelled)

The study measures one $100k margin-funded slot in isolation. It does **not** model the user's core portfolio (60%
VOOG / 40% VGT), its own drawdowns, the broker's maintenance requirement or margin calls, or how the slot's borrowing
interacts with the core. Qualitatively:
- VG #2 and B1 trade VGT, which is already 40% of the core; the G4 pools (KRE, EWW, GDX, MTUM) hold none of the
  core's ETFs, so they might overlap less with it. That is a hypothesis, not a measured benefit: the slot's worst
  episode (March 2020) was a market-wide crash in which the core also fell, and whether the 2026 GDX episodes
  coincided with core drawdowns is not measured here.
- A $22–31k slot drawdown at the same time as a core-portfolio drawdown could raise margin utilisation sharply. Nothing
  here measures that, and nothing here changes margin borrowings. A combined simulation would need its own
  authorisation and protocol.

## 7. Summary

- Within the modelled frictions, the nominee's and VG #2's economics and drawdowns are stable (T4 pass; worst stressed
  run DD $24.0k and $22.1k).
- **ILF and EDV positions are not credibly executable at $100k on minute liquidity** (median feasible $4–18k at 10%
  participation). The ILF nominees #8 and #12 fail the predeclared fill criterion. EWW and MTUM in the G4-EWW pools
  are marginal: across the G4-EWW holders a 10% cap would have allowed a median $46–62k per EWW fill and $32–79k per
  MTUM fill (the nominee: $46k and $32k).
- GDX leads the worst drawdown of 10 of the 15 GDX holders and of VG #1 and VG #2. The 2026 GDX episodes are shared
  with VG #2, so the nominee does not diversify them. In the G4-ILF holders KRE leads instead.
- Execution is modelled from minute bars only. Tick fills, impact, spreads and auction fills are unknown.
