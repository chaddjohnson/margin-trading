# Matched total-portfolio comparison (brief Phase 5; PROTOCOL §15) — report-only

**Answer.** Under the identical 60 % VOOG / 40 % VGT core (illustrative $500,000 initial core equity, quarterly rebalancing,
distributions reinvested, a $100,000 maximum margin-funded overlay, the engine's 11 % interest charged once), **switching
the overlay from N/original to any GDX-only finalist does not reduce the total account's drawdown or margin risk. Every
GDX-only scenario has a slightly LARGER maximum marked drawdown than core + N/original (+$3,025 to +$27,954, i.e. +0.5 % to
+4.6 % relative over 2016–2026; +1.2 % to +5.3 % over 2016–2024) and a lower terminal wealth (−$124,242 to −$443,452).** By
the precommitted rule (§15.8: ≥ $5,000 AND ≥ 10 % in both the full and the development period) every scenario is labelled
**"no material difference"** in drawdown; none earns a "material reduction". Retrospective, previously examined history
(2016-01-04 → 2026-10-30); the $500,000 is an illustrative normalization, not the user's balance; the margin requirements
are illustrative, not Vanguard's.

## The account, in one paragraph

Every scenario holds the same core (bought at the 2016-01-04 close, 5 bps per side, rebalanced to 60 / 40 at each quarter's
last close, distributions entitled at the close before the ex-date and reinvested at the pay-date close, split-adjusted
share units). The overlay is the frozen configuration's own continuous engine run: its marked net (costs and 11 % interest
inside, so interest is charged exactly once), its open lot's market value and its margin debt (principal + accrued interest)
at every close. Realized overlay P&L sits in cash at 0 %; a negative cash balance (cumulative realized overlay losses) is margin debt
charged 11 % simple, booked quarterly. Account equity = core + receivables + cash + the overlay's marked open value; every
overlay's replay equals its sealed GPU figures to the cent (section C). Hence incremental terminal wealth vs core only =
the overlay's full net − the interest on negative overlay cash. That interest is $0 for N/original, New L0 and every
D, G, C, S and informed primary. It is non-zero for the ablation (−$1,017.36: its early-2017 losses were financed) and
three J configurations (−$44.21, −$173.31 and −$1,750.11), and at most −$2,932.99 in any leverage or variant.

## Why a less-correlated overlay does not lower the total drawdown

- **The overlay is small against the core.** The slot holds at most $100,000 while the core grows from $500,000 to $3.39 M;
  the total account's worst episode is the core's (2021-12-27 → 2022-10-14, −$631,158 core only). What matters is the
  overlay's P&L *inside* that episode, not its average correlation.
- **Inside the core's worst episode N/original's overlay earned +$22,821; the GDX-only overlays earned −$9,182 (J primary)
  to +$15,747 (C+ primary)** (section H). N/original's VGT books mostly stood aside in the 2022 technology decline (trailing
  stops, decline gates) while its GDX D1 book traded. So core + N/original's 2022 drawdown ($608,337) is smaller than every
  GDX-only scenario's ($615,412–$640,341), and its own maximum moves to the 2025-Q1 episode ($612,387, 21.1 %).
- **Correlation is lower for GDX-only** (overlay vs core daily P&L: −0.09 to 0.19 vs 0.41 for N/original; beta −0.003 to 0.013
  vs 0.029; technology share of gross long value 38.7–40.2 % on average vs 42.7 %, maximum 42.2–43.5 % vs 51.7 %). **But N/original
  adds its VGT exposure mostly near the core's highs**: on the 1,272 sessions it held a VGT lot the core's own drawdown
  averaged $58,335, against $235,445 on its GDX-lot sessions (section J). Its added technology exposure did not coincide
  with the core's deep drawdowns in this history. GDX is not treated as a hedge here: its overlay lots lost in the 2026-Q2
  divergence (VGT +37 %, GDX −18 %: −$13,074 to −$17,100 for the D1-bearing GDX primaries) while N/original's made +$17,128.
- **Relative to core only**, the D-, S- and C+-primary overlays lowered the 2022 drawdown by $13,664–$15,747 (2.2–2.5 %),
  the G primary by $0 (flat in 2022), and the J primary and the ablation **raised** it (+$9,183 and +$4,354).

## Margin and leverage

Maximum margin debt is $100,151–$110,000 in every GDX-only scenario against $110,789 for N/original; maximum loan-to-value
10.8–18.0 % against 16.4 % ($500,000 core). The minimum headroom (equity − m × gross long value) occurs in early 2016, when
the account is smallest: $292,459–$314,290 at m = 30 % for GDX-only against $314,290 for N/original. The G-, C- and S-primary
overlays have the LOWEST minimum headroom ($292,459–$296,371; concentrated variant $292,869–$295,654 vs N/original's
$332,926) because their large 2016 Growth lots coincide with the smallest account. **No margin-risk reduction.** At the
$250,000 core (overlay = 40 % of the initial core) maximum LTV is 18.8–30.4 % (N/original 28.2 %); two GDX-only
primaries show a $4,952 smaller maximum DD than N/original there (D and C+: 1.6 %), below the $5,000 / 10 % threshold. At
$1,000,000 every GDX-only drawdown is higher. **Hypothetical** instantaneous shocks (section L; not historical
observations) show the mechanism, not a probability: at each scenario's maximum-overlay close a technology decline costs
N/original 23.9 % of equity and the D primary 23.2 %; a gold-miner selloff costs N/original 0 % (it held VGT then) and the
D primary 6.3 %. Headroom after the combined shock stays positive at m = 40 % in every scenario (minimum $163,202); no margin call or
safety is claimed for a real account.

## Trading sleeve, normalized

N/original's overlay earned **$482,701** (development $388,031, validation $94,670) with the slot occupied 62.6 % of
sessions. The best GDX-only overlay earned $358,459 (S primary; it fails V2/V3) and the development-only primaries $171,751
(G) and $278,245 (C). **Per borrowing-dollar-day** several GDX-only overlays earned more than N/original (G $0.0055, C
$0.0033, D $0.0025 vs $0.0020; J $0.0019 less) because they hold the slot far less (occupancy 0.3–43 %; the primaries 9.5–43 %); an idle slot earns
nothing here (cash at 0 %), so the absolute shortfall is real, not an artefact of notional. Overlay distributions (report-only,
§15.7, never added to the trading results): N/original's lots would have received $8,364, the GDX-only lots $0–$4,562.

## Regimes

GDX-only was **better** than N/original in 2016 (the gold-miner rally: the Growth-bearing primaries +$75,064–$81,087 vs
+$8,588), inside the 2020 crash (the D, C, S and C+ primaries +$55,421–$59,230 vs +$42,915), 2018-Q4 (D primary +$15,853 vs +$10,059)
and the 2025 spring sell-off (2025-01-23 → 2025-04-08: the D, G and C primaries flat vs −$4,952). It was **worse** in the core's deepest episode (2022), in 2017, 2021, 2023–2024 (from 2019 on
N/original's increment is $29–49k in every year but 2020's $138,876), in 2026 (the D, J, S and C+ primaries −$15,255 to
−$26,613) and in the 2026-Q2
divergence. Under the profits-swept-into-the-core sensitivity the S primary's terminal wealth exceeds N/original's by $54,522
(its 2016 Growth profit compounds inside the core) while its drawdown is $26,504 larger — a timing effect of one early
episode, not a risk reduction.

## Data

VOOG / VGT: canonical Alpaca SIP minute files (2,723 sessions each), the central 2026-04-21 splits (VOOG 6:1, VGT 8:1) and
the central distribution ledger, every one of its 86 VOOG / VGT distributions matched to an independent Yahoo event (median
difference 0.50 %, maximum 8.54 %); the three VOOG 2016 amounts the ledger marks "estimated" were replaced by the observed
amounts (PROTOCOL §15.3). Nothing was invented and no comparison is blocked. **Correction disclosed** (DECISION_REGISTER R3):
Yahoo's chart API states every historical amount per *current* share; the first run compared and substituted the unconverted
amounts (6× too small for the three VOOG 2016 replacements). The stage was rerun after the conversion; only the identical
core and the report-only overlay distribution table changed.

Sections A–N below carry every figure; daily series per scenario are in `reports/portfolio/series/`.

---

_Sections A–N below are generated by `tools/gdx-d1-growth/portfolio-md.py` from `reports/portfolio/portfolio.json` (report-only; no evaluation)._

## A. Inputs, conventions and the matched account

Label: **retrospective, previously examined history (2016–2026); illustrative normalization ($500,000 initial core equity), NOT the user’s balance; margin requirements illustrative, not Vanguard’s**.

| Item | Value |
|---|---|
| core | 60 % VOOG / 40 % VGT at the 2016-01-04 close; 5 bps per side; quarterly rebalance at the last close of each calendar quarter (primary); distributions entitled at the close before the ex-date, receivable from the ex-date, reinvested in the paying fund at the pay-date close; prices in 2016-01-04 share units (central split ledger) |
| overlay | the engine’s marked net (costs and 11 % interest inside, charged once); open lot value and outstanding principal + accrued interest from the same continuous run |
| cash | realized overlay P&L; 0 % on positive cash; 11 % simple per calendar day on negative cash (booked quarterly) |
| leverage | $250,000 initial core, $100,000 maximum overlay position; $500,000 initial core, $100,000 maximum overlay position; $1,000,000 initial core, $100,000 maximum overlay position |
| core data VOOG | `data/VOOG/data.csv` sha256 `1699c89f83fe44c1ea4e3f3a51ee62c78d9e0567be5b731009c1f47352c55732` (2,723 sessions) |
| core data VGT | `data/VGT/data.csv` sha256 `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` (2,723 sessions) |
| distribution ledger | `config/market-events/distributions.csv` sha256 `30feaa99e47404696e162e25df72833de49cedb28481ff059750e024c50e41a6` |
| independent distributions VOOG | `research/gdx-d1-growth/cache/independent/yahoo-VOOG-dividends-2016-2026.json` sha256 `0442eccc28b213f5c9a4df1e35fdfb6bf88fe3e4bd51da8adeafac93c8624038` (git-ignored; Yahoo chart API, fetched 2026-11-27 after the sealed outcome) |
| independent distributions VGT | `research/gdx-d1-growth/cache/independent/yahoo-VGT-dividends-2016-2026.json` sha256 `6a0405e9f09e726ca3382618260ba08b808105e45207f7e96700f9eac63c569d` (git-ignored; Yahoo chart API, fetched 2026-11-27 after the sealed outcome) |
| independent distributions GDX | `research/gdx-d1-growth/cache/independent/yahoo-GDX-dividends-2016-2026.json` sha256 `6c39d2172a515d27764c4bb0f7a44ecf326475e68d655a89252231fa14080e5d` (git-ignored; Yahoo chart API, fetched 2026-11-27 after the sealed outcome) |
| validation | `research/gdx-d1-growth/results/validation/validation.json` sha256 `8e20fa93472ef60b306267b470977c41f1485409fdeeda1fc3b8fed27cd0865e` |
| outcome | `research/gdx-d1-growth/results/outcome.json` sha256 `647afac401db031af768ced69f8ef24b783db6b725d1aba9894af532da7ae929` |
| frozenSelection | `research/gdx-d1-growth/FROZEN_SELECTION.json` sha256 `984dd972456d57620e81c4b3a59190cb0014bfb502b949260b00fb6331a1fe0e` |
| written | 2026-11-27T07:14:34.932Z |

