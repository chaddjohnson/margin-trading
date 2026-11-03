# Study 9 Phase B — pool complementarity and the funded ledger

**Source:** the sealed report-only post-test record `results/diagnostics/diagnostics.json` (chain entry 17
`diagnostics`) on the continuous run 2016-01-04 → 2026-10-29 (5 bps, 11%, the fixed $100k slot), for all 32 F24 role
holders and VG #2, VG #1, B1 and B5; tables `results/tables/diag-*.md`. Every figure is **conditional on the sealed
vectors and on the shared-slot order** (first executable signal wins); it is not intrinsic ETF alpha, and a subset
replayed with the same vectors is not an optimized pool. No subset is a new candidate: possible improvements are
recorded for future research only.

## 1. The nominee: #2 G4-EWW profit (KRE + EWW + GDX + MTUM)

All 15 non-empty membership subsets with the sealed vectors held fixed:

| Books | Whole-run net | Test-window net | Run minute DD | Lots | Refused |
|---|---:|---:|---:|---:|---:|
| KRE | $86,613 | $2,123 | $29,792 | 64 | 0 |
| EWW | $23,973 | $0 | $25,636 | 25 | 0 |
| GDX | $178,718 | $29,407 | $28,228 | 44 | 0 |
| MTUM | $21,359 | $0 | $10,958 | 8 | 0 |
| KRE+EWW | $110,219 | $2,123 | $30,071 | 74 | 15 |
| KRE+GDX | $248,463 | $31,530 | $28,228 | 94 | 14 |
| KRE+MTUM | $91,623 | $2,123 | $29,792 | 68 | 4 |
| EWW+GDX | $211,431 | $29,407 | $28,228 | 65 | 4 |
| EWW+MTUM | $35,265 | $0 | $24,863 | 31 | 2 |
| GDX+MTUM | $182,057 | $29,407 | $22,188 | 45 | 7 |
| KRE+EWW+GDX | $283,434 | $31,530 | $28,228 | 103 | 30 |
| KRE+EWW+MTUM | $121,308 | $2,123 | $29,792 | 79 | 18 |
| KRE+GDX+MTUM | $250,347 | $31,530 | $26,373 | 92 | 24 |
| EWW+GDX+MTUM | $213,605 | $29,407 | $22,188 | 65 | 12 |
| **KRE+EWW+GDX+MTUM** | **$291,397** | **$31,530** | **$22,975** | 102 | 39 |

- **Shapley attribution of whole-run net:** GDX $172.2k, KRE $78.8k, EWW $30.1k, MTUM $10.2k. Leave-one-out: GDX
  $170.1k, KRE $77.8k, EWW $41.1k, **MTUM $8.0k** — every book contributes positively, MTUM least.
- **Test window (2025-01-02 → 2026-10-29): only GDX ($29.4k) and KRE ($2.1k) earned anything; EWW and MTUM took no
  test-window lot.** The pool's 2025–2026 economics are essentially a GDX book.
- **Drawdown:** MTUM is the drawdown diversifier here: adding it to KRE+EWW+GDX lowers the run DD from $28.2k to
  $23.0k while adding $8.0k (GDX+MTUM alone has $22.2k). The pool's worst drawdown ($22,975) is the 2020-03-17 →
  03-23 crash; its test-window worst ($22,188) is a 2026 GDX episode.
- **Slot contention:** 39 refusals over the run (KRE 24 of its 64 decisions refused, EWW 6/25, GDX 6/44, MTUM 3/8).

The other G4-EWW holders share the GDX-led structure, but MTUM's weight differs (`diag-complementarity.md`). In #3
G4-EWW extra, Shapley is GDX $176k, KRE $112k, EWW $56k, MTUM $17k, with EWW and MTUM again at $0 in the test
window. In #4, #5 and #6, MTUM's leave-one-out contribution is $52k, $65k and $77k, and its test-window Shapley value
$0.2k, −$1.2k and $6.8k.

## 2. VG #2 balanced, the primary comparator

