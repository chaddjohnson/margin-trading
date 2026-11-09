# Short-term VGT dip recovery, Phase 1 — report

**Verdict: (c) no attractive edge demonstrated.**

The simplified short-term mechanics do produce shorter trades. Under the frozen gates they also produce many
qualified, historically profitable development phenotypes. But the chosen primary's profit is concentrated in one crash
recovery (2020). The independent selection procedure is **chronologically unsupported**: its 2020 slice breached the
$35,000 drawdown ceiling and its 2022–2023 slice lost money. The one-time validation was positive but small, at
+$5,645 over 22 months, with 2026 negative so far. Daily D1, run on the same economics, made +$40,901 over the same
validation window.

The genuinely short-duration phenotypes (median holds of minutes, almost all same-session) earn little at 5 bps. The
one high-frequency region that looks strong exists only at an exploratory 2 bps per side and breaks down at 5–10 bps.
It also breaches a realistic capacity proxy on most of its trades.

None of this is deployable, and a Phase 2 is not recommended on this evidence (§11).

Labels are kept apart, as the brief requires:

| Label | Primary `F2-4.1v.m.1x.0.u.0.1r.1e` |
|---|---|
| Historically profitable (development 2016–2024) | **yes**: +$85,809, DD $15,270 |
| Qualified under the frozen gates | **yes** (Q1–Q3) |
| Chronologically supported | **no**: the independent procedure is "unsupported" |
| Validation (previously examined history) | positive but weak: +$5,645; V1–V3 pass; −68% pace |
| Deployable | **no** |

2025–2026 is **validation on previously examined history, not an untouched holdout**
(`EXISTING_FINDINGS_AND_CHANGE_MAP.md` §2). The data end on **2026-10-30** (the measured common complete endpoint), so
2026 is a partial year. Historical compliance with the $35,000 budget is not a guarantee of future drawdown.

Tables: `REPORT_TABLES.md`. Machine-readable results: `results/` (see `README.md`). There are no visual artifacts
(standard 2.0.0 §7.7).

## 1. What was built

- **Engine** (`src/intraday-dip-recovery/engine.ts`): one VGT book, one funded $100,000 position at a time, causal on
  1-minute bars. It generalizes the completed Intraday D1 engine (canonical D1 with its session replaced by a B-minute
  period) by five switches, each changing one mechanism:
  - an **unconditional protective stop**, actionable from the fill even at a loss;
  - **same-period exits and re-entries**, with exit orders that reach a period's end carried to the next trade;
  - the maximum losing hold and buffered loss (**H/U**);
  - D1's post-profit **continuation**;
  - a **completed-minute stop ratchet**: a high seen in minute m acts from minute m + 1, and the fill minute's own high
    never raises the stop it faces.

  Details: `PROTOCOL.md` §5.
- **The ladder** L0 (= Intraday D1) → L1 → … → L5 (= F1) and the **four families**: F1 CORE, F2 CORE+C, F3 CORE+H/U,
  F4 CORE+C+H/U.
- **Grid:** B ∈ {1, 5, 10, 15, 30, 65, 130} minutes, X to 9.98%, Y to 2.0%, S to 4.99% (Intraday D1's formulas extended
  upward, so its vectors are exact), plus H, L, U, P and W as before. Six protected strata per family: dip depth
  (< 1%, 1–3%, ≥ 3%) × effective lookback (within a session or longer).