## B. Core distributions: the ledger checked against the independent series

86 VOOG / VGT ledger distributions 2016-01-04 → 2026-10-30; every one has an independent event within ±10 days (missing: 0). The Yahoo amounts are stated per current share (after the 2026-04-21 splits) and are converted back to the ex-date share basis before any comparison or use. Non-estimated ledger amounts vs independent: median |difference| 0.50 %, maximum 8.54 %. The ledger amounts are used unchanged (identical in every scenario).

| Largest differences | Ledger | Independent (ex-date shares) | Difference |
|---|---:|---:|---:|
| VOOG 2017-03-22 (derived) | 0.2963 | 0.3240 | −8.54 % |
| VOOG 2018-06-28 (derived) | 0.3893 | 0.4110 | −5.28 % |
| VGT 2018-06-28 (derived) | 0.5061 | 0.4880 | +3.70 % |
| VGT 2017-06-28 (derived) | 0.4186 | 0.4060 | +3.11 % |
| VGT 2017-09-27 (derived) | 0.4308 | 0.4190 | +2.83 % |

The three VOOG 2016 amounts the ledger marks "estimated" are replaced by the independently observed amounts (PROTOCOL §15.3):

| Ex-date | Ledger estimate | Independent (Yahoo, per current share) | Used (ex-date shares) |
|---|---:|---:|---:|
| VOOG 2016-03-21 | 0.2600 | 0.058667 | 0.3520 |
| VOOG 2016-06-21 | 0.3932 | 0.056500 | 0.3390 |
| VOOG 2016-09-20 | 0.4090 | 0.068833 | 0.4130 |

Unverified amounts: none (no bound needed).

## C. Overlay reconciliation (CPU reference replay = the sealed figures, to the cent)

| Overlay | Replay net | Replay DD | Sealed net | Sealed DD | Equal |
|---|---:|---:|---:|---:|:---:|
| `N/original (VGT D1 + GDX D1 + VGT Growth)` | 482,700.73 | 20,385.99 | 482,700.73 | 20,385.99 | ✓ |
| `New L0` | 479,605.18 | 20,385.99 | 479,605.18 | 20,385.99 | ✓ |
| `control: N/original GDX D1 (ablation)` | 189,573.30 | 27,053.38 | 189,573.30 | 27,053.38 | ✓ |
| `C24/D/refine/D.D1/R103#1 profit` | 255,524.87 | 30,362.06 | 255,524.87 | 30,362.06 | ✓ |
| `C24/D/refine/D.B1/R106#2 robust` | 172,789.84 | 27,397.97 | 172,789.84 | 27,397.97 | ✓ |
| `C24/D/broad/D.B0/R101#3 balanced` | 124,425.97 | 17,280.74 | 124,425.97 | 17,280.74 | ✓ |
| `C24/G/refine/G.h1.s1/R105#1 profit` | 171,750.86 | 17,744.39 | 171,750.86 | 17,744.39 | ✓ |
| `C24/G/refine/G.h2.s1/R105#2 robust` | 135,665.35 | 18,070.66 | 135,665.35 | 18,070.66 | ✓ |
| `C24/G/refine/G.h1.s1/R101#2 robust` | 102,166.71 | 17,744.39 | 102,166.71 | 17,744.39 | ✓ |
| `C24/G/refine/G.h0.s0/R101#3 balanced` | 39,248.35 | 10,800.57 | 39,248.35 | 10,800.57 | ✓ |
| `C24/C/pair DF2×GF1` | 278,245.43 | 27,397.97 | 278,245.43 | 27,397.97 | ✓ |
| `C24/C/pair DF2×GF2` | 190,721.39 | 27,397.97 | 190,721.39 | 27,397.97 | ✓ |
| `C24/C/pair DF2×GF3` | 182,450.58 | 27,397.97 | 182,450.58 | 27,397.97 | ✓ |
| `C24/J/refine/J.B1.h0.s0/R102#1 profit` | 238,487.94 | 60,065.70 | 238,487.94 | 60,065.70 | ✓ |
| `C24/J/refine/J.B1.h0.s0/R104#2 robust` | 217,045.97 | 50,640.70 | 217,045.97 | 50,640.70 | ✓ |
| `C24/J/refine/J.A1.h2.s1/R104#2 robust` | 228,064.65 | 42,847.71 | 228,064.65 | 42,847.71 | ✓ |
| `C24/J/broad/J.A0.h1.s0/R104#2 robust` | 100,182.72 | 17,280.74 | 100,182.72 | 17,280.74 | ✓ |
| `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | 358,458.94 | 59,791.70 | 358,458.94 | 59,791.70 | ✓ |
| `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` | 295,175.04 | 42,043.72 | 295,175.04 | 42,043.72 | ✓ |
| `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` | 250,755.65 | 27,397.97 | 250,755.65 | 27,397.97 | ✓ |
| `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` | 209,227.56 | 51,985.85 | 209,227.56 | 51,985.85 | ✓ |
| `C24/G/informed/G.h1.s1/R101#1 profit` | 178,522.74 | 16,154.78 | 178,522.74 | 16,154.78 | ✓ |
| `C24/G/informed/G.h2.s1/R105#1 profit` | 140,412.36 | 25,424.65 | 140,412.36 | 25,424.65 | ✓ |
| `C24/C+/pair D+F1×G+F2` | 282,007.58 | 30,362.06 | 282,007.58 | 30,362.06 | ✓ |
| `C24/C+/pair D+F2×G+F2` | 202,959.79 | 27,397.97 | 202,959.79 | 27,397.97 | ✓ |
| `C24/C+/pair D+F2×G+F1` | 201,841.79 | 27,397.97 | 201,841.79 | 27,397.97 | ✓ |

N/original and New L0 are replayed on their own VGT/GDX door against their sealed FULL figures; every GDX-only overlay against its sealed GPU validation record (whole-run net and DD).

## D. The matched comparison — $500,000 initial core, $100,000 maximum overlay, quarterly rebalance (primary)

| Scenario | Terminal wealth | Incremental vs core | Δ terminal vs N/original | Max marked DD | % of peak | Peak → trough → recovery (sessions) | Δ DD vs N/original | Dev max DD | Val max DD | Max debt | Max LTV | Min headroom 30 % | Min headroom concentrated | Interest on negative overlay cash |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 core only: `60 % VOOG / 40 % VGT core only` | $3,389,172 | $0 | −$482,701 | $631,158 | 33.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$18,771 | $631,158 | $607,435 | $0 | 0.0 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $3,871,873 | $482,701 | — | $612,387 | 21.1 % | 2025-01-23 → 2025-04-08 → 2025-06-10 (52) | — | $608,337 | $612,387 | $110,789 | 16.4 % | $314,290 (2016-02-11) | $332,926 (2016-07-05) | $0 |
| S2 New L0: `New L0` | $3,868,778 | $479,605 | −$3,096 | $612,193 | 21.1 % | 2025-01-23 → 2025-04-08 → 2025-06-10 (52) | −$194 | $607,216 | $612,193 | $110,789 | 16.4 % | $314,290 (2016-02-11) | $332,926 (2016-07-05) | $0 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $3,577,728 | $188,556 | −$294,145 | $635,512 | 32.5 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | +$23,125 | $635,512 | $607,435 | $109,893 | 16.5 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$1,017 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $3,644,697 | $255,525 | −$227,176 | $617,494 | 30.1 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | +$5,107 | $617,494 | $607,435 | $103,225 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | $3,561,962 | $172,790 | −$309,911 | $624,243 | 31.5 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$11,856 | $624,243 | $607,435 | $101,778 | 15.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | $3,513,598 | $124,426 | −$358,275 | $633,065 | 31.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$20,678 | $633,065 | $607,435 | $100,844 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $3,560,923 | $171,751 | −$310,950 | $631,158 | 31.0 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$18,771 | $631,158 | $607,435 | $100,452 | 18.0 % | $292,459 (2016-02-08) | $292,869 (2016-02-08) | $0 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | $3,524,838 | $135,665 | −$347,035 | $628,235 | 31.8 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$15,848 | $628,235 | $607,435 | $101,838 | 11.6 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | $3,491,339 | $102,167 | −$380,534 | $634,390 | 32.1 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$22,003 | $634,390 | $607,435 | $100,542 | 11.6 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | $3,428,421 | $39,248 | −$443,452 | $623,748 | 32.7 % | 2021-12-27 → 2022-10-14 → 2024-01-22 (202) | +$11,361 | $623,748 | $607,435 | $100,151 | 10.8 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $3,667,418 | $278,245 | −$204,455 | $624,243 | 30.0 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$11,856 | $624,243 | $607,435 | $101,778 | 18.0 % | $292,459 (2016-02-08) | $292,869 (2016-02-08) | $0 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | $3,579,894 | $190,721 | −$291,979 | $621,320 | 31.2 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | +$8,933 | $621,320 | $607,435 | $101,838 | 15.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | $3,571,623 | $182,451 | −$300,250 | $627,475 | 31.5 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$15,088 | $627,475 | $607,435 | $101,778 | 15.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $3,627,616 | $238,444 | −$244,257 | $640,341 | 31.6 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | +$27,954 | $640,341 | $617,724 | $107,384 | 16.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$44 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | $3,606,045 | $216,873 | −$265,828 | $637,705 | 31.9 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$25,318 | $637,705 | $617,724 | $110,000 | 16.3 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$173 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | $3,617,237 | $228,065 | −$254,636 | $624,347 | 31.4 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$11,960 | $624,347 | $604,957 | $101,778 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | $3,487,605 | $98,433 | −$384,268 | $632,080 | 32.2 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$19,693 | $632,080 | $607,435 | $107,958 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$1,750 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $3,747,631 | $358,459 | −$124,242 | $617,494 | 29.2 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | +$5,107 | $617,494 | $617,105 | $107,414 | 17.8 % | $292,863 (2016-02-09) | $293,029 (2016-02-09) | $0 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | $3,684,348 | $295,175 | −$187,526 | $624,243 | 30.4 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$11,856 | $624,243 | $607,435 | $104,400 | 17.8 % | $292,863 (2016-02-09) | $293,029 (2016-02-09) | $0 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | $3,639,928 | $250,756 | −$231,945 | $624,243 | 30.8 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$11,856 | $624,243 | $617,105 | $101,868 | 17.7 % | $296,371 (2016-02-08) | $295,654 (2016-02-08) | $0 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | $3,598,400 | $209,228 | −$273,473 | $624,243 | 31.4 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$11,856 | $624,243 | $617,724 | $107,384 | 15.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $3,567,695 | $178,523 | −$304,178 | $630,271 | 32.0 % | 2021-12-27 → 2022-10-14 → 2023-12-27 (202) | +$17,884 | $630,271 | $607,435 | $101,929 | 10.8 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | $3,529,585 | $140,412 | −$342,288 | $629,075 | 31.9 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | +$16,688 | $629,075 | $607,435 | $101,477 | 11.6 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $3,671,180 | $282,008 | −$200,693 | $615,412 | 30.0 % | 2021-12-27 → 2022-10-14 → 2023-12-18 (202) | +$3,025 | $615,412 | $607,435 | $103,225 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | $3,592,132 | $202,960 | −$279,741 | $622,250 | 31.3 % | 2021-12-27 → 2022-10-14 → 2023-12-26 (202) | +$9,863 | $622,250 | $607,435 | $101,778 | 15.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | $3,591,014 | $201,842 | −$280,859 | $623,356 | 31.4 % | 2021-12-27 → 2022-10-14 → 2023-12-19 (202) | +$10,969 | $623,356 | $607,435 | $101,929 | 15.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |

"Max marked DD" is the total account's largest peak-to-trough decline of session-close equity over 2016-01-04 → 2026-10-30 (dollars; % of its running peak); "dev" = 2016-01-04 → 2024-12-31, "val" = 2025-01-02 → 2026-10-30 (each window's own running peak). Duplicated overlays (an informed population sharing an independent finalist) are listed once; the duplicate keys are named in §K. Headroom = equity − m × gross long value (illustrative).

## E. Precommitted decision labels (PROTOCOL §15.8; report labels only)

| Scenario | Δ terminal (full) | Δ max DD full | relative | Δ max DD development | relative | Δ max DD validation | Label |
|---|---:|---:|---:|---:|---:|---:|---|
| S3 ablation: `control: N/original GDX D1 (ablation)` | −$294,145 | +$23,125 | +3.8 % | +$27,175 | +4.5 % | −$4,952 | no material difference |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | −$227,176 | +$5,107 | +0.8 % | +$9,158 | +1.5 % | −$4,952 | no material difference |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | −$309,911 | +$11,856 | +1.9 % | +$15,907 | +2.6 % | −$4,952 | no material difference |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | −$358,275 | +$20,678 | +3.4 % | +$24,728 | +4.1 % | −$4,952 | no material difference |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | −$310,950 | +$18,771 | +3.1 % | +$22,821 | +3.8 % | −$4,952 | no material difference |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | −$347,035 | +$15,848 | +2.6 % | +$19,898 | +3.3 % | −$4,952 | no material difference |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | −$380,534 | +$22,003 | +3.6 % | +$26,053 | +4.3 % | −$4,952 | no material difference |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | −$443,452 | +$11,361 | +1.9 % | +$15,411 | +2.5 % | −$4,952 | no material difference |
| S11 C: `C24/C/pair DF2×GF1` (primary) | −$204,455 | +$11,856 | +1.9 % | +$15,907 | +2.6 % | −$4,952 | no material difference |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | −$291,979 | +$8,933 | +1.5 % | +$12,983 | +2.1 % | −$4,952 | no material difference |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | −$300,250 | +$15,088 | +2.5 % | +$19,139 | +3.1 % | −$4,952 | no material difference |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | −$244,257 | +$27,954 | +4.6 % | +$32,004 | +5.3 % | +$5,337 | no material difference |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | −$265,828 | +$25,318 | +4.1 % | +$29,368 | +4.8 % | +$5,337 | no material difference |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | −$254,636 | +$11,960 | +1.9 % | +$16,010 | +2.6 % | −$7,430 | no material difference |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | −$384,268 | +$19,693 | +3.2 % | +$23,744 | +3.9 % | −$4,952 | no material difference |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | −$124,242 | +$5,107 | +0.8 % | +$9,158 | +1.5 % | +$4,718 | no material difference |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | −$187,526 | +$11,856 | +1.9 % | +$15,907 | +2.6 % | −$4,952 | no material difference |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | −$231,945 | +$11,856 | +1.9 % | +$15,907 | +2.6 % | +$4,718 | no material difference |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | −$273,473 | +$11,856 | +1.9 % | +$15,907 | +2.6 % | +$5,337 | no material difference |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4 | −$227,176 | +$5,107 | +0.8 % | +$9,158 | +1.5 % | −$4,952 | no material difference |
| S23 D+: `C24/D/refine/D.B1/R106#2 robust` (D+/robust-profit; D+/balanced) = S5 | −$309,911 | +$11,856 | +1.9 % | +$15,907 | +2.6 % | −$4,952 | no material difference |
| S24 D+: `C24/D/broad/D.B0/R101#3 balanced` (D+/lower-drawdown) = S6 | −$358,275 | +$20,678 | +3.4 % | +$24,728 | +4.1 % | −$4,952 | no material difference |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | −$304,178 | +$17,884 | +2.9 % | +$21,934 | +3.6 % | −$4,952 | no material difference |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | −$342,288 | +$16,688 | +2.7 % | +$20,739 | +3.4 % | −$4,952 | no material difference |
| S27 G+: `C24/G/refine/G.h1.s1/R101#2 robust` (G+/balanced) = S9 | −$380,534 | +$22,003 | +3.6 % | +$26,053 | +4.3 % | −$4,952 | no material difference |
| S28 G+: `C24/G/refine/G.h0.s0/R101#3 balanced` (G+/lower-drawdown) = S10 | −$443,452 | +$11,361 | +1.9 % | +$15,411 | +2.5 % | −$4,952 | no material difference |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | −$200,693 | +$3,025 | +0.5 % | +$7,075 | +1.2 % | −$4,952 | no material difference |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | −$279,741 | +$9,863 | +1.6 % | +$13,913 | +2.3 % | −$4,952 | no material difference |
| S31 C+: `C24/C/pair DF2×GF3` (C+/balanced) = S13 | −$300,250 | +$15,088 | +2.5 % | +$19,139 | +3.1 % | −$4,952 | no material difference |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | −$280,859 | +$10,969 | +1.8 % | +$15,019 | +2.5 % | −$4,952 | no material difference |

Rule: PROTOCOL §15.8: ≥ $5,000 AND ≥ 10 % relative in BOTH the full and the development period (report label only). Δ = scenario − N/original: a positive Δ DD is a LARGER total-account drawdown than N/original's.

## F1. Leverage sensitivity — $250,000 initial core (overlay fixed at $100,000 = 40 % of the initial core)

| Scenario | Terminal wealth | Incremental vs core | Δ terminal vs N/original | Max marked DD | % of peak | Peak → trough → recovery (sessions) | Δ DD vs N/original | Dev max DD | Val max DD | Max debt | Max LTV | Min headroom 30 % | Min headroom concentrated | Interest on negative overlay cash |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 core only: `60 % VOOG / 40 % VGT core only` | $1,694,586 | $0 | −$482,701 | $315,579 | 33.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$6,909 | $315,579 | $303,717 | $0 | 0.0 % | $157,145 (2016-02-11) | $168,370 (2016-02-11) | $0 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $2,177,287 | $482,701 | — | $308,670 | 18.8 % | 2025-01-23 → 2025-04-08 → 2025-06-06 (52) | — | $293,355 | $308,670 | $110,789 | 28.2 % | $148,553 (2016-07-05) | $141,385 (2016-07-05) | $0 |
| S2 New L0: `New L0` | $2,174,191 | $479,605 | −$3,096 | $308,476 | 18.8 % | 2025-01-23 → 2025-04-08 → 2025-06-04 (52) | −$194 | $291,637 | $308,476 | $110,789 | 28.2 % | $148,553 (2016-07-05) | $141,385 (2016-07-05) | $0 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $1,883,142 | $188,556 | −$294,145 | $319,933 | 31.4 % | 2021-12-27 → 2022-10-14 → 2023-12-13 (202) | +$11,263 | $319,933 | $303,717 | $109,893 | 28.7 % | $157,145 (2016-02-11) | $151,725 (2016-12-16) | −$1,017 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $1,950,111 | $255,525 | −$227,176 | $303,717 | 19.9 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$4,952 | $301,915 | $303,717 | $103,225 | 26.3 % | $157,145 (2016-02-11) | $161,230 (2016-12-22) | $0 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $1,866,337 | $171,751 | −$310,950 | $315,579 | 28.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$6,909 | $315,579 | $303,717 | $100,452 | 30.4 % | $134,854 (2016-02-08) | $124,006 (2016-02-08) | $0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $1,972,832 | $278,245 | −$204,455 | $308,664 | 27.0 % | 2021-12-27 → 2022-10-14 → 2023-12-18 (202) | −$6 | $308,664 | $303,717 | $101,778 | 30.4 % | $134,854 (2016-02-08) | $124,006 (2016-02-08) | $0 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $1,933,030 | $238,444 | −$244,257 | $324,762 | 29.8 % | 2021-12-27 → 2022-10-14 → 2023-12-13 (202) | +$16,092 | $324,762 | $314,007 | $107,384 | 28.0 % | $155,423 (2016-12-01) | $149,395 (2016-12-01) | −$44 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $2,053,045 | $358,459 | −$124,242 | $313,388 | 19.7 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | +$4,718 | $301,915 | $313,388 | $107,414 | 29.8 % | $135,412 (2016-02-09) | $124,332 (2016-02-09) | $0 |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4 | $1,950,111 | $255,525 | −$227,176 | $303,717 | 19.9 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$4,952 | $301,915 | $303,717 | $103,225 | 26.3 % | $157,145 (2016-02-11) | $161,230 (2016-12-22) | $0 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $1,873,109 | $178,523 | −$304,178 | $314,692 | 30.5 % | 2021-12-27 → 2022-10-14 → 2023-12-13 (202) | +$6,022 | $314,692 | $303,717 | $101,929 | 19.4 % | $157,145 (2016-02-11) | $168,370 (2016-02-11) | $0 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $1,976,594 | $282,008 | −$200,693 | $303,717 | 19.5 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$4,952 | $299,832 | $303,717 | $103,225 | 26.3 % | $157,145 (2016-02-11) | $161,230 (2016-12-22) | $0 |

