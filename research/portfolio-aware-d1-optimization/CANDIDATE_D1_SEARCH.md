# Candidate D1 search: the common pool on all seven ETFs, both tracks (Stage A)

`npm run portfolio-aware-d1 -- stage-a` (training only, after parity passed). Records: `results/stageA/pool.json`
(the design), `results/stageA/evaluations/<ETF>.jsonl` (every vector × cost, both modes), `results/stageA/run.json`,
`results/stageA/finalists.json`; tables `results/tables/stageA.md`. Deeper search and selection:
[PORTFOLIO_AWARE_OPTIMIZATION.md](PORTFOLIO_AWARE_OPTIMIZATION.md).

## 1. What was evaluated

- **Space:** D1's eight parameters inside the eight-ETF box — X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30
  days, L 20–250 sessions, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200 sessions (percentages to 0.1 point).
- **Common pool:** 512 unique quantized vectors from one scrambled Sobol stream (seed
  `[3958730257, 953049871, 361004370, 3789834329]` = `deriveSeed('portfolio-aware-d1','common-pool','sobol-scramble')`;
  512 drawn, 0 duplicates), **the same 512 on every ETF and for both tracks**, plus 7 controls (D1's constants; the
  frozen XBI/XRT/KRE `primary` and `lowDd` vectors) and, for XLE, the eight-ETF program's two frozen XLE vectors:
  519 vectors per ETF (521 for XLE), **3,635 vector–ETF pairs × 4 costs = 14,540 evaluations**, each one trace, one
  standalone replay and one pool replay (29,084 replays) in 319 s (≈ 22 ms per evaluation). Nothing was reduced.
- **Two scores of the same trace:** Track S = the book alone in a fixed $100,000 pool (net after interest and costs,
  minute DD, trades); Track P = Δ = net(S0 + book) − net(S0) from the complete chronological replay, with the exact
  decomposition into the book's funded net, baseline lots gained and S0 lots displaced (checked to 1e-6 on every one
  of the 14,540 evaluations).

S0 on training: $249,174 / $246,625 / **$242,196** / $233,867 at 0 / 2 / **5** / 10 bps (71 lots; minute DD $27,968 /
$28,245 / **$28,659** / $29,350).

## 2. Results by ETF (5 bps)

| ETF | Vectors | Track S feasible | Track P feasible | P-feasible with Δ > 0 | Median Δ (P-feasible) | Best standalone net (S-feasible) | Best Δ (P-feasible) | Spearman (standalone net, Δ), all |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| GDX | 519 | 10 | 216 | **45** | −$35,517 | $112,400 | **+$94,378** | 0.55 |
| XOP | 519 | **0** | 22 | **10** | −$1,085 | — | **+$57,943** | 0.32 |
| EWZ | 519 | 8 | 89 | 4 | −$39,855 | $67,883 | +$16,169 | 0.39 |
| TLT | 519 | 64 | 145 | **0** | −$50,255 | $22,476 | −$10,393 | 0.68 |
| XLE | 521 | 2 | 54 | **12** | −$15,170 | $152,038 | **+$62,732** | 0.19 |
| XLU | 519 | 84 | 130 | 1 | −$44,550 | $41,512 | +$7,108 | 0.51 |
| GLD | 519 | 76 | 79 | 3 | −$36,824 | $26,681 | +$2,499 | −0.00 |

(Track S feasible: standalone minute DD ≤ $35,000, ≥ 8 closed trades in ≥ 3 years. Track P feasible: pool minute DD ≤
$35,000, ≥ 5 funded lots of the book in ≥ 3 years.)

Read across the table:

- **The typical candidate book hurts the pool.** The median Δ of P-feasible vectors is negative on every ETF
  (−$1k XOP to −$50k TLT): a randomly parameterized D1 book on these ETFs usually displaces more than it adds.
- **Standalone quality is a weak guide to pool value.** Over all vectors the rank correlation between standalone net
  and Δ ranges from 0.68 (TLT, where both are poor) to −0.00 (GLD); among standalone-feasible vectors it is near zero
  for EWZ (0.07), TLT (−0.02), XLU (0.17), GLD (−0.08). The single best standalone vector anywhere — the eight-ETF XLE
  `primary` ($152,038 standalone, minute DD $25,057, 23 trades) — is funded **once** in the pool (Δ +$21,604 from that
  one lot, not P-feasible); exactly the earlier study's observation that standalone optimization concentrates on the
  crisis dips when the pool is full.
