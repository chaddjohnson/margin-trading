<!-- Rendered by `npm run vgt-robustness -- report` from templates/BASELINE_AND_COMPARABILITY.md and results/analysis.json; edit the template, not this file. -->
# Baseline reproduction and comparability

**Status: all 49/49 baseline checks pass.** Every frozen configuration was reproduced exactly before
any comparison was interpreted: the anchors, the frozen controls, the existing standalone CLI and the prior audit's
stored records. Window 2016-01-04 → 2026-10-13 (2,710 sessions, continuous `all`, arming 2017-06-15). The whole window was
inspected while these strategies were selected. **Every figure below is retrospective.**

## 1. The anchors

Each pool's anchor value from the brief is shown in parentheses. Fixed = one $100,000 lot at 5 bps per side and 11%
simple interest. Portfolio = the $300,000 60/40 VOOG/VGT core, borrowing 20% of marked equity per funded lot, with the
frozen dividend convention.

| Configuration | Fixed net | Fixed max minute DD | Funded lots | Portfolio end equity | Max daily-close % DD | Max minute-sampled % DD |
|---|---:|---:|---:|---:|---:|---:|
| S (VGT-primary standalone) | $176,260.47 | $19,534.41 | 21 | $2,958,025.76 | 32.78% | 35.21% |
| B4 (anchor) | $284,244.74 ($284,244.74) | $28,659.34 ($28,659.34) | 76 (76) | $3,608,484.05 ($3,608,484.05) | 34.65% (34.65%) | 37.01% (37.01%) |
| B5 (anchor) | $486,207.77 ($486,207.77) | $26,509.97 ($26,509.97) | 94 (94) | $5,410,976.72 ($5,410,976.72) | 29.67% (29.67%) | 31.09% (31.09%) |
| C0 (anchor) | — | — | — | $2,279,768.98 ($2,279,768.98) | 33.89% (33.89%) | 35.76% (35.76%) |