| Books | Whole-run net | Test-window net | Run minute DD | Lots | Refused |
|---|---:|---:|---:|---:|---:|
| VGT | $150,010 | $47,239 | $21,794 | 13 | 0 |
| GDX | $218,762 | $32,685 | $36,160 | 49 | 0 |
| **VGT+GDX** | **$340,148** | **$79,925** | **$21,304** | 48 | 14 |

VG #2's GDX book alone breaches the $35k ceiling ($36.2k); adding the VGT book cuts the drawdown by about 40% (to
$21.3k) and contributed $47.2k in the test window (the 2025 rebound), which none of the G4 pools could capture: they
hold no VGT.

## 3. Across the 32 F24 holders (`diag-complementarity.md`)

- **Every leave-one-out contribution is positive** except two: KRE in #12 G4-ILF extra (−$32.6k) and IWM in #26 V3-IWM
  balanced (−$9.4k). These are the preference record's "contribution" failures. Most memberships are therefore
  complementary at their sealed vectors.
- **Low-contribution books** (whole-run leave-one-out):
  - **MTUM in #2 and #3 G4-EWW** ($8.0k and $16.2k, no test-window lots). Elsewhere MTUM matters: $16–111k in the other
    G4 holders, the largest book of #12 ($111.4k). Its test-window Shapley value is non-zero in 8 of the 10 G4 holders
    (e.g. #12 $14.7k, #17 $13.2k, #8 $11.1k).
  - **XHB in #14 N2-SMH profit** ($2.0k): the pool is effectively SMH.
  - **IWM in the VG3-IWM holders:** $17.8k (#9), $18.5k (#10), $31.3k (#15), $45.2k (#16), $52.7k (#1); $0–7k in the
    test window.
  - **KRE in #11 G4-ILF extra** ($14.8k) and **XLF in #23 V3-IWM profit** ($13.9k).
  - Removing any of them is a hypothesis for separate research, not a selected track.
- **GDX is the largest book (Shapley) in 11 of the 15 GDX holders**, at $41–216k across all 15. The exceptions are
  #7 and #8 G4-ILF (KRE $121k and $115k), #15 VG3-IWM robust (VGT $90k) and #17 G4-ILF robust (ILF $61k). As in
  Study 8, the 2020 rebound and the 2026 GDX path drive much of the profit. They also drive the worst 2026 drawdowns
  of the G4-EWW and VG holders (`EXECUTION_RISK_AND_LIQUIDITY.md` §4).

## 4. Trade-sequence stability (first test family; `NEIGHBORHOOD_ROBUSTNESS.md` §2)

The nominee's 384 test neighbours keep a median 18.6% of its funded lots (ledger Jaccard 0.10; median 83 displaced
and 82 added lots per neighbour) while their median whole-run net ($289.9k for the low-overlap neighbours) stays
close to the centre's $291.4k: **different trades, similar aggregate profit** — not "small perturbations destroy
profit" (`sequenceDependent` false). The per-lot ledger of any one configuration is one realization.

## 5. Ledgers

- **Sealed per-lot ledgers** (`results/test/<FOLD>/test-lots.jsonl.gz`): every role holder and control of every test
  fold (symbol, trade id, decision, entry, exit, net, interest, costs, open, in-test flag, minute MAE).
- **Reconciled runner ledgers:** the runner's `compare s9b-rank-1 … s9b-rank-32 s8-vg-balanced s8-vg-profit
  vgt-primary b5-frozen --end 2026-10-29` (run as `node … src/study9b-runners/main.ts`, before the npm script existed)
  went through the unchanged pools engine. It reproduced all 36 configurations' totals and **1,854 funded lots with 0
  mismatches**. B1 and B5 are reconciled against Study 7's sealed final door, the rest against Phase B's F24 record;
  see `BASELINES_AND_PARITY.md` §3 (`results/runner/reconcile-2026-10-29.txt`; outputs under the git-ignored
  `evaluations/study9b-runs/reconcile-2026-10-29/`, one folder per alias with `lots.txt`, `lots.csv`, `lots.json`,
  `trades.csv`, `signals.csv`, `daily.csv`, `monthly.csv`, `yearly.csv`, `runner.json`).
