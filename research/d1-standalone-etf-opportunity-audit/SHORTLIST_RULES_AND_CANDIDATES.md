# Shortlist — rule and candidates (Stage B)

**Selected (rule v2, written 2026-10-27T16:16:08.049Z):** XME (merit), GDX (merit), KBE (merit), SLV (diversity), FXI (diversity), IJH (diversity), XLB (diversity), MTUM (diversity), XHB (diversity), EWW (diversity), EDV (contrast). VGT `primary` is the frozen external
control; B4, B5 and C0 are unchanged benchmarks.

Every input below is a **stored** final-window source figure (T-train, 2016-01-04 → 2023-12-29) or the period-correct
fold training statuses; no run of this study entered the rule. The full record of every symbol — grades, inputs,
missing fields, reason, candidate ids, evidence cutoffs — is `SHORTLIST.json`.

## The rule (PROTOCOL.md §5)

**Gates:** G1 the stored representative is credible (net > 0 at 5 bps and 11%, minute DD ≤ $35,000, trades ≥ 7);
G2 its stored neighbourhood has ≥ 8 of 16 credible draws. The source's survivor status is not a gate (its J_s score
deducts the best trade). **Slot exclusions** (scored, never placed): VGT (control instrument) and SMH
(semiconductor). **Grades** 0/1/2 — anchors are the sealed same-window VGT primary control ($135,359.04 net; 917 held
days):

| Grade | 2 | 1 |
|---|---|---|
| S1 merit (net ÷ VGT primary's) | ≥ 0.75 | ≥ 0.5 |
| S2 efficiency (net per occupied day ÷ VGT primary's $147.61) | ≥ 1.0 | ≥ 0.75 |
| S3 resilience (stored neighbourhood credible share) | ≥ 15/16 | ≥ 12/16 |
| S4 persistence (survivor windows of fold-a, fold-b, final) | 3 | 2 |
| S5 breadth (exit years with ≥ $10,000 net) | ≥ 2 | 1 |
| S6 downside (minute DD; worst trade) | ≤ $20,000; ≥ −$7,500 | ≤ $27,500; ≥ −$10,000 |

**Selection:** order by score, net, symbol → merit slots (net ≥ VGT primary's same-window net; they bypass the
cluster cap) → diversity slots (at most one per predeclared exposure cluster) to 10 → a sparse slot (< 10 trades) and
a contrast slot (rates/defensive) only if missing → at most 12 ETFs; per ETF its representative and source
`alternative-1`. VGT's own final-window research representative is added as a **procedure-matched control** (never a
candidate).

**Why these choices.** D1's payoff is a fat right tail, so no grade or gate uses top-trade concentration (reported in
the last data column, never used). Neighbourhood breadth (S3), period-correct persistence (S4) and downside (S6)
reward evidence and tail control, not smoothness; S5 only asks for profit in more than one period. The merit slots
guarantee that every ETF whose stored record beats the control's on the same window is audited; the clusters stop the
rest of the list from being one exposure.

### Rule history and limits (disclosed)

- **Rule v1** (`results/shortlist/SHORTLIST-v1-superseded.json`, written 15:35:59.9Z) selected SLV, FXI, IJH, XLB, MTUM, XHB, EWW, XBI, EDV, VPU.
  **On seeing that output** it was revised to v2 about 96 seconds later, before any candidate run, using only the
  stored census (already read in full). Two changes:
  - S5: v1 gave 2 points only for ≥ 3 profitable years, which rewarded spreading profit over more years — the smooth
    annual curve the brief rules out. This changed **no** selection; it only reordered ETFs below the cut.
  - **Merit slots** were added. This is the whole change in composition: XME, GDX and KBE in; XBI (a B4/B5 member)
    and VPU out; EDV relabelled as the contrast pick. The research question calls for auditing every ETF whose stored
    net beats VGT primary's on the same window; these merit picks are also the ones most exposed to the winner's curse.