- **Parity, sealed before any search** (`results/parity/parity.json`): **0 failures in 551 checks**.

  | Gate | What it checks | Checks | Result |
  |---|---|---:|---|
  | P1 | L0 on the session clock vs the canonical D1 file, trade for trade and both drawdowns, stop and next-open fills; D1's sealed $137,222.97 / $19,330.69 / $15,611.46 | 2 runs | exact |
  | P2 | L0 vs the completed Intraday D1 engine, lot field by lot field (`Object.is`), on D19 and D24 | 262 | exact |
  | P3 | the native controls to the cent | 5 | exact |
  | P4 | causal doors: D19/D21/D23 runs vs the D24 prefix | 90 | exact |
  | P5 | accounting identities | 30 | exact |
  | P6 | worker path = report path | 24 | exact |
  | P7 | stresses recomputed from the bars | 120 | exact |
  | P8 | an independent reference implementation vs the engine, for L0–L5 and F1–F4, on 2016 and 2016–2018 windows | 160 | exact |

  A first dry run found a defect of the reference, not the engine, and is preserved
  (`results/parity/dry-run-1-failed.txt`). The synthetic expected-output tests (`src/intraday-dip-recovery/tests/`)
  pass 24/24.
- **Non-regression.** No file of D1, Intraday D1, Study 8, Growth or Strategy Lab changed; outside the new namespaces
  only `package.json` gained one script line. The Intraday D1 hash chain verifies (`npm run intraday-d1 -- verify`:
  0 problems).

## 2. Data, execution, governance

- **Data.** `data/VGT/data.csv` (Alpaca SIP 1-minute OHLCV, sha256 `2ee06310…412e`), measured from the timestamps
  only: 2,723 sessions from 2016-01-04 to **2026-10-30**, with no missing NYSE day. Two 2016 sessions lack a
  closing-print row but have complete bars.
- **Doors.** Byte prefixes D19, D21, D23 and D24, each verified by size, sha256, rows and last row before parsing.
  FULL (the 8:1 split of 2026-04-21 forward-adjusted) was opened **once**, at 20:11:54Z, by `validate`, after
  `FROZEN_SELECTION.json` was committed (`440b8d87`). All openings are in `results/doors.jsonl`.
- **Economics.** $100,000 per entry, fractional shares, no compounding; **5 bps per side** (in the entry price, so it
  enters every net test) and on exits; **11%** simple interest by calendar days (zero for a same-session round trip);
  stops fill at the stop level or the opening trade through it. Report-only scenarios: 0, 2, 10 and 20 bps; 14%
  interest; next-trade stop fills; +25 bps slippage; the trigger minute's low.
- **Governance.**
  - Adoption: standard **2.0.0** (sha256 `2005a88c…0105`), `STANDARD_ADOPTION.json`, `STANDARD_COMPLIANCE_MAP.md`; the
    preflight passed at the freeze and in every stage (`requireStandardAdoption`).
  - Protocol: from the template, frozen with sha256 `8a71e641…`; the freeze was committed (`0be0088e`) before any
    search; no amendment was needed.
  - Fold selections were each committed before their slices: C19 `d76e2cab` → `5bc068e2`; C21 `a13ae56b` → `f69be3f4`;
    C23 `0c047bea` → `37c6737b`.
  - Records: 345 sealed (0444, `results/seals.jsonl`), all verified.
  - **One departure (D1)**, citing the brief §4 and §3.3: the earlier-cutoff repeat covers the independent four-family
    procedure; the informed and exploratory lanes run at C24 only, because every incumbent and informed seed was
    selected with data through 2024.
  - Eight adaptations, listed in `PROTOCOL.md` §0.
  - The preflight's date-split checks are skipped because D1 cites §1.8, so they were verified by hand
    (`results/preflight/preflight-at-freeze.txt`).
- **Resources.** All research processes ran as transient user units inside `diprecovery.slice` (MemoryHigh 44G,
  MemoryMax 48G, swap 0), one at a time.
  - The pilot bench chose **12 workers** (≈ 284 evaluations/s on D24; more workers contend for 8 physical cores).
  - The peak unit memory was **8.9 GiB**, with zero swap in all 38 study units. The chain took about 59 minutes and
    validation about 1 minute.
  - A graceful stop, an abrupt unit kill and an abrupt worker kill each resumed to an identical search
    (`results/pilot/PILOT.md`).

## 3. Why the D1 profit came from holding losers (the L0–L5 ladder; development D24)