- **XOP has no standalone-feasible vector at all**: every XOP vector's own minute drawdown exceeds $35,000 (March
  2020: XOP fell 74% below its reference high). Yet ten XOP vectors improve the pool with a pool drawdown inside the
  ceiling — the pool, not the book alone, carries the risk that matters.
- **TLT: zero positive vectors; XLU: one; GLD: three, the best +$2,499.** These ETFs dip rarely, and mostly in the
  same crises; their pool vectors lose.
- **Several GDX vectors lower the pool's drawdown** (pool minute DD $26,510 against S0's $28,659): a GDX lot holding the
  pool in March 2020 refuses S0 lots that lost money then. That is a real path effect but it concentrates in one
  episode — the robustness rules (R2 folds, R3 without the best regime, R4 plateau) test exactly that.

The controls at 5 bps (standalone net / minute DD / trades — Δ / book lots / displaced S0 lots), selected:

| ETF | Control | Standalone | Pool |
|---|---|---|---|
| GDX | D1 constants | $86,243 / $48,960 / 36 | +$3,992 / 25 / 21 |
| GDX | XBI lowDd vector | $46,039 / $17,463 / 10 | +$30,653 / 3 / 2 |
| XOP | D1 constants | $69,731 / $145,683 / 78 | +$48,199 / 54 / 19 |
| EWZ | D1 constants | −$14,137 / $60,866 / 41 | −$107,571 / 28 / 26 |
| TLT | D1 constants | $14,268 / $13,953 / 5 | −$16,748 / 3 / 16 |
| XLE | D1 constants | $30,391 / $72,753 / 32 | −$42,190 / 13 / 11 |
| XLE | eight-ETF primary (in-sample) | $152,038 / $25,057 / 23 | +$21,604 / 1 / 2 |
| XLE | eight-ETF lowDd (in-sample) | $118,169 / $22,528 / 25 | +$10,807 / 1 / 1 |
| XLU | D1 constants | $23,012 / $18,801 / 7 | −$31,591 / 4 / 5 |
| GLD | D1 constants | no trade | — |

The full control table, and the top five vectors of each track on each ETF (with Δ at all four costs, pool DD, lots
and displacement), are in `results/tables/stageA.md`.

## 3. The finalist rule (PROTOCOL.md §4.7), applied mechanically

| ETF | Eligible (≥ 3 P-feasible, Δ > 0) | P-potential (median Δ@5 of top 10) | Breadth (regimes Δ > 0) | Cost (median Δ@10) | Standalone (median net@5, top 10 S) | Rank scores P / B / C / S | Composite |
|---|---|---:|---:|---:|---:|---|---:|
| GDX | yes (45) | +$57,774 | 5.5 | +$57,742 | $67,089 | 1.00 / 1.00 / 1.00 / 0.75 | **0.950** |
| XOP | yes (10) | +$16,339 | 4.5 | +$15,454 | none feasible | 0.75 / 0.75 / 0.75 / 0.00 | **0.600** |
| XLE | yes (12) | +$9,275 | 4.0 | +$8,184 | $135,104 | 0.50 / 0.25 / 0.50 / 1.00 | **0.550** |
| EWZ | yes (4) | −$1,153 | 4.5 | −$1,504 | $45,139 | 0.25 / 0.75 / 0.25 / 0.50 | 0.400 |
| GLD | yes (3) | −$2,097 | 3.0 | −$13,421 | $19,787 | 0.00 / 0.00 / 0.00 / 0.25 | 0.050 |
| TLT | no (0) | | | | | | |
| XLU | no (1) | | | | | | |

Order GDX > XOP > XLE > EWZ > GLD; no priority swap applied (no two adjacent composites within 0.05 with the lower
one of higher priority — XOP/XLE differ by exactly 0.05 and XOP already ranks first). **Finalists: GDX, XOP, XLE.**
GDX and XOP, the brief's priority candidates, qualified on the evidence, not by priority. Excluded early: TLT and XLU
(not eligible); EWZ and GLD were eligible but ranked fourth and fifth. No candidate was excluded for data reasons.