- **Merit picks bypass the cluster cap**, so 4 of 11 ETFs are metals/mining (XME, XLB, GDX, SLV) and
  healthcare/biotech, energy, developed ex-US and broad EM are absent. Had the merit picks occupied their clusters, the
  list would have been XME, GDX, KBE, FXI, IJH, MTUM, XHB, EWW, XBI, EDV. The list is not revised a third time (another fork after seeing
  two lists); the counterfactual is reported.
- **KBE is a marginal merit pick:** $137,138, only $1,779 above the $135,359 anchor; S3 = 0 (9 of 16 credible draws),
  S6 = 0 (worst trade −$17,568).
- Cluster assignments are judgments (e.g. MTUM as tech-growth; USMV and SPLV as broad rather than defensive). S4's
  survivor status inherits the source's J_nb > 0 condition (a best-trade deduction); no ETF near the cut is affected.
- An independent read-only review challenged the rule and list before the freeze
  (`reviews/methodology-review.md`; dispositions `reviews/METHODOLOGY_DISPOSITIONS.md`). Labels in `SHORTLIST.json`
  were renamed from "core" to "diversity" afterwards (no selection change).

## Every eligible ETF, in rule order

| order | ETF | cluster | S1 S2 S3 S4 S5 S6 | score | net | trades | nb credible | survivor windows | years ≥ $10k | min. DD | worst | top-3 share (not used) | decision | reason |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | SLV | precious-metals | 2 2 2 2 2 2 | 12 | $103,793 | 25 | 100.0% | fold-a:survivor* fold-b:survivor final:survivor | 3 | $17,597 | −$5,194 | 49% | diversity | diversity slot 4: order 1, the highest-ordered eligible non-merit ETF of cluster precious-metals |
| 2 | FXI | em-asia | 1 2 2 2 2 2 | 11 | $89,172 | 8 | 93.8% | fold-a:survivor fold-b:survivor final:survivor* | 3 | $16,702 | −$956 | 84% | diversity | diversity slot 5: order 2, the highest-ordered eligible non-merit ETF of cluster em-asia |
| 3 | IJH | us-broad-size-factor | 1 2 2 2 2 2 | 11 | $87,166 | 24 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $17,275 | −$3,285 | 46% | diversity | diversity slot 6: order 3, the highest-ordered eligible non-merit ETF of cluster us-broad-size-factor |
| 4 | XLB | materials-metals-mining | 1 2 2 2 2 2 | 11 | $84,008 | 18 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $11,613 | −$358 | 40% | diversity | diversity slot 7: order 4, the highest-ordered eligible non-merit ETF of cluster materials-metals-mining |
| 5 | MTUM | us-tech-growth | 1 2 2 2 2 2 | 11 | $69,881 | 16 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $17,614 | −$856 | 50% | diversity | diversity slot 8: order 5, the highest-ordered eligible non-merit ETF of cluster us-tech-growth |
| 6 | XME | materials-metals-mining | 2 2 2 2 2 0 | 10 | $216,940 | 20 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $21,845 | −$14,776 | 47% | merit | merit slot: stored final net 216940 ≥ VGT primary's same-window 135359 (order 6) |
| 7 | GDX | precious-metals | 2 2 1 2 2 1 | 10 | $185,534 | 54 | 81.3% | fold-a:survivor fold-b:survivor final:survivor | 5 | $26,433 | −$6,574 | 47% | merit | merit slot: stored final net 185534 ≥ VGT primary's same-window 135359 (order 7) |
| 8 | XHB | us-cyclical | 2 1 2 2 2 1 | 10 | $134,145 | 20 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 5 | $23,493 | −$4,742 | 38% | diversity | diversity slot 9: order 8, the highest-ordered eligible non-merit ETF of cluster us-cyclical |
| 9 | VGT | us-tech-growth | 2 1 2 2 2 1 | 10 | $125,218 | 17 | 100.0% | fold-a:survivor* fold-b:survivor* final:survivor | 4 | $22,889 | −$4,617 | 74% | excluded from slots | scored (order 9) but excluded from slots: the control instrument: its research representative is an unregistered alternative VGT vector; VGT primary is the external control |
| 10 | SMH | us-tech-growth | 2 2 2 2 2 0 | 10 | $119,866 | 38 | 93.8% | fold-a:survivor fold-b:survivor final:survivor | 3 | $20,957 | −$12,274 | 34% | excluded from slots | scored (order 10) but excluded from slots: semiconductor fund: research-only, not presumed eligible for the user’s holdings |
| 11 | XLK | us-tech-growth | 2 1 2 2 2 1 | 10 | $117,501 | 22 | 100.0% | fold-a:survivor fold-b:survivor* final:survivor | 3 | $26,601 | −$9,322 | 81% | not selected | order 11: cluster us-tech-growth already represented by MTUM |
| 12 | IYT | us-cyclical | 2 2 0 2 2 2 | 10 | $115,869 | 34 | 68.8% | fold-a:survivor* fold-b:survivor final:survivor | 4 | $15,204 | −$6,276 | 60% | not selected | order 12: cluster us-cyclical already represented by XHB |
| 13 | EWW | em-latam | 2 1 2 2 2 1 | 10 | $104,277 | 38 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 4 | $22,812 | −$7,025 | 43% | diversity | diversity slot 10: order 13, the highest-ordered eligible non-merit ETF of cluster em-latam |
| 14 | XBI | us-healthcare-biotech | 1 2 2 2 2 1 | 10 | $85,550 | 30 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $23,477 | −$2,587 | 40% | not selected | order 14: the 10 merit and diversity slots were filled |
| 15 | QUAL | us-tech-growth | 1 1 2 2 2 2 | 10 | $76,588 | 18 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 4 | $15,460 | −$1,573 | 54% | not selected | order 15: the 10 merit and diversity slots were filled |
| 16 | IJR | us-broad-size-factor | 1 2 2 2 2 1 | 10 | $76,567 | 16 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $17,406 | −$7,778 | 50% | not selected | order 16: the 10 merit and diversity slots were filled |
| 17 | VIG | us-broad-size-factor | 0 2 2 2 2 2 | 10 | $66,906 | 17 | 93.8% | fold-a:survivor fold-b:survivor final:survivor | 2 | $15,378 | −$2,188 | 52% | not selected | order 17: the 10 merit and diversity slots were filled |
| 18 | EDV | rates-credit | 0 2 2 2 2 2 | 10 | $62,727 | 10 | 100.0% | fold-a:survivor fold-b:survivor* final:survivor | 3 | $11,589 | −$1,150 | 82% | contrast | contrast slot: the highest-ordered eligible ETF of rates-credit / us-defensive with full neighbourhood resilience and persistence (order 18) |
| 19 | VOOG | us-tech-growth | 0 2 2 2 2 2 | 10 | $59,474 | 16 | 100.0% | fold-a:survivor* fold-b:survivor final:survivor | 2 | $9,220 | −$3,150 | 51% | not selected | order 19: the 10 merit and diversity slots were filled |
| 20 | RSP | us-broad-size-factor | 0 2 2 2 2 2 | 10 | $55,705 | 12 | 100.0% | fold-a:survivor* fold-b:survivor* final:survivor | 2 | $16,316 | $267 | 72% | not selected | order 20: the 10 merit and diversity slots were filled |
| 21 | VPU | us-defensive | 0 2 2 2 2 2 | 10 | $53,774 | 11 | 100.0% | fold-a:survivor* fold-b:survivor final:survivor | 2 | $17,828 | −$7,250 | 68% | not selected | order 21: the 10 merit and diversity slots were filled |
| 22 | TLT | rates-credit | 0 2 2 2 2 2 | 10 | $44,990 | 10 | 100.0% | fold-a:survivor* fold-b:survivor* final:survivor | 3 | $7,784 | −$931 | 88% | not selected | order 22: the 10 merit and diversity slots were filled |
| 23 | XLU | us-defensive | 0 2 2 2 2 2 | 10 | $40,429 | 17 | 100.0% | fold-a:survivor* fold-b:survivor* final:survivor | 2 | $19,990 | −$2,250 | 48% | not selected | order 23: the 10 merit and diversity slots were filled |
| 24 | XLI | us-cyclical | 1 2 0 2 2 2 | 9 | $95,759 | 12 | 68.8% | fold-a:survivor* fold-b:survivor* final:survivor | 3 | $17,044 | −$1,878 | 56% | not selected | order 24: the 10 merit and diversity slots were filled |
| 25 | IBB | us-healthcare-biotech | 1 1 1 2 2 2 | 9 | $84,102 | 12 | 87.5% | fold-a:survivor fold-b:survivor final:survivor | 3 | $17,098 | −$1,469 | 70% | not selected | order 25: the 10 merit and diversity slots were filled |
| 26 | IWN | us-broad-size-factor | 1 2 1 1 2 2 | 9 | $74,268 | 19 | 87.5% | fold-a:screened-down fold-b:survivor final:survivor | 2 | $16,065 | −$6,630 | 59% | not selected | order 26: the 10 merit and diversity slots were filled |
| 27 | EFA | developed-ex-us | 0 2 2 2 1 2 | 9 | $61,194 | 17 | 100.0% | fold-a:survivor* fold-b:survivor* final:survivor | 1 | $10,220 | −$3,234 | 54% | not selected | order 27: the 10 merit and diversity slots were filled |
| 28 | KBE | us-financials | 2 2 0 2 2 0 | 8 | $137,138 | 69 | 56.3% | fold-a:survivor fold-b:survivor final:survivor | 5 | $25,344 | −$17,568 | 40% | merit | merit slot: stored final net 137138 ≥ VGT primary's same-window 135359 (order 28) |
| 29 | IGV | us-tech-growth | 2 1 1 2 2 0 | 8 | $121,016 | 38 | 75.0% | fold-a:survivor fold-b:survivor final:survivor | 5 | $28,982 | −$11,764 | 34% | not selected | order 29: the 10 merit and diversity slots were filled |
| 30 | XRT | us-cyclical | 1 2 1 2 2 0 | 8 | $93,378 | 41 | 87.5% | fold-a:survivor* fold-b:survivor final:survivor | 3 | $25,279 | −$10,765 | 37% | not selected | order 30: the 10 merit and diversity slots were filled |
| 31 | XLF | us-financials | 1 1 0 2 2 2 | 8 | $83,732 | 28 | 62.5% | fold-a:survivor fold-b:survivor final:survivor | 4 | $17,653 | −$6,488 | 37% | not selected | order 31: the 10 merit and diversity slots were filled |
| 32 | XLY | us-cyclical | 1 1 2 2 2 0 | 8 | $81,010 | 16 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 3 | $23,986 | −$12,081 | 58% | not selected | order 32: the 10 merit and diversity slots were filled |
| 33 | EWY | em-asia | 0 2 2 2 2 0 | 8 | $65,435 | 15 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 2 | $28,263 | −$6,982 | 75% | not selected | order 33: the 10 merit and diversity slots were filled |
| 34 | IWD | us-broad-size-factor | 0 2 1 2 1 2 | 8 | $54,865 | 13 | 87.5% | fold-a:survivor* fold-b:survivor final:survivor | 1 | $16,550 | −$1,217 | 55% | not selected | order 34: the 10 merit and diversity slots were filled |
| 35 | USMV | us-broad-size-factor | 0 0 2 2 2 2 | 8 | $48,547 | 25 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 2 | $18,134 | −$2,673 | 56% | not selected | order 35: the 10 merit and diversity slots were filled |
| 36 | IAU | precious-metals | 0 0 2 2 2 2 | 8 | $40,014 | 8 | 100.0% | fold-a:survivor* fold-b:survivor final:survivor* | 2 | $15,497 | −$2,346 | 109% | not selected | order 36: the 10 merit and diversity slots were filled |
| 37 | GLD | precious-metals | 0 0 2 2 2 2 | 8 | $36,901 | 20 | 93.8% | fold-a:survivor* fold-b:survivor final:survivor | 2 | $16,127 | −$5,820 | 88% | not selected | order 37: the 10 merit and diversity slots were filled |
| 38 | EMB | rates-credit | 0 0 2 2 2 2 | 8 | $26,319 | 8 | 93.8% | fold-a:survivor* fold-b:survivor* final:survivor* | 2 | $11,763 | −$179 | 76% | not selected | order 38: the 10 merit and diversity slots were filled |
| 39 | ILF | em-latam | 1 2 0 2 2 0 | 7 | $92,843 | 40 | 56.3% | fold-a:survivor fold-b:survivor final:survivor | 4 | $28,455 | −$8,253 | 50% | not selected | order 39: the 10 merit and diversity slots were filled |
| 40 | XLP | us-defensive | 0 0 2 2 2 1 | 7 | $51,984 | 18 | 100.0% | fold-a:survivor fold-b:survivor final:survivor | 2 | $16,180 | −$9,264 | 52% | not selected | order 40: the 10 merit and diversity slots were filled |
| 41 | HYG | rates-credit | 0 1 2 1 1 2 | 7 | $14,795 | 7 | 100.0% | fold-a:survivor* fold-b:screened-down final:survivor* | 1 | $6,913 | −$1,185 | 118% | not selected | order 41: the 10 merit and diversity slots were filled |
| 42 | XLV | us-healthcare-biotech | 0 0 2 2 2 0 | 6 | $64,887 | 25 | 93.8% | fold-a:survivor fold-b:survivor final:survivor | 4 | $28,314 | −$5,938 | 52% | not selected | order 42: the 10 merit and diversity slots were filled |
| 43 | KIE | us-financials | 0 2 2 1 1 0 | 6 | $61,266 | 18 | 100.0% | fold-a:screened-down fold-b:survivor final:survivor | 1 | $17,348 | −$10,664 | 68% | not selected | order 43: the 10 merit and diversity slots were filled |
| 44 | EWJ | developed-ex-us | 0 0 2 2 2 0 | 6 | $49,590 | 13 | 100.0% | fold-a:survivor* fold-b:survivor final:survivor | 2 | $14,871 | −$10,123 | 74% | not selected | order 44: the 10 merit and diversity slots were filled |
| 45 | IEMG | em-broad | 0 0 2 1 2 1 | 6 | $38,651 | 25 | 100.0% | fold-a:survivor* fold-b:screened-down final:survivor | 2 | $20,067 | −$9,093 | 77% | not selected | order 45: the 10 merit and diversity slots were filled |
| 46 | EEM | em-broad | 0 1 2 1 1 1 | 6 | $36,721 | 18 | 100.0% | fold-a:screened-down fold-b:survivor final:survivor | 1 | $22,052 | −$6,510 | 69% | not selected | order 46: the 10 merit and diversity slots were filled |
| 47 | INDA | em-asia | 1 0 1 1 2 0 | 5 | $74,647 | 21 | 87.5% | fold-a:screened-down fold-b:survivor final:survivor | 2 | $33,086 | −$5,786 | 55% | not selected | order 47: the 10 merit and diversity slots were filled |
| 48 | IWM | us-broad-size-factor | 1 0 0 2 2 0 | 5 | $68,670 | 38 | 62.5% | fold-a:survivor* fold-b:survivor final:survivor | 3 | $25,769 | −$13,718 | 52% | not selected | order 48: the 10 merit and diversity slots were filled |
| 49 | VGK | developed-ex-us | 0 0 2 1 2 0 | 5 | $58,504 | 38 | 93.8% | fold-a:survivor* fold-b:survivor* final:screened-down | 2 | $21,241 | −$11,760 | 70% | not selected | order 49: the 10 merit and diversity slots were filled |
| 50 | SPLV | us-broad-size-factor | 0 0 2 0 2 1 | 5 | $45,386 | 20 | 100.0% | fold-a:screened-down fold-b:screened-down final:screened-down | 2 | $21,987 | −$4,299 | 65% | not selected | order 50: the 10 merit and diversity slots were filled |
| 51 | IEF | rates-credit | 0 0 1 0 0 2 | 3 | $2,604 | 8 | 81.3% | fold-a:rejected fold-b:rejected final:screened-down | 0 | $6,037 | −$694 | 196% | not selected | order 51: the 10 merit and diversity slots were filled |