The vectors have declared provenance (`results/ablation/ablation.json`). A1–A4 are informed Intraday D1 vectors; A5 is
daily D1 on the session clock. Each rung changes one rule.

| Vector | L0 (Intraday D1) | L1 stop works at a loss | L2 same-period | L3 H/U off | L4 continuation off | L5 minute ratchet (= F1) |
|---|---:|---:|---:|---:|---:|---:|
| A1 shortlist #1 (B130, X 4.96%) | $71,246 (83 trades, hold 4,185 min) | $10,941 (48, 194 min) | $9,256 | $9,256 | $19,353 | $24,666 (93, 18 min) |
| A2 intraday region (B15, X 0.32%) | $41,659 (668) | −$83,738 (1,678) | −$72,639 | −$72,639 | −$72,639 | −$58,402 (1,848) |
| A3 best B5 | $89,743 (78) | $17,434 | $14,186 | $14,186 | $27,387 | $27,387 (32, 131 min) |
| A4 best B30 | $99,033 (98) | $9,547 | $18,579 | $18,579 | $18,942 | $19,984 (50, 32 min) |
| A5 daily D1 (session clock) | $135,359 (17) | $126,005 | $123,801 | $121,389 | $92,342 | $84,679 (15) |

- **The decisive change is L1.** D1's profit-conditioned stop stays off while a trade is under water, so Intraday D1
  held losers until they recovered (median holds of about 3–5 days). That was where its profit came from. Making the
  stop work at a loss cuts A1–A4 by 80–90%. The trades then become short (median 60–200 minutes; 60–84% close in their
  entry session), and the gross edge per trade is small.
- **H/U are inert once the stop is unconditional** for every intraday vector (L2 = L3 exactly). For daily D1 they change
  little.
- **Same-period trading (L2), dropping continuation (L4) and the minute ratchet (L5)** move results by a few thousand
  dollars, mostly upward. **Costs:** in the shallow-dip region (A2) the 5-bps friction (about $181k over nine years)
  exceeds the gross edge in every rung after L0.
- **For daily D1** the unconditional stop and same-session rules cost about $10–14k. Dropping continuation costs a
  further $29k, and the L5 core still makes $84,679, but over 15 slow trades.

## 4. The search (both units, `REPORT_TABLES.md` §1–2)

| Lane | Lanes | Distinct proposals | Evaluations (fresh + hits) | Compute |
|---|---:|---:|---:|---:|
| Independent C19 (F1–F4) | 4 | 41,207 | 345,529 (336,242 + 9,287) | 5.7 min |
| Independent C21 | 4 | 42,656 | 370,366 | 6.5 min |
| Independent C23 | 4 | 43,578 | 386,374 | 8.8 min |
| Independent C24 | 4 | 42,463 | 366,511 | 13.2 min |
| Informed C24 (11 seeds per family) | 4 | 21,206 | 331,819 | 11.6 min |
| Exploratory 2 bps C24 | 4 | 22,742 | 209,305 | 7.7 min |
| **Searches, total** | 24 | **213,852** | **2,009,904** (1,957,968 fresh; 51,936 archive/cache hits; 221,048 centres, 1,790,970 neighbours) | 54 min |
| Qualification C19/C21/C23/C24 | 4 | — | 23,816 / 24,501 / 24,555 / 75,157 | — |

- **Totals are within budget.** The planned base was ≈ 207,000 proposals and ≈ 2.1M evaluations; the caps were
  ≈ 255,000 and ≈ 2.9M. The independent schedule was identical at every cutoff.
- **Islands:** 88 base and 10 extension islands (98 in all). 85 stopped on budget and 13 on stagnation. The extension policy
  stopped 20 lanes with "triggers not met" and 4 at the cap. **Budget exhausted is not convergence.** Hypervolume gain
  per 10,000 evaluations per island is in `results/report/search_islands.csv`.
- **Protected coverage.** Every cell of every family was screened (1,024 per cell) and promoted (½ of promotion by cell
  round robin, ≥ ¼ by centre net). Shallow-dip cells were explored but rarely survived to rung 3 at 5 bps: their
  positive centres had high turnover and their neighbourhoods breached the drawdown ceiling (`search_cells.csv`).
