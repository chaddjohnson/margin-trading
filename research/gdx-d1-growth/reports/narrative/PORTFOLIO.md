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
