# Source archives, reconstruction and the old selection's bias (training only)

**Evidence level: training only** (each window on its own training span), except the "later behaviour of discarded
groups" section, which is a retrospective fold-window result from the sealed analysis. Records:
`results/archive/INVENTORY.json`, `results/archive/<window>/RECONSTRUCTION.json` and `CENSUS.json` (fold-a also
`CENSUS-prefreeze-v1.json`), candidates in the git-ignored `candidates.jsonl.gz` (sha256 in the records). Source:
`research/d1-ranked-preemption/` (read-only; its sealed Stage A records and archives verify).

## 1. What the archives hold

| Window | Training span | Archive rows | Sobol per ETF | Local-search rows per ETF | Sealed library phenotypes | Profiles |
|---|---|---:|---:|---:|---:|---:|
| fold-a | 2016-01-04 → 2020-06-30 | 137,486 | 2,048 | 85–355 | 130 | 61 |
| fold-b | 2016-01-04 → 2021-12-31 | 138,915 | 2,048 | 84–373 | 142 | 61 |
| final | 2016-01-04 → 2023-12-29 | 140,137 | 2,048 | 87–355 | 156 | 61 |

Stored per row: grid, origin, trades, net, best trade, minute DD, J_s, credible, R1, R2. **Not stored:** the trade
ledger, interest, friction, daily DD, worst trade and trade signatures (signatures only for the 8 neighbourhood-checked
vectors per ETF). Every sealed file and archive hash verifies against the source's STAGE_A records. The source's 2,048
Sobol grids per ETF are **identical in all three windows for all 61 ETFs** (outcome-free grid comparison): the windows'
searches are paired, which is why later windows' archived nets would reveal earlier folds' evaluation results by
subtraction (PROTOCOL §0; not performed).

## 2. Reconstruction and the A0 reproduction (every row, to the cent)

Every archived row was re-evaluated through the source's own evaluator on its own training window (5 bps, 11%):

| Window | Rows re-evaluated | Fields compared | Mismatches | Loaded bars = source Stage A door | Credible | A0 reproduced (rep / library / checked set + J_nb / evaluated / credible) |
|---|---:|---|---:|---|---:|---|
| fold-a | 137,486 | trades, net, best, DD, J_s, credible, R1, R2, grid | **0** | yes (61/61) | 28,067 | 61 / 61 / 61 / 61 / 61 |
| fold-b | 138,915 | same | **0** | yes | 27,913 | 61 / 61 / 61 / 61 / 61 |
| final | 140,137 | same | **0** | yes | 25,122 | 61 / 61 / 61 / 61 / 61 |

The archived score is therefore exactly the full replay's liquidation-equivalent figure (not an approximation), and
the narrow procedure (A0) is a deterministic, reproducible function of the archive.

## 3. Universe, coverage and hindsight

61 eligible ETFs (the source audit; GDXJ and OIH late, XLRE excluded). Coverage/liquidity labels from the standalone
audit's census (2016–2023, descriptive only): minute coverage below 75% or median daily dollar volume below $50M for
**DBC** (0.82, $27M), **EDV** (0.47, $16M), **ILF** (0.93, $33M), **IYT** (0.62, $37M), **KIE** (0.84, $11M), **VOOG**
(0.41, $16M), **VPU** (0.58, $22M). The universe is conditioned on funds that exist today with complete 2016-onward
minute data; closures and earlier history are absent. Exposure clusters (15, predeclared by the audit) cover all 61.

## 4. Families and how narrow the old selection was (training only)

| | fold-a | fold-b |
|---|---:|---:|
| credible vectors (of which local search) | 28,067 (11,099) | 27,913 (11,558) |
| bounded-diameter families | 2,530 | 3,776 |
| median families per ETF | 40 | 59 |
| ETFs with ≥ 8 / 16 / 32 / 64 families | 53 / 48 / 36 / 11 | 53 / 50 / 48 / 28 |
| T-a: < 12 families (share of ETFs) | 18% | 15% |
| T-b: one family ≥ 50% of the J_s top 32 (share of ETFs) | **93%** | **89%** |
| families with any member in the J_s top 32 (the old consideration set) | 93 | 102 |
| sealed library families per ETF: median over the 57 ETFs with credible vectors (ETFs with exactly one) | 1 (34) | 2 (27) |