## Ineligible ETFs

| ETF | cluster | net | trades | nb credible | statuses | gate failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| AGG | rates-credit | $726 | 7 | 12.5% | fold-a:rejected fold-b:rejected final:screened-down | G2: stored neighbourhood credible share 0.1250 < 0.5 |
| DBC | broad-commodities | $101,030 | 7 | 12.5% | fold-a:survivor* fold-b:survivor final:screened-down | G2: stored neighbourhood credible share 0.1250 < 0.5 |
| EWZ | em-latam | $111,647 | 48 | 31.3% | fold-a:screened-down fold-b:survivor final:survivor | G2: stored neighbourhood credible share 0.3125 < 0.5 |
| IWF | us-tech-growth | $117,211 | 50 | 37.5% | fold-a:survivor fold-b:survivor final:survivor | G2: stored neighbourhood credible share 0.3750 < 0.5 |
| KRE | us-financials | $109,514 | 71 | 25.0% | fold-a:survivor fold-b:survivor final:survivor | G2: stored neighbourhood credible share 0.2500 < 0.5 |
| LQD | rates-credit | $13,957 | 7 | 37.5% | fold-a:survivor* fold-b:survivor* final:survivor* | G2: stored neighbourhood credible share 0.3750 < 0.5 |
| SHY | rates-credit | n/a | — | n/a | fold-a:rejected fold-b:rejected final:rejected | G1: no representative (no trade in any evaluated vector: unrankable) |
| TIP | rates-credit | $8,208 | 2 | n/a | fold-a:rejected fold-b:rejected final:rejected | G1: representative not credible (trades 2 vs ≥ 7, net 8208, minute DD 5741 vs ≤ 35000); G2: no stored neighbourhood |
| XLE | energy | $123,315 | 26 | 25.0% | fold-a:screened-down fold-b:survivor final:survivor | G2: stored neighbourhood credible share 0.2500 < 0.5 |
| XOP | energy | $16,473 | 13 | 37.5% | fold-a:screened-down fold-b:survivor final:screened-down | G2: stored neighbourhood credible share 0.3750 < 0.5 |