S has no anchor in the brief. Its figures are equal, in every summary field, to the frozen control **B1 ("VGT D1
alone, primary")** in `research/joint-16-etf-d1/results/controls/controls.json`. That control exists at 0, 2, 5 and
10 bps, and this study used all four in both modes (§3).

## 2. Every baseline check

The record is `results/baseline/baseline.json`, produced by `npm run vgt-robustness -- baseline`.

The first run, before the protocol freeze, had 47 checks and stored S's two base records. Every rerun adds two checks:
it recomputes those records and requires them to equal the stored ones, rather than appending new ones.

| # | Check | Result | Detail |
|---:|---|---|---|
| 1 | B4 fixed: equals the prior audit's stored base record cost:B4:base:fixed | PASS | every stored field identical |
| 2 | B4 fixed anchor: net | PASS | 284244.74 vs 284244.74 |
| 3 | B4 fixed anchor: max minute DD | PASS | 28659.34 vs 28659.34 |
| 4 | B4 fixed anchor: funded lots | PASS | 76 vs 76 |
| 5 | B4 portfolio: equals the prior audit's stored base record cost:B4:base:portfolio | PASS | every stored field identical |
| 6 | B4 portfolio anchor: end equity | PASS | 3608484.05 vs 3608484.05 |
| 7 | B4 portfolio anchor: max daily-close % DD (0.01 pp) | PASS | 0.3464613481592348 vs 0.3465 |
| 8 | B4 portfolio anchor: max minute-sampled % DD (0.01 pp) | PASS | 0.37014940266383856 vs 0.3701 |
| 9 | B5 fixed: equals the prior audit's stored base record cost:B5:base:fixed | PASS | every stored field identical |
| 10 | B5 fixed anchor: net | PASS | 486207.77 vs 486207.77 |
| 11 | B5 fixed anchor: max minute DD | PASS | 26509.97 vs 26509.97 |
| 12 | B5 fixed anchor: funded lots | PASS | 94 vs 94 |
| 13 | B5 portfolio: equals the prior audit's stored base record cost:B5:base:portfolio | PASS | every stored field identical |
| 14 | B5 portfolio anchor: end equity | PASS | 5410976.72 vs 5410976.72 |
| 15 | B5 portfolio anchor: max daily-close % DD (0.01 pp) | PASS | 0.2966781505859238 vs 0.2967 |
| 16 | B5 portfolio anchor: max minute-sampled % DD (0.01 pp) | PASS | 0.3108515423395935 vs 0.3109 |
| 17 | C0: equals the prior audit's stored control record | PASS | every stored field identical |
| 18 | C0 anchor: end equity | PASS | 2279768.98 vs 2279768.98 |
| 19 | C0 anchor: max daily-close % DD (0.01 pp) | PASS | 0.3389153987988318 |
| 20 | C0 anchor: max minute-sampled % DD (0.01 pp) | PASS | 0.3576023408402881 |
| 21 | VGT-primary fixed 5 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.fixed-5 | PASS | 21 lots, net 176260.47 |
| 22 | VGT-primary portfolio 5 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.portfolio-5 | PASS | 21 lots, net 292370.65 |
| 23 | VGT-primary fixed 0 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.fixed-0 | PASS | 21 lots, net 178574.3 |
| 24 | VGT-primary portfolio 0 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.portfolio-0 | PASS | 21 lots, net 297565.49 |
| 25 | VGT-primary fixed 2 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.fixed-2 | PASS | 21 lots, net 177648.49 |
| 26 | VGT-primary portfolio 2 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.portfolio-2 | PASS | 21 lots, net 295483.93 |
| 27 | VGT-primary fixed 10 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.fixed-10 | PASS | 21 lots, net 173948.96 |
| 28 | VGT-primary portfolio 10 bps: every summary field = research/joint-16-etf-d1/results/controls/controls.json all.B1.portfolio-10 | PASS | 21 lots, net 287205.81 |
| 29 | VGT-primary fixed: gross − friction − interest = net per lot | PASS | largest gap 0.00e+0 |
| 30 | VGT-primary fixed: yearly attribution sums to the total | PASS | gap 0.00e+0 |
| 31 | VGT-primary fixed: minute-sampled DD ≥ daily-close DD | PASS | minute 19534.41 vs daily 15817.01 |
| 32 | VGT-primary fixed: Σ lot net = final strategy mark, no open lot | PASS | gap 0.00e+0, open 0 |
| 33 | VGT-primary fixed: equals its stored s-base record | PASS | every field identical |
| 34 | VGT-primary portfolio: gross − friction − interest = net per lot | PASS | largest gap 2.55e-11 |
| 35 | VGT-primary portfolio: yearly attribution sums to the total | PASS | gap 0.00e+0 |
| 36 | VGT-primary portfolio: minute-sampled DD ≥ daily-close DD | PASS | minute 559292.42 vs daily 482594.48 |
| 37 | VGT-primary portfolio: running-peak daily % DD recomputed from daily equity = engine | PASS | 0.3277634163361198 vs 0.3277634163361198 |
| 38 | VGT-primary portfolio: equals its stored s-base record | PASS | every field identical |
| 39 | VGT-primary fixed 0 bps = the standalone CLI trade by trade (research/vgt-standalone-vs-pooled-robustness/results/parity/cli-vgt-primary-all-trades.csv) | PASS | 21 trades: dates, times, fills, reasons, interest and net equal |
| 40 | B4 fixed: the VGT book's virtual trades = the standalone's lots (shadow policy) | PASS | 21 virtual VGT trades vs 21 standalone lots |
| 41 | B4 fixed: every funded VGT lot is a standalone lot | PASS | 14 funded VGT lots of 21; 7 blocked by another book's slot |
| 42 | B5 fixed: the VGT book's virtual trades = the standalone's lots (shadow policy) | PASS | 21 virtual VGT trades vs 21 standalone lots |
| 43 | B5 fixed: every funded VGT lot is a standalone lot | PASS | 12 funded VGT lots of 21; 9 blocked by another book's slot |
| 44 | B4 VGT per-book design regenerated = prior MANIFEST.json | PASS | 32 samples vs 32 stored |
| 45 | B4 VGT OAT points = prior MANIFEST.json | PASS | 32 points |
| 46 | B5 VGT per-book design regenerated = prior MANIFEST.json | PASS | 32 samples vs 32 stored |
| 47 | B5 VGT OAT points = prior MANIFEST.json | PASS | 32 points |
| 48 | determinism: standalone portfolio twice in-process | PASS | identical |
| 49 | determinism: worker thread = in-process | PASS | identical |

Two further checks ran inside `analyze`:
- all 130 pooled path re-executions (§4 of the protocol) equal their stored prior-audit records in every
  stored field;
- the four base portfolio runs re-executed for the VGT-duplication measure equal their stored records.

## 3. What is identical, and what differs

**Identical across S, B4 and B5:**
- the engine (`src/portfolio-aware-d1/nbook/engine.ts`, called exactly as `src/pools/run.ts` does);
- the data files and window;
- the arming date, the cost and interest conventions, the stop-fill rule and the portfolio model;
- the VGT parameter vector (`config/phenotypes/D1/VGT.json` `primary`).

S is the one-book pool `[VGT primary]`.

**The existing standalone CLI.** S at 0 bps (the strategy file has no per-side cost) matches it trade by trade:
- dates and times;
- raw fills;
- exit reasons;
- interest;
- net.

The command was `npm run app -- allIn-trailingBuy-postExitContinuation VGT all - - - <dir> --phenotype primary`. Its
21 trades are copied to `results/parity/cli-vgt-primary-all-trades.csv`.

**The shadow identity.** Under the frozen shadow policy each book runs its virtual strategy whether or not it is
funded. The VGT book's 21 virtual trades inside B4 and B5 are therefore exactly S's 21 lots: same decision, exit and
net. A pool funds a VGT trade only if the single slot is free at the decision:
- B4 funds 14 of the 21; 7 are blocked by another book;
- B5 funds 12; 9 are blocked.

The same holds for every perturbed VGT vector: in all 64 matched samples, the pool's funded VGT lots are a subset of
the standalone's lots for the same vector (`PARAMETER_STABILITY.md`).

**What differs** is only which other books compete for the one slot.

- Before 2020 no other book funded a lot, so S, B4 and B5 earn exactly the same through 2019
  (`TRADES_YEARS_AND_REGIMES.md`).
- **Fixed mode:** VGT signals blocked in B4 had S-net $9,745. The other books' lots that held the slot
  earned $8,216. In B5 the figures are $66,165 against $74,116.
- **Portfolio mode:** S's overlay adds VGT exposure on top of the core's VGT, while the pools spread part of their
  borrowing over XBI, XRT, KRE and GDX (`PORTFOLIO_RISK_AND_CAPITAL_EFFICIENCY.md`).

**Refused signals at the frozen point (fixed):**

| | Refusals | VGT signals refused | Other books refused because VGT held the slot |
|---|---:|---:|---:|
| B4 | 71 | 7 | 52 |
| B5 | 78 | 9 | 24 |

## 4. S's 21 lots in the three structures (fixed, base)

"Blocked" means the pool's slot was held by the named lot when the VGT decision came. Nets are at $100,000. This is
descriptive displacement accounting, not a counterfactual.

| S lot | Entry (ET) | Exit (ET) | Exit reason | S net | In B4 | B4 slot holder (its net) | In B5 | B5 slot holder (its net) |
|---:|---|---|---|---:|---|---|---|---|
| 1 | 2018-12-21 12:35 | 2019-05-13 09:54 | trailing stop | $20,250 | funded |  | funded |  |
| 2 | 2019-08-05 15:12 | 2020-02-24 09:30 | trailing stop gap | $17,589 | funded |  | funded |  |
| 3 | 2020-02-28 09:32 | 2020-03-06 09:30 | trailing stop | $2,295 | funded |  | funded |  |
| 4 | 2020-03-12 09:32 | 2020-03-20 09:31 | maximum hold | −$3,544 | **blocked** | KRE 2020-03-09→2020-03-13 (−$8,258) | **blocked** | KRE 2020-03-09→2020-03-13 (−$8,258) |
| 5 | 2020-03-23 09:33 | 2020-04-01 12:49 | trailing stop | $9,015 | funded |  | **blocked** | GDX 2020-03-23→2020-03-27 ($16,091) |
| 6 | 2020-04-02 09:33 | 2020-09-04 09:30 | trailing stop | $51,264 | funded |  | **blocked** | GDX 2020-04-01→2020-04-15 ($27,571) |
| 7 | 2020-10-28 10:09 | 2021-02-23 09:38 | trailing stop | $13,031 | funded |  | funded |  |
| 8 | 2021-03-05 11:31 | 2021-05-11 09:30 | trailing stop gap | $3,313 | funded |  | funded |  |
| 9 | 2022-03-14 14:35 | 2022-04-07 12:45 | trailing stop | $7,590 | **blocked** | XBI 2022-03-14→2022-03-21 ($9,707) | **blocked** | XBI 2022-03-14→2022-03-21 ($9,707) |
| 10 | 2022-04-26 15:45 | 2022-05-06 09:31 | maximum hold | −$1,176 | funded |  | funded |  |
| 11 | 2022-05-12 09:42 | 2022-06-10 09:36 | trailing stop | $2,013 | **blocked** | XBI 2022-05-12→2022-05-18 ($10,542) | **blocked** | XBI 2022-05-12→2022-05-18 ($10,542) |
| 12 | 2022-06-13 09:34 | 2022-06-21 09:31 | maximum hold | −$1,191 | **blocked** | XBI 2022-06-10→2022-06-15 (−$5,200) | **blocked** | XBI 2022-06-10→2022-06-15 (−$5,200) |
| 13 | 2022-06-22 09:32 | 2022-07-01 09:31 | maximum hold | $35 | funded |  | funded |  |
| 14 | 2022-07-05 09:34 | 2022-08-26 15:12 | trailing stop | $10,956 | funded |  | funded |  |
| 15 | 2022-09-16 10:03 | 2022-09-26 09:31 | maximum hold | −$3,284 | funded |  | **blocked** | GDX 2022-09-16→2022-10-10 ($2,048) |
| 16 | 2022-10-10 11:14 | 2022-11-03 09:32 | trailing stop | $575 | **blocked** | XRT 2022-10-03→2022-10-20 ($146) | funded |  |
| 17 | 2022-11-04 09:54 | 2022-12-15 11:15 | trailing stop | $6,628 | **blocked** | XRT 2022-10-25→2022-12-15 ($2,040) | **blocked** | GDX 2022-11-03→2022-12-15 ($22,376) |
| 18 | 2025-04-04 09:46 | 2025-04-10 12:17 | trailing stop | $1,151 | funded |  | funded |  |
| 19 | 2025-04-11 09:36 | 2025-04-21 09:31 | maximum hold | −$2,239 | funded |  | funded |  |
| 20 | 2025-04-22 09:38 | 2025-11-07 10:45 | trailing stop | $44,315 | funded |  | funded |  |
| 21 | 2025-11-21 09:49 | 2026-02-05 09:31 | maximum hold | −$2,326 | **blocked** | XRT 2025-11-12→2026-03-03 (−$760) | **blocked** | XRT 2025-11-12→2026-03-03 (−$760) |

## 5. Comparability rules applied in every report

- Fixed-pool figures are dollars on a constant $100,000 slot. Their drawdown percentages are % of $100,000. Portfolio
  figures are compounding equity, and their drawdowns are running-peak % of marked equity. The two are never
  interchanged.
- **Daily-close** and **minute-sampled** drawdowns are labelled. Minute-sampled is never smaller.
- The pools' figures come from the prior audit's stored records (`research/b4-b5-robustness-audit/results/`), which are
  reproduced above. Only S was simulated fresh, plus the pooled path re-executions verified equal to those records.
- Nothing after 2026-10-13 was read. No variant was written to `config/`. The prospective B4/B5 freeze is untouched
  and still verifies (`npm run vgt-robustness -- verify`).