- **Box edges.** The stop S at its 4.99% upper bound appears in several early-cutoff winners (C19: 4.4–5.0%) and in
  the robust-profit role holder. At C21–C24 the best members sit at 2.1–2.8%. The bound was frozen and not moved.

## 5. Chronological procedure (independent lane; `results/folds/`)

| Fold | Primary (independent, actual profit) | Training net | Trades/yr | Median hold | Slice | Slice net | Slice reset DD |
|---|---|---:|---:|---:|---|---:|---:|
| C19 | `F2-0.1y.l.25.0.17.0.15.c` (B1, X 5.91%, S 4.44%) | $87,989 | 3.1 | 17 days | 2020–2021 | +$21,547 | **$46,082** |
| C21 | `F2-1.1q.h.1x.0.m.0.1r.1d` (B5, X 3.71%, S 2.79%) | $92,099 | 10.8 | 21 h | 2022–2023 | **−$16,018** | $22,417 |
| C23 | `F2-4.1v.2.1x.0.u.0.1r.1e` (B30, X 4.96%, S 2.79%) | $81,105 | 8.3 | 22 h | 2024 | +$4,180 | $2,992 |

- **Sequential procedure:** chained net **+$9,710**, no switch charges, chained minute DD **$46,082** (2020-01-24 →
  2020-03-23). **Verdict: unsupported.** Every fold produced a primary, but the drawdown exceeds $35,000.
- The other C21 role holders also lost in their slice (robust −$15,548), except a low-activity balanced/lower-drawdown
  F3 (−$505).
- Daily D1, descriptively on the same slices, made +$77,253 / +$22,145 / $0.
- **Local neighbourhood stability did not translate into chronological reliability.** All 24 members of each fold
  qualified on their own training data.

## 6. The C24 selection (frozen and committed before validation)

- **Members and qualification.** 75 members: 24 independent, 24 informed, 15 incumbent projections (the Intraday D1
  shortlist vectors projected into F1–F4) and 12 exploratory 2-bp members. **All 63 selectable members qualified**:
  Q1 centre net > 0, Q2 centre DD ≤ $35,000, Q3 confirmation p90 DD ≤ $35,000. There is no non-qualified selectable
  member, so the diagnostic catalog is empty.
- **The primary (actual profit)** is `F2-4.1v.m.1x.0.u.0.1r.1e` (independent lane). It is F2 CORE+C:
  - B 30 min, X 4.96%, Y 0.072%, S 2.79%, L 174 min, P 1.96%, W 1,174 min;
  - development **+$85,809**, minute DD **$15,270 (15.3% of $100k)**, 67 trades (7.5 a year), 37 wins;
  - median hold 1,347 minutes (≈ 22 hours wall-clock), 40% closed in their entry session, 60% held overnight;
  - continuation entries are 43% of its trades.

  It is nearly identical to the C23 fold primary (only Y differs). The **independent primary equals the final
  primary**: the informed lane and the incumbent projections did not beat it. The best incumbent projection made
  $24,666, which is Intraday D1's near-miss under the new rules.
- **Roles** (ranked on the selection families):

  | Role | Member | Rule | Dev. net | Dev. DD | Trades/yr | Median hold | Same-session | Sel. robust | Sel. p90 DD |
  |---|---|---|---:|---:|---:|---:|---:|---:|---:|
  | actual-profit (primary) | `F2-4.1v.m.1x.0.u.0.1r.1e` | F2 B30 X4.96% S2.79% | $85,809 | $15,270 | 7.5 | 22 h | 40% | $14,238 | $29,112 |
  | robust-profit | `F1-1.1z.2.27.0.w.0.0.0` | F1 B5 X6.26% S4.99% (box edge) | $39,872 | $10,716 | **1.5** | 53 h | 23% | $29,197 | $18,455 |
  | balanced | `F3-0.1p.b.1n.k.c.r.0.0` | F3 B1 X3.50% S1.56% H34m U0.27% | $40,638 | $5,059 | 4.5 | **40 min** | **93%** | $25,798 | $6,910 |
  | lower-drawdown | `F3-0.1l.18.14.1v.3.1z.0.0` (informed) | F3 B1 X2.77% S0.51% | $14,656 | $2,338 | 6.7 | **8 min** | **100%** | $10,849 | $3,963 |

  The robust-profit holder traded only 13 times in nine years. It is reported as such and is not the primary.
