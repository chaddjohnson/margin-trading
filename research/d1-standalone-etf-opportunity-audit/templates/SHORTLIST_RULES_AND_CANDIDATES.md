# Shortlist — rule and candidates (Stage B)

**Selected (rule v2, written {{shortlist.writtenAt}}):** {{shortlist.selected}}. VGT `primary` is the frozen external
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

- **Rule v1** (`results/shortlist/SHORTLIST-v1-superseded.json`, written 15:35:59.9Z) selected {{shortlist.v1}}.
  **On seeing that output** it was revised to v2 about 96 seconds later, before any candidate run, using only the
  stored census (already read in full). Two changes:
  - S5: v1 gave 2 points only for ≥ 3 profitable years, which rewarded spreading profit over more years — the smooth
    annual curve the brief rules out. This changed **no** selection; it only reordered ETFs below the cut.
  - **Merit slots** were added. This is the whole change in composition: XME, GDX and KBE in; XBI (a B4/B5 member)
    and VPU out; EDV relabelled as the contrast pick. The research question calls for auditing every ETF whose stored
    net beats VGT primary's on the same window; these merit picks are also the ones most exposed to the winner's curse.
- **Merit picks bypass the cluster cap**, so 4 of 11 ETFs are metals/mining (XME, XLB, GDX, SLV) and
  healthcare/biotech, energy, developed ex-US and broad EM are absent. Had the merit picks occupied their clusters, the
  list would have been {{shortlist.counterfactual}}. The list is not revised a third time (another fork after seeing
  two lists); the counterfactual is reported.
- **KBE is a marginal merit pick:** $137,138, only $1,779 above the $135,359 anchor; S3 = 0 (9 of 16 credible draws),
  S6 = 0 (worst trade −$17,568).
- Cluster assignments are judgments (e.g. MTUM as tech-growth; USMV and SPLV as broad rather than defensive). S4's
  survivor status inherits the source's J_nb > 0 condition (a best-trade deduction); no ETF near the cut is affected.
- An independent read-only review challenged the rule and list before the freeze
  (`reviews/methodology-review.md`; dispositions `reviews/METHODOLOGY_DISPOSITIONS.md`). Labels in `SHORTLIST.json`
  were renamed from "core" to "diversity" afterwards (no selection change).

## Every eligible ETF, in rule order

{{shortlist.eligible}}

## Ineligible ETFs

{{shortlist.ineligible}}

## The 19 research phenotypes under test (all research-only, non-deployable)

{{shortlist.phenotypes}}

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