**The old procedure considered about 1.5 (fold-a) to 1.7 (fold-b) behaviours per ETF** (93 and 102 families over 61
ETFs). Its library rule (top 32 by J_s, Jaccard ≥ 0.5 on entry sessions, at most 4) worked inside a top 32 dominated
by one family of local-search clones (T-b: at least half of it in 93% / 89% of ETFs, all of it in 29 / 24 ETFs), so
many sealed libraries hold a single family (34 of 57 ETFs in fold-a, 27 of 57 in fold-b) even when four phenotypes
were saved.

## 5. Why candidates never reached the old library (discarded audit, training only)

| Reason (archive rows) | fold-a | fold-b |
|---|---:|---:|
| net ≤ 0 | 63,298 | 50,870 |
| profitable, enough trades, minute DD > $35,000 | 17,282 | 30,256 |
| profitable, DD ≤ $35,000, too few trades | 26,538 | 25,514 |
| both of the last two | 2,301 | 4,362 |
| credible but outside the J_s top 32 (**crowding**) | 26,243 rows in 2,437 families | 26,098 rows in 3,674 families |
| inside the top 32 but a near-duplicate (entry Jaccard < 0.5) | 1,682 | 1,659 |
| distinct but beyond the cap of 4 | 14 | 17 |
| **best-trade-penalty displaced** (top 4 families by J′ = net − DD excess, not top 4 by J_s) | **44 families in 33 ETFs** | **77 families in 40 ETFs** |
| the T-best family is the representative's family | 50 ETFs | 34 ETFs |

- **The best-trade deduction did displace right-tail profiles.** The displaced families' best-J′ members draw a median
  **74% (fold-a) / 82% (fold-b)** of their training net from a single trade, against **32% / 26%** for the sealed
  representatives. J_s rejected them for being concentrated, not for being unprofitable or risky: they pass the same
  $35,000 DD ceiling and trade floor.
- **Crowding was the larger effect:** the earlier v1 measure (a top-4-by-T family with no member in the J_s top 32)
  fired in 57 (fold-a) ETFs because nearly every credible family sits outside a top 32 filled with clones; v2 separates
  the best-trade term (J′) from crowding (finding 11 of the methodology review).
- Whether the displaced families did better in the next window is reported in §7.

## 6. The final window (census only; never evaluated)

Run last (after every evaluation, as the calendar door requires), on its own training span 2016-01-04 → 2023-12-29:
140,137 rows, 0 mismatches, A0 reproduced 61/61; 25,122 credible vectors (12,413 local search) in 4,159 families
(median 68 per ETF; ≥ 8 / 16 / 32 / 64 in 56 / 53 / 48 / 33 ETFs); T-a 10%, T-b **92%**; 23,271 credible rows (4,043
families) outside the J_s top 32; **60 J′-displaced families in 38 ETFs**, their best-J′ members drawing a median 65% of
net from one trade against 23% for the sealed representatives. The final window's narrowness and best-trade
displacement are the same as the folds'. These final-window vectors (the standalone audit's candidates) were never run
on any window here.

## 7. Later behaviour of the discarded groups (retrospective fold windows; descriptive; `results/tables/discarded-groups.md`)

Window increment V (5 bps, each vector alone in its $100,000 slot, continuous from 2016) of every vector in each group:

| Window | Sealed A0 library members (mean / median / V > 0) | J′-displaced families' best-J′ members | The wide A1(64) library's other families |
|---|---|---|---|
| fold A (2020-07 → 2021-12) | 128: $4,184 / $1,940 / 71 | 44: **$9,385 / $4,770 / 27** | 2,164: $3,973 / $0 / 952 |
| fold B (2022-01 → 2023-12) | 139: −$3,084 / $0 / 44 | 77: **−$11,803 / −$8,765 / 14** | 2,807: −$3,780 / −$769 / 871 |

**The right-tail families the best-trade deduction removed did better than the sealed library in the 2020–21 rebound
and much worse in the 2022–23 bear market** (only 14 of 77 positive). They are concentrated bets on large rebounds; the
deduction did not discard a reliably better group, and the pattern is consistent with a more regime-dependent one (two
correlated regimes cannot establish that). The families outside the
old library behave on average like the library itself.

## 8. Restrictions inherited and respected

- Archived fold-a vectors are evaluated only through 2021-12-31, fold-b vectors only through 2023-12-29; final-window
  vectors are never evaluated; doors apply per provenance row; no figure is attributed across provenances.
- The source's 15 diverse-d1 finalists, the prospective B4/B5 freeze and every earlier study are untouched.
- The archive is a biased sample (its refinement concentrated on the old J_s optimum) and is never called unbiased.