- **The qualified Pareto set** has 23 members (`REPORT_TABLES.md` §3.4 and `qualification_members.csv`).
- **The diverse catalog** has **9 members** (≤ 12 allowed, ≤ 4 per family; never padded). The four role holders come
  first. They show 0.62 entry overlap with one another, mostly the same March 2020 entries; they are mandatory. Five
  distinct additions follow:

  | Member | Lane | Description | Dev. net | Trades/yr | Median hold |
  |---|---|---|---:|---:|---:|
  | `F2-2.20.9.27.0.t.0.14.p` | informed | deep dip, slow | $69,823 | 2.5 | 9 days |
  | `F4-5.1s.1s.1w.1v.r.1f.p.1k` | informed | moderate, continuation and H/U | $55,518 | 9.9 | 21 h |
  | `F2-6.26.1d.17.0.15.0.r.y` | independent | very deep (9.4%) intraday dip, tight stop | $14,098 | 10.8 | 6 min |
  | `F3-0.27.1s.1d.1q.14.13.0.0` | independent | 10% dip, intraday | $7,451 | 2.4 | 9 min |
  | `F4-0.27.27.y.p.19.18.1d.1e` | independent | 10% dip, scalp | $2,790 | 3.8 | 3 min |

  54 candidates were rejected as near-duplicates or by the family cap (reasons in `REPORT_TABLES.md` §4).
- **The exploratory 2-bp lane** (never selectable). Its primary is `F4-6.8.20.18.1g.r.a.14.1f`: B130, X 0.16% (a
  shallow dip), 145 trades a year, median hold 104 min, 64% same-session.
  - Development net is **$98,690 at 2 bps**, but **$20,688 at 5 bps** and **−$108,784 at 10 bps**: almost entirely an
    execution-cost question.
  - Its median order is 25% of the causal median minute dollar volume, and 1,133 of its 1,296 entries exceed 10%.

## 7. Development evidence of the primary (report-only unless stated)

- **Neighbourhoods** (`qualification_members.csv`):

  | Family | Draws | Median net | p10 net | p90 DD | p95 DD | Worst DD | Worst-10% mean DD | Breach share (Wilson 95%) | Mean / worst excess | Breach ledgers |
  |---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|
  | Selection | 256 | $23,491 | $4,985 | $29,112 | $31,619 | $42,210 | $32,775 | 2.3% (1.1–5.0%) | — | — |
  | Confirmation (decides Q3) | 384 | $23,093 | $1,493 | **$30,584** | $32,810 | $46,902 | $34,734 | **4.2% (2.6–6.7%)**, 16 of 384 | $3,904 / $11,902 | 16 |
  | Half radius | 114 | $47,894 | — | $21,587 | — | — | — | 0% | — | — |
  | 1.5× radius | 128 | $16,569 | −$4,609 | **$36,922** | $41,893 | — | — | **18% (12–26%)** | — | — |

  Confirmation p90 per replicate: $29,569 / $30,167 / $30,845. The centre ($85,809) is a **sharp peak**: the
  neighbourhood median is about 27% of it. The wider radius breaches the ceiling. Tail statistics are report-only and
  never a gate; a breach frequency is not a probability of future loss.
- **One-scope families** (128 draws each), as median net / p90 DD:
  - entry genes $59,870 / $22,482;
  - stop alone $47,751 / $24,461;
  - continuation $70,786 / $15,785.