## The 19 research phenotypes under test (all research-only, non-deployable)

| Phenotype | source candidate | vector | file sha256 |
| --- | ---: | ---: | ---: |
| XME:representative | d1-cc14abc681 | X 27.7% Y 0.5% L 25 stop 7.5% hold 4 buffer 2.7% P 9.7% W 193 | `325063ab442a…` |
| XME:alternative-1 | d1-71dc55bb80 | X 23.4% Y 0.9% L 175 stop 3.5% hold 13 buffer 0.2% P 14.2% W 139 | `c97ca1b24d88…` |
| GDX:representative | d1-4f034dc898 | X 27.8% Y 1.1% L 231 stop 7.6% hold 3 buffer 2.2% P 7.0% W 127 | `2a3f468a4c9f…` |
| GDX:alternative-1 | d1-01537c2fa7 | X 27.8% Y 1.1% L 206 stop 7.6% hold 3 buffer 0.7% P 6.0% W 127 | `8e3532ba3743…` |
| KBE:representative | d1-c2ba0513b9 | X 25.5% Y 3.2% L 208 stop 3.9% hold 4 buffer 2.6% P 4.6% W 187 | `8845f74eb16b…` |
| KBE:alternative-1 | d1-964cebdbd4 | X 27.0% Y 0.2% L 205 stop 3.8% hold 12 buffer 0.5% P 8.1% W 52 | `3128fa0cc585…` |
| SLV:representative | d1-720fd990da | X 23.7% Y 3.6% L 129 stop 3.2% hold 24 buffer 0.5% P 4.7% W 159 | `2f45e892a7fa…` |
| FXI:representative | d1-f50bb16a72 | X 26.2% Y 1.1% L 58 stop 7.6% hold 9 buffer 2.8% P 16.3% W 149 | `af9eadf83e3e…` |
| FXI:alternative-1 | d1-f6c8d51e78 | X 26.6% Y 0.7% L 58 stop 7.7% hold 18 buffer 3.0% P 10.1% W 151 | `d1f6c747cfa2…` |
| IJH:representative | d1-b68c1f3d58 | X 23.6% Y 0.5% L 165 stop 3.1% hold 11 buffer 2.4% P 7.1% W 104 | `f5d99f4ad0e6…` |
| IJH:alternative-1 | d1-be013157d7 | X 14.1% Y 0.4% L 159 stop 3.8% hold 5 buffer 2.1% P 14.1% W 20 | `875c2ede9191…` |
| XLB:representative | d1-46f3aab0db | X 25.3% Y 0.5% L 127 stop 3.7% hold 25 buffer 2.2% P 4.1% W 42 | `9cd25b520c39…` |
| MTUM:representative | d1-302ce96a91 | X 20.5% Y 0.9% L 75 stop 3.7% hold 27 buffer 1.4% P 12.5% W 162 | `d8f6575d85b4…` |
| MTUM:alternative-1 | d1-263cde0253 | X 20.1% Y 1.0% L 103 stop 3.9% hold 12 buffer 0.7% P 5.2% W 192 | `e6a957c92d3e…` |
| XHB:representative | d1-a3f6464845 | X 26.7% Y 4.7% L 235 stop 6.7% hold 28 buffer 1.3% P 4.9% W 27 | `967d95342f8a…` |
| EWW:representative | d1-e749c2f782 | X 19.1% Y 1.3% L 178 stop 4.0% hold 26 buffer 2.6% P 15.3% W 187 | `fae3143358c7…` |
| EWW:alternative-1 | d1-558d891577 | X 19.1% Y 1.0% L 173 stop 3.0% hold 24 buffer 2.6% P 15.8% W 177 | `e7c8f6b41d2b…` |
| EDV:representative | d1-87774653fc | X 20.7% Y 3.8% L 41 stop 5.1% hold 25 buffer 5.4% P 8.0% W 165 | `41713c4e66f5…` |
| EDV:alternative-1 | d1-1f420fa0a5 | X 23.3% Y 2.3% L 99 stop 3.8% hold 11 buffer 4.9% P 11.9% W 177 | `71ab31bf4637…` |