## F2. Leverage sensitivity — $1,000,000 initial core (overlay fixed at $100,000 = 10 % of the initial core)

| Scenario | Terminal wealth | Incremental vs core | Δ terminal vs N/original | Max marked DD | % of peak | Peak → trough → recovery (sessions) | Δ DD vs N/original | Dev max DD | Val max DD | Max debt | Max LTV | Min headroom 30 % | Min headroom concentrated | Interest on negative overlay cash |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 core only: `60 % VOOG / 40 % VGT core only` | $6,778,345 | $0 | −$482,701 | $1,262,316 | 33.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$22,821 | $1,262,316 | $1,214,869 | $0 | 0.0 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $7,261,046 | $482,701 | — | $1,239,495 | 31.0 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | — | $1,239,495 | $1,219,822 | $110,789 | 8.9 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |
| S2 New L0: `New L0` | $7,257,950 | $479,605 | −$3,096 | $1,238,375 | 31.0 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | −$1,120 | $1,238,375 | $1,219,628 | $110,789 | 8.9 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $6,966,901 | $188,556 | −$294,145 | $1,266,670 | 33.1 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$27,175 | $1,266,670 | $1,214,869 | $109,893 | 8.9 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | −$1,017 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $7,033,870 | $255,525 | −$227,176 | $1,248,653 | 31.8 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$9,158 | $1,248,653 | $1,214,869 | $103,225 | 8.2 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $6,950,096 | $171,751 | −$310,950 | $1,262,316 | 32.3 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | +$22,821 | $1,262,316 | $1,214,869 | $100,452 | 9.9 % | $607,670 (2016-02-08) | $630,594 (2016-02-08) | $0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $7,056,590 | $278,245 | −$204,455 | $1,255,401 | 31.7 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$15,907 | $1,255,401 | $1,214,869 | $101,778 | 9.9 % | $607,670 (2016-02-08) | $630,594 (2016-02-08) | $0 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $7,016,789 | $238,444 | −$244,257 | $1,271,499 | 32.6 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$32,004 | $1,271,499 | $1,225,159 | $107,384 | 8.8 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | −$44 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $7,136,804 | $358,459 | −$124,242 | $1,248,653 | 31.3 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$9,158 | $1,248,653 | $1,224,540 | $107,414 | 9.9 % | $607,764 (2016-02-09) | $630,423 (2016-02-09) | $0 |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4 | $7,033,870 | $255,525 | −$227,176 | $1,248,653 | 31.8 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$9,158 | $1,248,653 | $1,214,869 | $103,225 | 8.2 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $6,956,868 | $178,523 | −$304,178 | $1,261,429 | 32.8 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$21,934 | $1,261,429 | $1,214,869 | $101,929 | 5.8 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $7,060,353 | $282,008 | −$200,693 | $1,246,570 | 31.8 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$7,075 | $1,246,570 | $1,214,869 | $103,225 | 8.2 % | $628,581 (2016-02-11) | $673,480 (2016-02-11) | $0 |

## F3. Convention sensitivity — sensitivity: drift (no rebalance) ($500,000 core)

| Scenario | Terminal wealth | Incremental vs core | Δ terminal vs N/original | Max marked DD | % of peak | Peak → trough → recovery (sessions) | Δ DD vs N/original | Dev max DD | Val max DD | Max debt | Max LTV | Min headroom 30 % | Min headroom concentrated | Interest on negative overlay cash |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 core only: `60 % VOOG / 40 % VGT core only` | $3,522,830 | $0 | −$482,701 | $644,569 | 33.9 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$3,689 | $644,569 | $635,928 | $0 | 0.0 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $4,005,531 | $482,701 | — | $640,881 | 21.6 % | 2025-01-23 → 2025-04-08 → 2025-06-12 (52) | — | $621,748 | $640,881 | $110,789 | 16.4 % | $314,290 (2016-02-11) | $332,926 (2016-07-05) | $0 |
| S2 New L0: `New L0` | $4,002,435 | $479,605 | −$3,096 | $640,687 | 21.7 % | 2025-01-23 → 2025-04-08 → 2025-06-12 (52) | −$194 | $620,628 | $640,687 | $110,789 | 16.4 % | $314,290 (2016-02-11) | $332,926 (2016-07-05) | $0 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $3,711,386 | $188,556 | −$294,145 | $648,923 | 32.7 % | 2021-12-27 → 2022-10-14 → 2023-12-18 (202) | +$8,042 | $648,923 | $635,928 | $109,893 | 16.5 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$1,017 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $3,778,355 | $255,525 | −$227,176 | $635,928 | 22.4 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$4,952 | $630,906 | $635,928 | $103,225 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $3,694,581 | $171,751 | −$310,950 | $644,569 | 31.2 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | +$3,689 | $644,569 | $635,928 | $100,452 | 18.0 % | $292,459 (2016-02-08) | $292,869 (2016-02-08) | $0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $3,801,075 | $278,245 | −$204,455 | $637,654 | 30.2 % | 2021-12-27 → 2022-10-14 → 2023-12-26 (202) | −$3,226 | $637,654 | $635,928 | $101,778 | 18.0 % | $292,459 (2016-02-08) | $292,869 (2016-02-08) | $0 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $3,761,274 | $238,444 | −$244,257 | $653,752 | 31.8 % | 2021-12-27 → 2022-10-14 → 2023-12-18 (202) | +$12,871 | $653,752 | $646,218 | $107,384 | 16.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$44 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $3,881,289 | $358,459 | −$124,242 | $645,599 | 22.2 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | +$4,718 | $630,906 | $645,599 | $107,414 | 17.8 % | $292,863 (2016-02-09) | $293,029 (2016-02-09) | $0 |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4 | $3,778,355 | $255,525 | −$227,176 | $635,928 | 22.4 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$4,952 | $630,906 | $635,928 | $103,225 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $3,701,353 | $178,523 | −$304,178 | $643,682 | 32.2 % | 2021-12-27 → 2022-10-14 → 2023-12-15 (202) | +$2,801 | $643,682 | $635,928 | $101,929 | 10.7 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $3,804,837 | $282,008 | −$200,693 | $635,928 | 22.1 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$4,952 | $628,823 | $635,928 | $103,225 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |

## F4. Convention sensitivity — sensitivity: realized overlay profits swept into the core quarterly ($500,000 core)

| Scenario | Terminal wealth | Incremental vs core | Δ terminal vs N/original | Max marked DD | % of peak | Peak → trough → recovery (sessions) | Δ DD vs N/original | Dev max DD | Val max DD | Max debt | Max LTV | Min headroom 30 % | Min headroom concentrated | Interest on negative overlay cash |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 core only: `60 % VOOG / 40 % VGT core only` | $3,389,172 | $0 | −$1,242,367 | $631,158 | 33.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | −$186,022 | $631,158 | $607,435 | $0 | 0.0 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | $0 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $4,631,540 | $1,242,367 | — | $817,180 | 24.3 % | 2025-01-23 → 2025-04-08 → 2025-06-12 (52) | — | $771,821 | $817,180 | $112,173 | 16.4 % | $314,290 (2016-02-11) | $332,926 (2016-07-05) | −$171 |
| S2 New L0: `New L0` | $4,620,388 | $1,231,216 | −$11,152 | $814,518 | 24.3 % | 2025-01-23 → 2025-04-08 → 2025-06-12 (52) | −$2,662 | $770,560 | $814,518 | $112,062 | 16.4 % | $314,290 (2016-02-11) | $332,926 (2016-07-05) | −$146 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $3,858,999 | $469,826 | −$772,541 | $691,698 | 34.0 % | 2021-12-27 → 2022-10-14 → 2024-01-18 (202) | −$125,483 | $691,698 | $687,317 | $116,558 | 16.5 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$2,933 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $4,208,675 | $819,502 | −$422,865 | $757,171 | 24.1 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$60,009 | $744,545 | $757,171 | $106,006 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$1,164 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $4,204,611 | $815,439 | −$426,929 | $781,235 | 33.7 % | 2021-12-27 → 2022-10-14 → 2024-01-23 (202) | −$35,946 | $781,235 | $751,894 | $102,488 | 18.0 % | $292,459 (2016-02-08) | $292,869 (2016-02-08) | −$1,061 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $4,489,569 | $1,100,396 | −$141,971 | $808,915 | 33.5 % | 2021-12-27 → 2022-10-14 → 2024-01-19 (202) | −$8,266 | $808,915 | $803,623 | $114,970 | 18.0 % | $292,459 (2016-02-08) | $292,869 (2016-02-08) | −$2,661 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $4,108,748 | $719,575 | −$522,792 | $743,675 | 24.5 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$73,505 | $740,401 | $743,675 | $107,384 | 16.2 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$415 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $4,686,061 | $1,296,889 | +$54,522 | $843,685 | 24.4 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | +$26,504 | $824,389 | $843,685 | $107,414 | 17.8 % | $292,863 (2016-02-09) | $293,029 (2016-02-09) | −$550 |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4 | $4,208,675 | $819,502 | −$422,865 | $757,171 | 24.1 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$60,009 | $744,545 | $757,171 | $106,006 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$1,164 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $3,871,857 | $482,685 | −$759,682 | $693,945 | 24.1 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$123,235 | $689,920 | $693,945 | $101,929 | 10.8 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$155 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $4,271,932 | $882,760 | −$359,607 | $768,509 | 24.1 % | 2025-01-23 → 2025-04-08 → 2025-06-24 (52) | −$48,672 | $743,154 | $768,509 | $103,695 | 15.1 % | $314,290 (2016-02-11) | $336,740 (2016-02-11) | −$1,100 |

## G. Annual total-account results ($500,000 core, primary): incremental P&L vs core only, and the year's max DD