- **Costs and execution** (full causal replays):

  | Scenario | Development net |
  |---|---:|
  | 0 bps | $92,608 |
  | 2 bps | $89,888 |
  | 5 bps (primary) | $85,809 |
  | 10 bps | $79,017 |
  | 20 bps | $65,454 |
  | 14% interest | $83,179 |
  | next-trade stop fills | $80,380 |
  | +25 bps stop slippage | $68,821 |
  | trigger-minute-low fills | $80,920 |

  It is not cost-fragile: the trades are few and the dips deep.
- **Family on/off (causal whole replay):** with continuation off (→ F1, same core vector) development net is $41,340,
  so **continuation adds +$44,469**.
- **Concentration** (episodes are entry months, predeclared):
  - 24 episodes in 13 quarters and 6 entry years;
  - **2020 alone made $56,885, 66% of the net, from 43 of 67 trades**; 2016, 2017 and 2023 had no trade; 2021 and
    2022 were near zero;
  - the top month (2019-01, 20%) blacked out gives **$61,174**, with the same $15,270 DD;
  - profit factor 2.45; worst trade −$4,585; longest losing streak 4.
- **Capacity:** the median entry is 12% of the causal median minute dollar volume, and 43 of 67 entries exceed 10%.
  Minute OHLCV is not order-book depth. All 67 exits are stop exits (59 intrabar, 8 gaps at the open); the intrabar
  stop-level fills are optimistic within the minute.

## 8. Validation (2025-01-02 → 2026-10-30, once; `results/validation/validation.json`)

| Subject | Development | 2025 | 2026 (to 10-30) | Validation | Reset val. DD | Whole-run DD | V1 / V2 / V3 |
|---|---:|---:|---:|---:|---:|---:|---|
| **Primary** `F2-4.1v.m…1e` | $85,809 | +$8,109 | −$2,464 | **+$5,645** | $11,863 | $19,830 | pass / pass / pass |
| robust-profit `F1-1.1z.2…` | $39,872 | +$5,942 | +$3,348 | +$9,290 | $13,203 | $19,238 | pass / pass / pass |
| balanced `F3-0.1p.b…` | $40,638 | +$6,133 | −$341 | +$5,793 | $3,838 | $5,059 | pass / pass / pass |
| lower-drawdown `F3-0.1l.18…` | $14,656 | −$1,549 | +$739 | −$811 | $4,231 | $4,283 | fail / pass / pass |
| catalog `F2-2.20.9…` | $69,823 | +$1,012 | +$947 | +$1,959 | $15,481 | $18,363 | pass / pass / pass |
| catalog `F4-5.1s.1s…` | $55,518 | +$1,206 | +$1,195 | +$2,400 | $13,157 | $20,775 | pass / pass / pass |
| catalog `F2-6.26.1d…` | $14,098 | +$4,291 | $0 | +$4,291 | $2,547 | $3,635 | pass / pass / pass |
| catalog `F3-0.27.1s…` | $7,451 | +$3,413 | $0 | +$3,413 | $931 | $2,723 | pass / pass / pass |
| catalog `F4-0.27.27…` | $2,790 | +$1,743 | $0 | +$1,743 | $980 | $1,732 | pass / pass / pass |
| exploratory 2-bp primary (at 2 bps) | $98,690 | +$8,555 | −$1,992 | +$6,562 | $12,944 | $15,377 | pass / pass / pass |
| *Control:* daily D1, harmonized (5 bps, 2016-02-01) | $135,359.04 | +$47,463 | −$6,561 | **+$40,901** | $14,938 | $19,534 | — |
| *Control:* daily D1, native (costs 0) | $137,222.97 | +$47,865 | −$6,514 | +$41,351 | $14,819 | $19,331 | — |
| *Control:* Intraday D1 #1 (L0, native = harmonized) | $71,245.59 | +$7,415 | −$1,231 | +$6,184 | $15,466 | $17,280 | — |

