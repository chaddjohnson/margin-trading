# Holdout and final: nothing new was evaluated

**No configuration of this study was run on the holdout (2024-01-01 → 2025-10-16), the final window (2025-10-17 →
2026-10-13) or the continuous `all` history.** The training gates admitted no nominee (JOINT_SEARCH_RESULTS.md §1), so
`FROZEN_SELECTION.json` (frozen 2026-10-25T07:34:26Z, manifest `699e2186091fa5e8…`, body hash verified by every later
command) records the outcome **"no advancement"** with zero nominees, and the one-time
`npm run joint-16-etf-d1 -- evaluate` wrote `results/evaluation/evaluation.json`: "The frozen selection holds no
nominee: no candidate is evaluated after training; the benchmarks are retained." There is nothing to confirm with
`evaluate --confirm`, and no post-training figure of any searched configuration exists.

This was the protocol's predeclared branch (§9: "If no configuration passes, the manifest freezes the no-advancement
outcome and no candidate is evaluated after training"), not a choice made after looking: in particular R1 (XBI XRT KRE
GDX), the leading training result, which failed only T6, was **not** evaluated on later data, because doing so would be an
unregistered look and an invitation to rescue it.

## The frozen benchmarks over the full history (inspected, reproduced exactly)

For orientation only — every figure below was computed and published by earlier studies and reproduced here to the cent
(DATA_AND_ENGINE_AUDIT.md §6; `results/controls/controls.json`). One continuous run each, 2016-01-04 → 2026-10-13,
books arming 2017-06-15, every state carried across both partition boundaries; segments are attributions of that run
from the marked state at the boundary closes.

### Fixed $100,000 pool — strategy P&L by segment

| Benchmark | Cost | Development (training) | Holdout | Final | Holdout + final | Full | Minute DD (all) | Lots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B1 VGT D1 alone | 5 bps | $135,359 | $44,422 | −$3,520 | $40,901 | $176,260 | $19,534 | 21 |
| B4 All-lowDd | 5 bps | $242,196 | $44,003 | −$1,954 | $42,049 | $284,245 | $28,659 | 76 |
| B5 All-lowDd + GDX | 5 bps | $388,489 | $68,584 | $29,135 | $97,719 | $486,208 | $26,510 | 94 |
| B1 | 0 / 2 / 10 bps | $137,223 / $136,477 / $133,497 | $44,697 / $44,587 / $44,147 | −$3,345 / −$3,415 / −$3,695 | $41,351 / $41,171 / $40,452 | $178,574 / $177,648 / $173,949 | $19,331 / $19,412 / $19,738 | 21 |
| B4 | 0 / 2 / 10 bps | $249,174 / $246,625 / $233,867 | $44,378 / $44,228 / $43,629 | −$1,777 / −$1,848 / −$2,132 | $42,601 / $42,380 / $41,497 | $291,775 / $289,005 / $275,364 | $27,968 / $28,245 / $29,350 | 76 |
| B5 | 0 / 2 / 10 bps | $396,715 / $393,667 / $379,867 | $69,085 / $68,884 / $68,083 | $29,947 / $29,622 / $28,324 | $99,032 / $98,506 / $96,406 | $495,747 / $492,173 / $476,274 | $26,310 / $26,390 / $26,710 | 94 |

Minute drawdowns as % of the $100,000 lot: B1 19.5%, B4 28.7%, B5 26.5% (5 bps); daily-sampled $15,817 / $25,268 /
$23,789.

### 20% portfolio ($300,000 at the first close, 60/40 VOOG/VGT core)

| Benchmark (5 bps) | Ending equity | Development return | Holdout return | Final return | Post-training compounded | Max % DD daily / minute (all) | Holdout / final max % DD |
|---|---:|---:|---:|---:|---:|---|---|
| C0 core only, no book | $2,279,769 | 272.1% | 58.7% | 28.7% | 104.2% | 33.89% / 35.76% | 24.70% / 15.13% |
| B1 | $2,958,026 | 358.6% | 68.4% | 27.7% | 115.0% | 32.78% / 35.21% | 25.33% / 16.31% |
| B4 | $3,608,484 | 459.3% | 68.4% | 27.7% | 115.1% | 34.65% / 37.01% | 25.21% / 16.02% |
| B5 | $5,410,977 | 656.8% | 76.5% | 35.0% | 138.3% | 29.67% / 31.09% | 25.13% / 15.22% |

At 0 / 10 bps: B5 $5,513,978 / $5,305,597 (29.64% / 29.70% daily); B4 $3,661,933 / $3,546,472; B1 $2,970,718 /
$2,945,395. Every full-history maximum percentage drawdown is March 2020; the post-training segment returns, measured
on each configuration's own base, show B5's post-training trading contribution (+23 points compounded over B4) without
the training-period compounding head start that dominates the ending-equity gaps.

## What would count as evidence from here

The only genuinely new evidence for any D1 configuration — B5, B4 or a training leader of this study — is market data
after 2026-10-13, run with frozen vectors and frozen rules. The holdout and final windows have been inspected repeatedly
across this research programme (B4/B5 above, and the control vectors that dominate this study's leaders were all
evaluated there before), so even a fresh pass over them would be additional, not independent, corroboration.