| Scenario | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S0 core only: P&L (max DD) | $57,489 ($50,764, 10.2 %) | $173,102 ($21,434, 3.3 %) | $6,416 ($191,701, 21.8 %) | $278,785 ($73,111, 8.1 %) | $389,271 ($352,758, 31.6 %) | $440,425 ($142,214, 9.5 %) | −$545,496 ($617,487, 33.2 %) | $505,075 ($173,672, 10.1 %) | $600,060 ($318,062, 13.8 %) | $529,863 ($607,435, 24.1 %) | $454,185 ($404,942, 13.5 %) |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)`: incremental (max DD) | +$8,588 ($50,764) | +$23,852 ($29,846) | +$18,870 ($190,496) | +$29,127 ($82,246) | +$138,876 ($309,843) | +$32,526 ($151,660) | +$48,277 ($594,179) | +$43,805 ($166,411) | +$44,110 ($324,994) | +$45,169 ($612,387) | +$49,501 ($401,097) |
| S2 New L0: `New L0`: incremental (max DD) | +$8,588 ($50,764) | +$23,852 ($29,846) | +$18,525 ($191,060) | +$29,005 ($82,196) | +$138,878 ($309,843) | +$32,525 ($151,626) | +$43,474 ($593,058) | +$43,764 ($166,452) | +$44,110 ($324,994) | +$47,531 ($612,193) | +$49,353 ($401,097) |
| S3 ablation: `control: N/original GDX D1 (ablation)`: incremental (max DD) | −$229 ($50,764) | −$5,590 ($32,609) | +$5,205 ($189,858) | −$71 ($73,117) | +$68,609 ($299,814) | +$15,227 ($149,298) | +$20,850 ($621,354) | +$30,818 ($166,411) | +$28,090 ($318,062) | $0 ($607,435) | +$25,648 ($401,097) |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary): incremental (max DD) | +$9,025 ($50,764) | +$13,629 ($21,434) | +$15,791 ($176,963) | +$1,886 ($73,111) | +$138,809 ($297,337) | −$1,848 ($143,528) | +$33,382 ($603,823) | +$16,357 ($166,781) | +$43,750 ($315,597) | $0 ($607,435) | −$15,255 ($409,411) |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary): incremental (max DD) | +$80,032 ($40,687) | −$183 ($21,434) | $0 ($191,701) | $0 ($73,111) | +$82,419 ($329,501) | $0 ($142,214) | −$811 ($617,487) | $0 ($173,672) | $0 ($318,062) | +$3,372 ($607,435) | +$6,923 ($404,942) |
| S11 C: `C24/C/pair DF2×GF1` (primary): incremental (max DD) | +$81,087 ($40,687) | +$6,393 ($21,434) | −$4,746 ($191,701) | $0 ($73,111) | +$124,472 ($296,884) | +$3,075 ($151,954) | +$3,823 ($610,087) | +$31,636 ($175,729) | +$27,295 ($318,062) | +$3,372 ($607,435) | +$1,839 ($403,339) |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary): incremental (max DD) | +$5,547 ($50,764) | +$13,415 ($21,434) | +$5,307 ($189,142) | $0 ($73,111) | +$113,640 ($298,921) | +$16,668 ($151,588) | +$13,978 ($626,186) | +$35,295 ($171,519) | +$26,514 ($318,062) | +$34,691 ($617,724) | −$26,613 ($446,473) |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary): incremental (max DD) | +$75,064 ($38,440) | +$13,629 ($21,434) | +$15,791 ($176,963) | +$1,886 ($73,111) | +$138,809 ($297,337) | −$1,848 ($143,528) | +$33,382 ($603,823) | +$16,357 ($166,781) | +$43,750 ($315,597) | +$46,638 ($617,105) | −$24,998 ($445,926) |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4: incremental (max DD) | +$9,025 ($50,764) | +$13,629 ($21,434) | +$15,791 ($176,963) | +$1,886 ($73,111) | +$138,809 ($297,337) | −$1,848 ($143,528) | +$33,382 ($603,823) | +$16,357 ($166,781) | +$43,750 ($315,597) | $0 ($607,435) | −$15,255 ($409,411) |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary): incremental (max DD) | $0 ($50,764) | $0 ($21,434) | $0 ($191,701) | $0 ($73,111) | +$96,300 ($314,328) | $0 ($142,214) | +$24,379 ($616,600) | +$35,342 ($175,523) | +$22,502 ($314,568) | $0 ($607,435) | $0 ($404,942) |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary): incremental (max DD) | +$9,025 ($50,764) | +$13,629 ($21,434) | +$15,791 ($176,963) | +$1,886 ($73,111) | +$139,110 ($293,871) | −$152 ($143,528) | +$41,244 ($601,830) | +$32,980 ($166,781) | +$43,750 ($315,597) | $0 ($607,435) | −$15,255 ($409,411) |

## H. The core's five worst drawdown episodes and each overlay's P&L inside them (overlapping episodes)

| Scenario | 2021-12-27 → 2022-10-14 (core −631,158, 33.7 %) | 2025-01-23 → 2025-04-08 (core −607,435, 24.1 %) | 2025-10-29 → 2026-03-30 (core −451,235, 14.8 %) | 2026-06-02 → 2026-07-29 (core −386,532, 10.8 %) | 2020-02-19 → 2020-03-23 (core −352,758, 31.6 %) |
|---|---:|---:|---:|---:|---:|
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | +$22,821 | −$4,952 | −$7,262 | −$13,189 | +$42,915 |
| S2 New L0: `New L0` | +$23,942 | −$4,758 | −$7,417 | −$13,079 | +$42,915 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | −$4,354 | $0 | +$3,844 | −$11,600 | +$52,949 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | +$13,664 | $0 | +$1,208 | −$22,879 | +$55,421 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | +$6,915 | $0 | +$3,457 | −$16,807 | +$55,874 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | −$1,906 | $0 | +$3,606 | $0 | +$56,206 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $0 | $0 | $0 | $0 | +$23,258 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | +$2,923 | $0 | $0 | $0 | +$56,779 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | −$3,232 | $0 | $0 | $0 | +$58,102 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | +$7,410 | $0 | $0 | $0 | +$31,838 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | +$6,915 | $0 | +$3,457 | −$16,807 | +$55,874 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | +$9,838 | $0 | +$3,457 | −$16,807 | +$59,091 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | +$3,683 | $0 | +$3,457 | −$16,807 | +$60,922 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | −$9,182 | −$10,290 | −$16,277 | −$14,265 | +$53,837 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | −$6,547 | −$10,290 | +$8,681 | −$14,265 | +$51,765 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | +$6,811 | +$8,832 | +$13,745 | −$16,356 | +$58,056 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | −$922 | $0 | +$4,455 | −$3,807 | +$56,946 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | +$13,664 | −$9,671 | −$10,714 | −$14,463 | +$55,421 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | +$6,915 | $0 | +$11,262 | −$16,807 | +$55,874 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | +$6,915 | −$9,671 | +$15,915 | −$16,807 | +$55,874 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | +$6,915 | −$10,290 | −$9,058 | −$14,265 | +$55,874 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | +$887 | $0 | $0 | $0 | +$38,431 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | +$2,083 | $0 | $0 | −$4,590 | +$54,297 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | +$15,747 | $0 | +$1,208 | −$22,879 | +$59,230 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | +$8,908 | $0 | +$3,457 | −$16,807 | +$59,091 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | +$7,802 | $0 | +$3,457 | −$16,807 | +$43,253 |

Each scenario's own worst five total-account episodes (dollars, % of peak, peak → trough → recovery):

| Scenario | 1 | 2 | 3 |
|---|---|---|---|
| S0 core only: `60 % VOOG / 40 % VGT core only` | $631,158 (33.7 %) 2021-12-27 → 2022-10-14 → 2024-01-23 | $607,435 (24.1 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $451,235 (14.8 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $612,387 (21.1 %) 2025-01-23 → 2025-04-08 → 2025-06-10 | $608,337 (28.6 %) 2021-12-27 → 2022-10-14 → 2023-12-13 | $458,497 (13.1 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S2 New L0: `New L0` | $612,193 (21.1 %) 2025-01-23 → 2025-04-08 → 2025-06-10 | $607,216 (28.6 %) 2021-12-27 → 2022-10-14 → 2023-12-14 | $458,652 (13.1 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $635,512 (32.5 %) 2021-12-27 → 2022-10-14 → 2024-01-18 | $607,435 (22.7 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $447,391 (13.9 %) 2025-10-29 → 2026-03-30 → 2026-04-16 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $617,494 (30.1 %) 2021-12-27 → 2022-10-14 → 2024-01-18 | $607,435 (21.8 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $450,028 (13.6 %) 2025-10-29 → 2026-03-30 → 2026-04-16 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $631,158 (31.0 %) 2021-12-27 → 2022-10-14 → 2024-01-23 | $607,435 (22.7 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $451,235 (14.0 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $624,243 (30.0 %) 2021-12-27 → 2022-10-14 → 2024-01-19 | $607,435 (21.8 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $447,778 (13.5 %) 2025-10-29 → 2026-03-30 → 2026-04-16 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $640,341 (31.6 %) 2021-12-27 → 2022-10-14 → 2024-01-18 | $617,724 (22.5 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $467,512 (14.1 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $617,494 (29.2 %) 2021-12-27 → 2022-10-14 → 2024-01-18 | $617,105 (21.6 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $461,950 (13.5 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S22 D+: `C24/D/refine/D.D1/R103#1 profit` (primary) = S4 | $617,494 (30.1 %) 2021-12-27 → 2022-10-14 → 2024-01-18 | $607,435 (21.8 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $450,028 (13.6 %) 2025-10-29 → 2026-03-30 → 2026-04-16 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $630,271 (32.0 %) 2021-12-27 → 2022-10-14 → 2023-12-27 | $607,435 (22.5 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $451,235 (14.0 %) 2025-10-29 → 2026-03-30 → 2026-04-17 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $615,412 (30.0 %) 2021-12-27 → 2022-10-14 → 2023-12-18 | $607,435 (21.6 %) 2025-01-23 → 2025-04-08 → 2025-06-24 | $450,028 (13.5 %) 2025-10-29 → 2026-03-30 → 2026-04-16 |

## I. Trading sleeve: absolute and time-in-market normalized (full 2016-01-04 → 2026-10-30)