- **The primary.** Its profit pace fell from $9,632 a year (development, 8.91 years from arming) to **$3,099 a year (validation, 1.82 years; −68%)**. It made 16
  trades after 2024. The FULL run reproduces its development figure exactly ($85,809), so nothing leaked or was double
  counted.
- **Stresses on validation** (all positive):

  | Scenario | Validation net |
  |---|---:|
  | 0 bps | $7,252 |
  | 2 bps | $6,609 |
  | 10 bps | $4,039 |
  | 20 bps | $833 |
  | 14% interest | $5,480 |
  | next-trade stops | $3,649 |
  | +25 bps slippage | $1,629 |
  | minute-low fills | $3,660 |

- **The primary's validation neighbourhood** (confirmation rep 1, 128 draws, report-only): median +$3,055, p10
  −$4,867, 67% positive; no validation-window breach. The whole-run (2016–2026) breach share is 14%.
- **All 63 selectable members:** 51 had positive validation (median +$1,743). The exploratory 2-bp members' validation
  ranged from −$6,891 to +$8,357 at 2 bps.
- **The frozen tests were decisive for none.** Nothing was reselected, retuned or re-searched after validation, and no
  validation result changes a role.

## 9. Controls (native and harmonized; `results/controls/development.json`)

- **Reproduced to the cent on development** (and on FULL for the development window):
  - daily D1 `primary`: native $137,222.97 / DD $19,330.69 / 17 trades (canonical D1 file); harmonized $135,359.04 /
    $19,534.41;
  - Intraday D1 shortlist #1: $71,245.59 / $17,279.91 / 83 trades.
- **Daily D1 dominates every new phenotype** in development net and in validation, at a similar drawdown. It is a
  control only: a session clock, a 21.6% dip and a profit-conditioned stop are not this study's architecture.
- **No optimization method is claimed superior** from these figures.

## 10. Do the mechanics deliver short-duration trades?

**Yes, but the short-duration phenotypes earn little at 5 bps.** The shortest qualified phenotypes trade a few times a
year, hold minutes and close in the session; they make $3k–$41k over nine years:

| Phenotype | Median hold | Same-session | Development net |
|---|---:|---:|---:|
| balanced F3 | 40 min | 93% | $40,638 |
| lower-drawdown F3 | 8 min | 100% | $14,656 |
| catalog F2 / F3 / F4 deep scalps | 3–9 min | 100% | $2,790 – $14,098 |

The primary is a moderate swing trade (22 hours, 40% same-session) that depends on deep, rare dips. The high-frequency
(145 trades a year) region is profitable only at 2 bps and is capacity-limited. Nothing here is a high-frequency
intraday edge at the study's 5-bps primary friction.

## 11. Answers to the brief, and Phase 2

- **Feasibility.**
  - The mechanics produced qualified development profit within the drawdown budget: the primary +$85,809 at $15,270
    DD.
  - But that profit is one crash recovery, the independent procedure failed chronologically (a 2020 DD breach of
    $46,082 and a −$16,018 slice in 2022–2023), and validation was weak.
  - Verdict **(c)**.
- **Phenotypes.** Nine distinct qualified phenotypes span:
  - slow deep-dip swing trades with continuation (F2/F4);
  - a rare deep-dip core (F1, at the stop-box edge);
  - intraday scalps with H/U (F3);
  - very deep 10% intraday dips.

  None combines a substantial profit with short holding.
- **Rule effects.** The profit-conditioned stop was Intraday D1's profit engine (§3). Continuation adds materially to
  the primary (+$44,469). H/U is inert in most short configurations.
- **Phase 2: not recommended on this evidence.** The only material lead is an execution question: the shallow,
  high-frequency region earns about $150k gross of friction over nine years but needs an effective cost of ≤ 2 bps per
  side and more liquidity than VGT minute volume showed in 2016–2019. Pursuing it would need a separately authorized
  study of a limit-order or cost model with tick or quote data. That is not a continuation of this one, and the brief
  excludes it here.

## 12. Limitations and disclosures