## Previously promising ETFs that are not shortlisted, and why

- **KRE ($110k, a B4/B5 member), XLE ($123k), EWZ ($112k):** fail G2 with only 4, 4 and 5 of 16 credible draws —
  yet **every one of their 16 stored draws had J_s > 0** (profitable even after removing the best trade; minimum J_s
  $5,072, $15,306 and $15,963). Their non-credible draws must have breached the $35,000 minute-DD ceiling (or, less
  plausibly, had fewer than 7 trades); the stored record does not say which. They are **drawdown-fragile
  neighbourhoods, not sharp profit optima**. Excluding XLE leaves energy unrepresented.
- **IWF ($117k), DBC ($101k):** fail G2 with 6 and 2 of 16 credible draws; IWF has draws with negative J_s and DBC a
  negative median J_s — these do look like sharp optima.
- **SMH ($120k):** semiconductor fund, excluded from slots by the user's holdings constraint (it would have ranked 10th).
- **VGT's research representative ($125k):** the control instrument; VGT primary is audited instead.
- **XLK ($118k), IYT ($116k), IGV ($121k), XRT ($93k), XBI ($86k, a B4/B5 member), QUAL, IJR:** eligible but below the
  ten merit + diversity slots or behind a higher-ordered ETF of the same cluster (reasons in the table).

## Independent review and freeze

The rule and this list were reviewed read-only before the freeze (`reviews/methodology-review.md`, dispositions in
`reviews/METHODOLOGY_DISPOSITIONS.md`). `PROTOCOL_FREEZE.json` binds `SHORTLIST.json`, this file, the census and the
outcome-defining code; any change after it is an amendment and cannot promote a replacement on new results.