| Scenario | Net | Dev net | Val net | Minute DD | Lots (by symbol) | Worst lot | Occupancy | Principal-days ($·days) | Net per $100k-year | Net per borrowing-$-day | Giveback total / max lot | Funding refusals (by occupant) |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | $482,701 | $388,031 | $94,670 | $20,386 | 44 (VGT 17, GDX 27) | −$9,114 | 62.6 % | 240,600,000 | $73,228 | $0.0020 | — | D1:GDX refused (occupant G:VGT): 15; G:VGT refused (occupant D1:GDX): 2; D1:VGT refused (occupant D1:GDX): 4; G:VGT refused (occupant D1:VGT): 2; D1:GDX refused (occupant D1:VGT): 5 |
| S2 New L0: `New L0` | $479,605 | $382,721 | $96,884 | $20,386 | 46 (VGT 15, GDX 31) | −$9,114 | 63.2 % | 242,700,000 | $72,129 | $0.0020 | — | D1:GDX refused (occupant G:VGT): 16; G:VGT refused (occupant D1:GDX): 2; D1:VGT refused (occupant D1:GDX): 6; G:VGT refused (occupant D1:VGT): 2; D1:GDX refused (occupant D1:VGT): 7 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | $189,573 | $163,925 | $25,648 | $27,053 | 47 (GDX 47) | −$10,070 | 24.3 % | 89,300,000 | $77,485 | $0.0021 | $348,287 / $12,213 | 0 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | $255,525 | $270,780 | −$15,255 | $30,362 | 46 (GDX 46) | −$19,102 | 27.1 % | 101,300,000 | $92,070 | $0.0025 | $320,273 / $25,627 | 0 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | $172,790 | $175,537 | −$2,747 | $27,398 | 27 (GDX 27) | −$14,732 | 15.6 % | 58,200,000 | $108,365 | $0.0030 | $211,268 / $18,777 | 0 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | $124,426 | $119,657 | $4,769 | $17,281 | 16 (GDX 16) | −$8,860 | 5.0 % | 17,000,000 | $267,150 | $0.0073 | $123,352 / $11,109 | 0 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | $171,751 | $161,457 | $10,294 | $17,744 | 41 (GDX 41) | −$3,108 | 9.5 % | 31,200,000 | $200,926 | $0.0055 | $169,914 / $10,463 | 0 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | $135,665 | $135,665 | $0 | $18,071 | 13 (GDX 13) | −$9,546 | 8.2 % | 30,100,000 | $164,511 | $0.0045 | $110,140 / $10,601 | 0 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | $102,167 | $102,167 | $0 | $17,744 | 10 (GDX 10) | −$5,464 | 2.3 % | 7,600,000 | $490,669 | $0.0134 | $66,408 / $10,463 | 0 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | $39,248 | $39,248 | $0 | $10,801 | 2 (GDX 2) | $7,410 | 0.3 % | 700,000 | $2,046,521 | $0.0561 | $9,066 / $5,049 | 0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | $278,245 | $273,035 | $5,210 | $27,398 | 62 (GDX 62) | −$14,732 | 24.0 % | 85,600,000 | $118,644 | $0.0033 | $343,039 / $18,777 | Growth·GDX refused (occupant D1·GDX): 5; D1·GDX refused (occupant Growth·GDX): 1 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | $190,721 | $193,468 | −$2,747 | $27,398 | 35 (GDX 35) | −$14,732 | 22.0 % | 81,800,000 | $85,102 | $0.0023 | $273,915 / $18,777 | D1·GDX refused (occupant Growth·GDX): 3; Growth·GDX refused (occupant D1·GDX): 2 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | $182,451 | $185,197 | −$2,747 | $27,398 | 33 (GDX 33) | −$14,732 | 17.2 % | 63,700,000 | $104,544 | $0.0029 | $241,650 / $18,777 | D1·GDX refused (occupant Growth·GDX): 2; Growth·GDX refused (occupant D1·GDX): 2 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | $238,488 | $230,410 | $8,078 | $60,066 | 43 (GDX 43) | −$40,493 | 34.2 % | 128,500,000 | $67,742 | $0.0019 | $359,963 / $41,775 | D1·GDX refused (occupant Growth·GDX): 8 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | $217,046 | $190,252 | $26,794 | $50,641 | 43 (GDX 43) | −$40,493 | 35.3 % | 133,200,000 | $59,476 | $0.0016 | $370,830 / $41,775 | D1·GDX refused (occupant Growth·GDX): 11 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | $228,065 | $175,796 | $52,269 | $42,848 | 27 (GDX 27) | −$13,241 | 24.3 % | 92,800,000 | $89,702 | $0.0025 | $242,390 / $40,131 | Growth·GDX refused (occupant D1·GDX): 1 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | $100,183 | $87,568 | $12,614 | $17,281 | 14 (GDX 14) | −$4,655 | 3.7 % | 12,700,000 | $287,927 | $0.0079 | $90,674 / $11,109 | 0 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | $358,459 | $336,819 | $21,640 | $59,792 | 48 (GDX 48) | −$39,467 | 43.0 % | 163,400,000 | $80,072 | $0.0022 | $411,930 / $42,320 | Growth·GDX refused (occupant D1·GDX): 1; D1·GDX refused (occupant Growth·GDX): 4 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | $295,175 | $246,823 | $48,352 | $42,044 | 30 (GDX 30) | −$14,732 | 31.9 % | 121,800,000 | $88,456 | $0.0024 | $291,760 / $36,233 | Growth·GDX refused (occupant D1·GDX): 1; D1·GDX refused (occupant Growth·GDX): 1 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | $250,756 | $216,457 | $34,298 | $27,398 | 32 (GDX 32) | −$14,732 | 30.6 % | 116,300,000 | $78,698 | $0.0022 | $263,025 / $18,777 | Growth·GDX refused (occupant D1·GDX): 1 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | $209,228 | $182,994 | $26,234 | $51,986 | 27 (GDX 27) | −$40,493 | 25.6 % | 97,400,000 | $78,407 | $0.0021 | $241,021 / $41,775 | D1·GDX refused (occupant Growth·GDX): 5 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $178,523 | $178,523 | $0 | $16,155 | 12 (GDX 12) | −$643 | 17.3 % | 66,100,000 | $98,579 | $0.0027 | $105,508 / $10,981 | 0 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | $140,412 | $145,002 | −$4,590 | $25,425 | 15 (GDX 15) | −$4,590 | 7.9 % | 28,400,000 | $180,460 | $0.0049 | $114,407 / $10,378 | 0 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | $282,008 | $297,262 | −$15,255 | $30,362 | 51 (GDX 51) | −$19,102 | 30.3 % | 113,200,000 | $90,930 | $0.0025 | $354,806 / $25,627 | D1·GDX refused (occupant Growth·GDX): 3; Growth·GDX refused (occupant D1·GDX): 7 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | $202,960 | $205,707 | −$2,747 | $27,398 | 35 (GDX 35) | −$14,732 | 20.7 % | 76,800,000 | $96,459 | $0.0026 | $271,313 / $18,777 | D1·GDX refused (occupant Growth·GDX): 3; Growth·GDX refused (occupant D1·GDX): 4 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | $201,842 | $204,589 | −$2,747 | $27,398 | 31 (GDX 31) | −$14,732 | 27.9 % | 106,000,000 | $69,502 | $0.0019 | $246,411 / $18,777 | D1·GDX refused (occupant Growth·GDX): 8 |