- **Market data.**
  - Bars, not ticks: intraminute order is unknown. Stop-level fills are optimistic; the next-trade, minute-low and
    slippage bounds are reported.
  - Market impact is not modelled.
  - Raw prices: dividends are not credited.
- **Prior exposure.** Validation is on previously examined history. The rule family itself was conceived after that
  exposure (`EXISTING_FINDINGS_AND_CHANGE_MAP.md`).
- **Box edges.** The S upper bound (4.99%) binds in several slow members. X up to 9.98% admits deep, rare-event
  members. Bounds were frozen and not moved.
- **Same-period carry (L2+).** An exit order unfilled at a period's end waits for the next trade. This is part of L2's
  change and keeps B = 1 meaningful; L0/L1 keep D1's period-bounded lookup.
- **Data peeks.**
  - The coverage scan read every row's timestamp (no price) to measure the endpoint.
  - The pilot logs printed pilot-budget development results on 2016–2019; these inform no choice.
  - Before the freeze, the D24 door was used for the bench and the engine probes, and timing probes printed
    development lot counts.
- **Code quality.** The study code has 0 eslint errors and 338 warnings (formatting only); it was not reformatted
  after the freeze, which would change the frozen code digest.
- **No amendments** were needed. 345 sealed records verify. Failed tests and the dry-run failure are preserved.

## 13. Reproduction

`RUN_COMMANDS.md`; the chains `chains/pilot.sh` and `chains/study.sh`; tables by
`node --experimental-transform-types --disable-warning=ExperimentalWarning tools/intraday-dip-recovery/tables.ts`.
Seeds are `deriveSeed('intraday-dip-recovery-vgt', …)`, so reruns are deterministic. Sealed stages refuse to rerun.

## 14. The brief's acceptance checklist

| Condition | Status | Evidence |
|---|---|---|
| No existing D1, Intraday D1, Study 8, Growth or Strategy Lab implementation or frozen record modified | met | `git diff 8c20f855` outside the new namespaces: `package.json` (one script line) only; `npm run intraday-d1 -- verify`: 0 problems |
| Current standard adopted (2.0.0, hash pinned), template used, preflight succeeds, safeguards documented and exercised | met | `STANDARD_ADOPTION.json`; `results/preflight/`, `results/verification/preflight-final.txt`; `PROTOCOL.md`; `results/pilot/PILOT.md` |
| Core has unconditional protective stops, same-period exits, H/U OFF and continuation OFF, with F2–F4 isolated | met | `engine.ts`, `context.ts` `families`; tests; parity P8 |
| Primary maximizes actual development net with a hard ≤ $35,000 minute DD on $100k; no activity, annual-profit or biggest-winner vetoes; roles, the qualified four-objective Pareto set and the neighbourhoods and confirmation present | met | `PROTOCOL.md` §9; `results/qualify/C24.json` |
| Centre-profit promotion and F1–F4 structural coverage protected; distinct identity and ledgers; no forced number of winners | met | `search.ts` `promote` (¼ centre net, ½ cell round robin); `search_cells.csv`; catalog of 9 (≤ 12, not padded) |
| C19/C21/C23 search and selection repeated and committed before their slices; C24 frozen before any new-candidate 2025–2026 result; no tuning from validation | met (with departure D1: the informed lane runs at C24 only, citing brief §4 and §3.3) | commits `d76e2cab`, `a13ae56b`, `0c047bea` before `5bc068e2`, `f69be3f4`, `37c6737b`; `440b8d87` before the FULL opening; `results/doors.jsonl` |
| Stress tests, causal fills, drawdown and interest accounting, and capacity limits explicit | met | parity P4, P5, P7; §7–§8; ledgers' capacity columns |
| Tail-risk and perturbation statistics included as report-only | met | §7; `qualification_members.csv` |
| Outputs Markdown and JSON/JSONL/CSV only; no charts or visuals | met | this directory |
| Honest outcome; no unsanctioned follow-up research | met | verdict (c); no Phase 2 started |