Giveback = Σ over lots of (the lot's best mark − its final net), from the CPU lot replays (`reports/diagnostics/lots.json`; N/original and New L0: their own committed per-lot ledgers, not replayed here). Worst lot = the most negative realized lot net. Net per borrowing-$-day = net ÷ Σ (outstanding principal × calendar days).

## J. Exposure, correlation and the technology share

| Scenario | Corr. with core (all sessions) | Corr. (sessions with a lot) | Beta to core | Mean tech share of gross | Max tech share | Mean GDX share | Sessions with a VGT lot | Sessions with a GDX lot | Mean core DD on VGT-lot sessions | Mean core DD on GDX-lot sessions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | 0.409 | 0.521 | 0.0288 | 42.7 % | 51.7 % | 0.94 % | 1,272 | 391 | $58,335 | $235,445 |
| S2 New L0: `New L0` | 0.405 | 0.514 | 0.0288 | 42.6 % | 51.7 % | 1.04 % | 1,246 | 431 | $47,808 | $263,423 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | 0.126 | 0.217 | 0.0077 | 39.4 % | 42.9 % | 1.84 % | 0 | 616 | — | $183,050 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | 0.121 | 0.209 | 0.0078 | 39.3 % | 42.4 % | 2.18 % | 0 | 691 | — | $150,408 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | 0.092 | 0.189 | 0.0050 | 39.7 % | 42.9 % | 1.16 % | 0 | 399 | — | $126,247 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | 0.026 | 0.078 | 0.0011 | 40.0 % | 43.5 % | 0.41 % | 0 | 120 | — | $180,385 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | 0.048 | 0.155 | 0.0020 | 39.8 % | 43.5 % | 0.88 % | 0 | 217 | — | $87,095 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | 0.031 | 0.094 | 0.0015 | 39.9 % | 43.5 % | 0.62 % | 0 | 211 | — | $314,787 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | -0.015 | -0.089 | -0.0006 | 40.1 % | 43.5 % | 0.18 % | 0 | 53 | — | $254,772 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | -0.093 | -0.812 | -0.0027 | 40.2 % | 43.5 % | 0.02 % | 0 | 5 | — | $522,614 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | 0.086 | 0.153 | 0.0055 | 39.4 % | 42.9 % | 1.93 % | 0 | 591 | — | $110,057 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | 0.121 | 0.223 | 0.0076 | 39.5 % | 42.9 % | 1.62 % | 0 | 563 | — | $176,783 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | 0.091 | 0.181 | 0.0053 | 39.6 % | 42.9 % | 1.27 % | 0 | 436 | — | $137,406 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | 0.187 | 0.250 | 0.0133 | 39.2 % | 42.5 % | 2.30 % | 0 | 889 | — | $125,644 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | 0.185 | 0.242 | 0.0132 | 39.2 % | 42.5 % | 2.38 % | 0 | 919 | — | $128,963 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | 0.133 | 0.196 | 0.0084 | 39.6 % | 43.2 % | 1.26 % | 0 | 636 | — | $123,609 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | 0.058 | 0.173 | 0.0024 | 40.1 % | 43.5 % | 0.26 % | 0 | 86 | — | $225,416 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | 0.145 | 0.180 | 0.0125 | 38.7 % | 42.5 % | 3.58 % | 0 | 1,123 | — | $122,862 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | 0.092 | 0.143 | 0.0074 | 39.1 % | 42.9 % | 2.63 % | 0 | 838 | — | $91,552 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | 0.133 | 0.197 | 0.0085 | 39.4 % | 42.9 % | 1.98 % | 0 | 801 | — | $100,091 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | 0.156 | 0.218 | 0.0099 | 39.6 % | 42.5 % | 1.50 % | 0 | 671 | — | $116,668 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | 0.056 | 0.138 | 0.0028 | 39.8 % | 43.5 % | 0.84 % | 0 | 458 | — | $217,392 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | 0.040 | 0.121 | 0.0019 | 39.9 % | 43.5 % | 0.56 % | 0 | 199 | — | $360,838 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | 0.121 | 0.202 | 0.0082 | 39.2 % | 42.2 % | 2.40 % | 0 | 774 | — | $174,867 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | 0.119 | 0.223 | 0.0074 | 39.5 % | 42.9 % | 1.53 % | 0 | 529 | — | $193,571 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | 0.134 | 0.230 | 0.0083 | 39.5 % | 42.9 % | 1.67 % | 0 | 729 | — | $168,622 |

Basis: daily $ change of the core-only account vs daily $ change of the overlay’s marked net. Technology share = (VGT core + VGT overlay lot) ÷ gross long value; VOOG is reported apart (a broad US growth fund with a large technology weight), never assumed non-technology.

## K. Quarters of strongest VGT / GDX divergence: the overlay's P&L

| Scenario | 2026Q2 (VGT +37 %, GDX −18 %) | 2025Q1 (VGT −13 %, GDX +35 %) | 2016Q2 (VGT −2 %, GDX +39 %) | 2016Q1 (VGT +3 %, GDX +42 %) | 2025Q3 (VGT +13 %, GDX +47 %) | 2018Q4 (VGT −18 %, GDX +14 %) |
|---|---:|---:|---:|---:|---:|---:|
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | +$17,128 | $0 | $0 | $0 | +$14,009 | +$10,059 |
| S2 New L0: `New L0` | +$17,128 | $0 | $0 | $0 | +$14,249 | +$9,454 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | −$6,725 | $0 | $0 | $0 | $0 | +$3,250 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | −$16,270 | $0 | $0 | $0 | $0 | +$15,853 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | −$11,662 | $0 | $0 | $0 | $0 | $0 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | −$5,909 | $0 | $0 | $0 | $0 | $0 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | +$925 | $0 | +$51,114 | +$30,408 | $0 | $0 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | $0 | $0 | $0 | $0 | $0 | $0 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | $0 | $0 | $0 | $0 | $0 | $0 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | $0 | $0 | $0 | $0 | $0 | $0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | −$13,074 | $0 | +$51,114 | +$30,408 | $0 | $0 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | −$11,662 | $0 | $0 | $0 | $0 | $0 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | −$11,662 | $0 | $0 | $0 | $0 | $0 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | −$16,877 | −$422 | $0 | $0 | +$43,251 | +$3,903 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | −$16,877 | −$422 | $0 | $0 | +$43,251 | +$2,651 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | −$9,308 | +$15,066 | $0 | $0 | +$25,847 | $0 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | +$1,067 | $0 | $0 | $0 | $0 | $0 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | −$17,100 | +$266 | +$35,326 | +$31,216 | +$46,325 | +$15,853 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | −$11,662 | $0 | +$33,295 | +$31,216 | +$46,464 | $0 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | −$11,662 | +$266 | +$16,540 | +$18,459 | +$30,258 | $0 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | −$16,877 | −$422 | $0 | $0 | +$43,251 | $0 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | $0 | $0 | $0 | $0 | $0 | $0 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | $0 | $0 | $0 | $0 | $0 | $0 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | −$16,270 | $0 | $0 | $0 | $0 | +$15,853 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | −$11,662 | $0 | $0 | $0 | $0 | $0 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | −$11,662 | $0 | $0 | $0 | $0 | $0 |

Core-only P&L in those quarters: 2026Q2 +$755,847; 2025Q1 −$244,191; 2016Q2 −$819; 2016Q1 +$13,524; 2025Q3 +$287,033; 2018Q4 −$138,077.

Duplicate overlays (identical configuration under an informed population): S22 = S4; S23 = S5; S24 = S6; S27 = S9; S28 = S10; S31 = S13.

## L. HYPOTHETICAL instantaneous stresses (not historical observations; margin figures illustrative)

Shocks (PROTOCOL §15.6): technology decline VGT −30 %, VOOG −20 %, GDX −10 %; broad equity crash VOOG −30 %, VGT −35 %, GDX −25 %; gold-miner selloff GDX −40 %, core 0 %; combined VOOG −30 %, VGT −35 %, GDX −40 %. Applied at the close of the scenario's maximum overlay value and at the close of its maximum debt; the loss applies to every holding (core and overlay lot).

| Scenario | Point | Date | Equity before | Tech decline loss (% eq.) | Broad crash | Gold-miner selloff | Combined | Headroom 25 % after combined | Headroom 40 % after combined |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | atMaximumOverlayValue | 2020-09-02 | $1,569,571 | −$375,898 (23.9 %) | −$492,634 (31.4 %) | $0 (0.0 %) | −$492,634 (31.4 %) | $819,239 | $664,620 |
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | atMaximumDebt | 2017-06-28 | $671,336 | −$195,375 (29.1 %) | −$253,673 (37.8 %) | $0 (0.0 %) | −$253,673 (37.8 %) | $286,099 | $207,161 |
| S2 New L0: `New L0` | atMaximumOverlayValue | 2020-09-02 | $1,569,597 | −$376,046 (24.0 %) | −$492,807 (31.4 %) | $0 (0.0 %) | −$492,807 (31.4 %) | $819,012 | $664,346 |
| S2 New L0: `New L0` | atMaximumDebt | 2017-06-28 | $671,336 | −$195,375 (29.1 %) | −$253,673 (37.8 %) | $0 (0.0 %) | −$253,673 (37.8 %) | $286,099 | $207,161 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | atMaximumOverlayValue | 2020-03-17 | $888,414 | −$216,336 (24.3 %) | −$305,650 (34.4 %) | −$58,826 (6.6 %) | −$327,710 (36.9 %) | $395,780 | $296,825 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | atMaximumDebt | 2017-01-10 | $578,232 | −$148,681 (25.7 %) | −$211,965 (36.7 %) | −$47,274 (8.2 %) | −$229,693 (39.7 %) | $233,930 | $165,165 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | atMaximumOverlayValue | 2020-03-17 | $932,658 | −$216,336 (23.2 %) | −$305,650 (32.8 %) | −$58,826 (6.3 %) | −$327,710 (35.1 %) | $440,023 | $341,068 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | atMaximumDebt | 2019-02-28 | $879,119 | −$213,504 (24.3 %) | −$298,181 (33.9 %) | −$48,376 (5.5 %) | −$316,322 (36.0 %) | $402,591 | $306,468 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | atMaximumOverlayValue | 2020-03-17 | $894,891 | −$216,336 (24.2 %) | −$305,650 (34.2 %) | −$58,826 (6.6 %) | −$327,710 (36.6 %) | $402,256 | $303,302 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | atMaximumDebt | 2024-04-12 | $2,154,456 | −$487,518 (22.6 %) | −$665,361 (30.9 %) | −$51,111 (2.4 %) | −$684,528 (31.8 %) | $1,114,058 | $900,536 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | atMaximumOverlayValue | 2020-03-17 | $898,158 | −$216,336 (24.1 %) | −$305,650 (34.0 %) | −$58,826 (6.6 %) | −$327,710 (36.5 %) | $405,524 | $306,569 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | atMaximumDebt | 2020-07-13 | $1,266,626 | −$286,435 (22.6 %) | −$396,007 (31.3 %) | −$46,880 (3.7 %) | −$413,587 (32.6 %) | $640,448 | $512,894 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | atMaximumOverlayValue | 2016-04-12 | $558,090 | −$134,335 (24.1 %) | −$192,770 (34.5 %) | −$46,469 (8.3 %) | −$210,196 (37.7 %) | $243,439 | $180,767 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | atMaximumDebt | 2020-07-09 | $1,324,991 | −$290,761 (21.9 %) | −$400,721 (30.2 %) | −$44,385 (3.4 %) | −$417,366 (31.5 %) | $692,790 | $563,889 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | atMaximumOverlayValue | 2020-03-17 | $890,615 | −$216,661 (24.3 %) | −$306,462 (34.4 %) | −$60,125 (6.8 %) | −$329,009 (36.9 %) | $396,194 | $296,947 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | atMaximumDebt | 2023-04-18 | $1,637,045 | −$368,798 (22.5 %) | −$506,210 (30.9 %) | −$47,813 (2.9 %) | −$524,140 (32.0 %) | $841,676 | $678,938 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | atMaximumOverlayValue | 2020-03-17 | $890,615 | −$216,661 (24.3 %) | −$306,462 (34.4 %) | −$60,125 (6.8 %) | −$329,009 (36.9 %) | $396,194 | $296,947 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | atMaximumDebt | 2020-04-14 | $1,059,093 | −$244,364 (23.1 %) | −$339,844 (32.1 %) | −$48,098 (4.5 %) | −$357,881 (33.8 %) | $518,605 | $409,041 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | atMaximumOverlayValue | 2020-03-16 | $827,454 | −$203,726 (24.6 %) | −$287,356 (34.7 %) | −$53,681 (6.5 %) | −$307,487 (37.2 %) | $364,972 | $271,975 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | atMaximumDebt | 2022-10-04 | $1,386,296 | −$333,999 (24.1 %) | −$457,923 (33.0 %) | −$44,033 (3.2 %) | −$474,435 (34.2 %) | $666,817 | $519,790 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | atMaximumOverlayValue | 2020-03-17 | $974,923 | −$216,336 (22.2 %) | −$305,650 (31.4 %) | −$58,826 (6.0 %) | −$327,710 (33.6 %) | $482,288 | $383,333 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | atMaximumDebt | 2024-04-12 | $2,251,955 | −$487,518 (21.6 %) | −$665,361 (29.5 %) | −$51,111 (2.3 %) | −$684,528 (30.4 %) | $1,211,556 | $998,034 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | atMaximumOverlayValue | 2020-03-17 | $898,139 | −$216,661 (24.1 %) | −$306,462 (34.1 %) | −$60,125 (6.7 %) | −$329,009 (36.6 %) | $403,718 | $304,471 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | atMaximumDebt | 2023-04-18 | $1,658,262 | −$368,798 (22.2 %) | −$506,210 (30.5 %) | −$47,813 (2.9 %) | −$524,140 (31.6 %) | $862,892 | $700,155 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | atMaximumOverlayValue | 2020-03-17 | $898,139 | −$216,661 (24.1 %) | −$306,462 (34.1 %) | −$60,125 (6.7 %) | −$329,009 (36.6 %) | $403,718 | $304,471 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | atMaximumDebt | 2024-04-12 | $2,164,117 | −$487,518 (22.5 %) | −$665,361 (30.8 %) | −$51,111 (2.4 %) | −$684,528 (31.6 %) | $1,123,719 | $910,196 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | atMaximumOverlayValue | 2025-10-16 | $3,164,051 | −$707,193 (22.4 %) | −$960,816 (30.4 %) | −$63,880 (2.0 %) | −$984,771 (31.1 %) | $1,666,450 | $1,358,751 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | atMaximumDebt | 2026-10-30 | $3,627,616 | −$820,094 (22.6 %) | −$1,101,262 (30.4 %) | −$26,756 (0.7 %) | −$1,111,296 (30.6 %) | $1,930,126 | $1,578,408 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | atMaximumOverlayValue | 2025-10-08 | $3,179,838 | −$720,771 (22.7 %) | −$977,447 (30.7 %) | −$59,864 (1.9 %) | −$999,896 (31.4 %) | $1,658,588 | $1,345,776 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | atMaximumDebt | 2017-02-21 | $621,714 | −$158,011 (25.4 %) | −$225,349 (36.2 %) | −$51,454 (8.3 %) | −$244,644 (39.4 %) | $255,303 | $182,242 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | atMaximumOverlayValue | 2020-03-17 | $901,869 | −$216,336 (24.0 %) | −$305,650 (33.9 %) | −$58,826 (6.5 %) | −$327,710 (36.3 %) | $409,235 | $310,280 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | atMaximumDebt | 2024-04-12 | $2,155,371 | −$487,494 (22.6 %) | −$665,301 (30.9 %) | −$51,014 (2.4 %) | −$684,431 (31.8 %) | $1,115,106 | $901,605 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | atMaximumOverlayValue | 2020-03-17 | $884,556 | −$216,336 (24.5 %) | −$305,650 (34.5 %) | −$58,826 (6.7 %) | −$327,710 (37.0 %) | $391,922 | $292,967 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | atMaximumDebt | 2020-03-12 | $814,849 | −$206,724 (25.4 %) | −$287,336 (35.3 %) | −$40,323 (5.0 %) | −$302,457 (37.1 %) | $358,038 | $265,427 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | atMaximumOverlayValue | 2016-04-29 | $568,785 | −$136,659 (24.0 %) | −$202,605 (35.6 %) | −$68,750 (12.1 %) | −$228,387 (40.2 %) | $229,651 | $163,202 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | atMaximumDebt | 2026-10-30 | $3,747,631 | −$820,199 (21.9 %) | −$1,101,526 (29.4 %) | −$27,179 (0.7 %) | −$1,111,718 (29.7 %) | $2,049,560 | $1,697,748 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | atMaximumOverlayValue | 2016-04-29 | $568,785 | −$136,659 (24.0 %) | −$202,605 (35.6 %) | −$68,750 (12.1 %) | −$228,387 (40.2 %) | $229,651 | $163,202 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | atMaximumDebt | 2025-10-20 | $3,224,320 | −$717,758 (22.3 %) | −$975,122 (30.2 %) | −$65,031 (2.0 %) | −$999,509 (31.0 %) | $1,704,385 | $1,392,129 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | atMaximumOverlayValue | 2020-03-17 | $929,727 | −$216,336 (23.3 %) | −$305,650 (32.9 %) | −$58,826 (6.3 %) | −$327,710 (35.2 %) | $437,093 | $338,138 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | atMaximumDebt | 2025-10-08 | $3,186,653 | −$719,468 (22.6 %) | −$974,190 (30.6 %) | −$54,653 (1.7 %) | −$994,685 (31.2 %) | $1,672,568 | $1,360,929 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | atMaximumOverlayValue | 2025-10-16 | $3,118,085 | −$707,193 (22.7 %) | −$960,816 (30.8 %) | −$63,880 (2.1 %) | −$984,771 (31.6 %) | $1,620,484 | $1,312,785 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | atMaximumDebt | 2026-10-30 | $3,598,400 | −$820,094 (22.8 %) | −$1,101,262 (30.6 %) | −$26,756 (0.7 %) | −$1,111,296 (30.9 %) | $1,900,909 | $1,549,192 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | atMaximumOverlayValue | 2020-03-17 | $890,615 | −$216,661 (24.3 %) | −$306,462 (34.4 %) | −$60,125 (6.8 %) | −$329,009 (36.9 %) | $396,194 | $296,947 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | atMaximumDebt | 2024-04-12 | $2,153,125 | −$487,097 (22.6 %) | −$664,308 (30.9 %) | −$49,426 (2.3 %) | −$682,843 (31.7 %) | $1,115,044 | $901,900 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | atMaximumOverlayValue | 2020-03-17 | $890,615 | −$216,661 (24.3 %) | −$306,462 (34.4 %) | −$60,125 (6.8 %) | −$329,009 (36.9 %) | $396,194 | $296,947 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | atMaximumDebt | 2023-04-18 | $1,641,533 | −$369,359 (22.5 %) | −$507,613 (30.9 %) | −$50,057 (3.0 %) | −$526,384 (32.1 %) | $843,078 | $679,836 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | atMaximumOverlayValue | 2020-03-17 | $935,906 | −$216,661 (23.2 %) | −$306,462 (32.7 %) | −$60,125 (6.4 %) | −$329,009 (35.1 %) | $441,485 | $342,238 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | atMaximumDebt | 2019-02-28 | $879,119 | −$213,504 (24.3 %) | −$298,181 (33.9 %) | −$48,376 (5.5 %) | −$316,322 (36.0 %) | $402,591 | $306,468 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | atMaximumOverlayValue | 2020-03-17 | $898,139 | −$216,661 (24.1 %) | −$306,462 (34.1 %) | −$60,125 (6.7 %) | −$329,009 (36.6 %) | $403,718 | $304,471 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | atMaximumDebt | 2024-04-12 | $2,184,626 | −$487,518 (22.3 %) | −$665,361 (30.5 %) | −$51,111 (2.3 %) | −$684,528 (31.3 %) | $1,144,228 | $930,706 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | atMaximumOverlayValue | 2020-03-17 | $898,139 | −$216,661 (24.1 %) | −$306,462 (34.1 %) | −$60,125 (6.7 %) | −$329,009 (36.6 %) | $403,718 | $304,471 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | atMaximumDebt | 2024-04-12 | $2,176,904 | −$487,097 (22.4 %) | −$664,308 (30.5 %) | −$49,426 (2.3 %) | −$682,843 (31.4 %) | $1,138,822 | $925,679 |

## M. Distributions the overlay lots would have been entitled to (report-only, PROTOCOL §15.7; never added to the trading results)

| Scenario | Lot ex-date events | Total cash |
|---|---:|---:|
| S1 N/original: `N/original (VGT D1 + GDX D1 + VGT Growth)` | 20 | $8,364 |
| S2 New L0: `New L0` | 19 | $8,133 |
| S3 ablation: `control: N/original GDX D1 (ablation)` | 3 | $3,818 |
| S4 D: `C24/D/refine/D.D1/R103#1 profit` (primary) | 2 | $2,253 |
| S5 D: `C24/D/refine/D.B1/R106#2 robust` (D/robust-profit; D/balanced) | 1 | $1,835 |
| S6 D: `C24/D/broad/D.B0/R101#3 balanced` (D/lower-drawdown) | 1 | $290 |
| S7 G: `C24/G/refine/G.h1.s1/R105#1 profit` (primary) | 0 | $0 |
| S8 G: `C24/G/refine/G.h2.s1/R105#2 robust` (G/robust-profit) | 0 | $0 |
| S9 G: `C24/G/refine/G.h1.s1/R101#2 robust` (G/balanced) | 0 | $0 |
| S10 G: `C24/G/refine/G.h0.s0/R101#3 balanced` (G/lower-drawdown) | 0 | $0 |
| S11 C: `C24/C/pair DF2×GF1` (primary) | 1 | $1,835 |
| S12 C: `C24/C/pair DF2×GF2` (C/robust-profit) | 1 | $1,835 |
| S13 C: `C24/C/pair DF2×GF3` (C/balanced; C/lower-drawdown) | 1 | $1,835 |
| S14 J: `C24/J/refine/J.B1.h0.s0/R102#1 profit` (primary) | 3 | $2,825 |
| S15 J: `C24/J/refine/J.B1.h0.s0/R104#2 robust` (J/robust-profit) | 4 | $4,562 |
| S16 J: `C24/J/refine/J.A1.h2.s1/R104#2 robust` (J/balanced) | 2 | $2,529 |
| S17 J: `C24/J/broad/J.A0.h1.s0/R104#2 robust` (J/lower-drawdown) | 1 | $286 |
| S18 S: `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` (primary) | 3 | $2,996 |
| S19 S: `C24/S/refine/S.C24F2.h1.s0/R104#2 robust` (S/robust-profit) | 2 | $2,475 |
| S20 S: `C24/S/refine/S.C24F2.h2.s0/R105#3 balanced` (S/balanced) | 2 | $2,207 |
| S21 S: `C24/S/broad/S.C24F2.h0.s0/R102#3 balanced` (S/lower-drawdown) | 2 | $2,550 |
| S25 G+: `C24/G/informed/G.h1.s1/R101#1 profit` (primary) | 2 | $2,212 |
| S26 G+: `C24/G/informed/G.h2.s1/R105#1 profit` (G+/robust-profit) | 1 | $1,706 |
| S29 C+: `C24/C+/pair D+F1×G+F2` (primary) | 3 | $3,958 |
| S30 C+: `C24/C+/pair D+F2×G+F2` (C+/robust-profit) | 1 | $1,835 |
| S32 C+: `C24/C+/pair D+F2×G+F1` (C+/lower-drawdown) | 3 | $4,047 |

## N. The ablation against N/original's own GDX D1 book

N/original funded 27 GDX D1 lots (net $223,905); the ablation (both VGT books disabled) funded 47 (net $189,573). 27 lots are identical (same entry date and net); 20 lots exist only in the ablation (net −$34,332); 0 only in N/original. N/original's GDX D1 refusals: D1:GDX refused (occupant G:VGT): 15; D1:GDX refused (occupant D1:VGT): 5. N/original funds its GDX D1 book only when neither VGT book holds the slot; with both VGT books disabled the same book (same signals, shadow lifecycle) is funded at every decision. Lots identified by entry date.

| Lot only in the ablation: entry → exit | Net |
|---|---:|
| 2016-12-02 → 2016-12-15 | −$9,068 |
| 2016-12-16 → 2017-01-11 | $13,716 |
| 2017-01-12 → 2017-01-26 | −$913 |
| 2017-01-27 → 2017-02-21 | $4,151 |
| 2017-02-27 → 2017-03-13 | −$5,102 |
| 2017-03-14 → 2017-04-19 | $5,681 |
| 2017-04-25 → 2017-05-08 | −$6,613 |
| 2017-05-09 → 2017-05-24 | $3,256 |
| 2017-05-25 → 2017-06-12 | −$554 |
| 2017-06-13 → 2017-06-26 | −$1,983 |
| 2017-06-27 → 2017-07-10 | −$8,021 |
| 2021-02-17 → 2021-03-02 | −$6,725 |
| 2021-08-18 → 2021-09-13 | −$265 |
| 2021-09-20 → 2021-10-04 | −$2,971 |
| 2022-06-14 → 2022-06-27 | −$2,753 |
| 2022-06-28 → 2022-07-11 | −$10,070 |
| 2022-07-12 → 2022-07-25 | −$5,578 |
| 2022-10-19 → 2022-11-02 | $2,457 |
| 2024-02-13 → 2024-02-27 | −$560 |
| 2026-05-19 → 2026-06-05 | −$2,415 |

