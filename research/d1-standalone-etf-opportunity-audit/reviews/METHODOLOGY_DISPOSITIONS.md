# Dispositions — pre-freeze methodology review

Review: `reviews/methodology-review.md` (independent, read-only; received 2026-10-27T16:07Z). Every item below was
addressed **before the protocol freeze and before any candidate robustness, cost, episode, portfolio or fold run**.
No outcome of a research phenotype existed when these changes were made. A confirmatory read-only check of these
dispositions followed (`reviews/confirmatory-review.md`: ready to freeze, conditional on N1–N5); N1–N5 were applied
before the freeze (last section).

## Critical

| # | Finding | Disposition |
|---|---|---|
| C1 | Flags, standing and capture logic unbound and declared changeable | **Fixed.** The flags, F4/F8 states, the (iii)/(i)/(ii) rule, axes, ties, "stronger" and the ETF rule are pure functions in `standing.ts`; capture definitions in `events.ts`; their inputs in `analysis.ts`. All three, `catalogs.ts` and both test files are bound (`freeze.ts` `boundFiles`). PROTOCOL §11 now leaves only formatting and report text unbound. 13 synthetic standing tests cover every flag threshold, F4 "insufficient", F8 negative / no evidence / hindsight, (iii), ties versus strictly better, both seeds per axis, the procedure-matched control and the ETF rule. F9 uses the 128 pooled samples (each seed reported); the `context.ts` comment was corrected. |
| C2 | No ETF-level rule for two phenotypes | **Fixed** as recommended (PROTOCOL §10, `etfStandingOf`): the representative decides; an ETF-level (i) also needs `alternative-1` (when it exists) not to be (iii); the better of the two never promotes. Multiplicity stated (§2): 19 candidate phenotypes, 11 ETFs, two controls. |
| C3 | Exact parity not shown for the tested vectors | **Fixed** as a frozen Stage 3 precondition: `run` executes the base family first and `checkBaseParity` compares every research phenotype (19 + the procedure-matched control) with its stored Stage A record using the `PARITY.json` checks and tolerances, and VGT primary with the sealed control B1; any failure stops; every other family and `analyze` refuse until `BASE_PARITY.json` passes. Run after the freeze (it yields per-lot ledgers, which the stored aggregates do not contain). |

## Major

| # | Finding | Disposition |
|---|---|---|
| M1 | "Captured" measures trade frequency; F4 per episode | **Fixed.** (a) A **dip entry** (decline phase, or ≥ 50% of the episode's depth below its peak) and **dip-captured** (dip entries net > 0) are defined in `events.ts`; captures are broken down by setup (deep / continuation). (b) F4 is computed per **major family** (M = eligible major families with base dip net > 0). (c) F4 is **"insufficient"** when M has fewer than 2 families and blocks (i). (d) The price-only coverage diagnostic is in the bound catalog (40–96%). The catalog itself is bound. The families axis and F1 also use dip families. **Consequence found on the price-only catalog:** catalog v1's chained family rule merged all of 2016–2023 into one family for GDX, XME and SLV; it was replaced by an anchored 126-session trough window (catalog v2; v1 kept as `catalog-v1-superseded.json` and bound; PROTOCOL §7). |
| M2 | No neighbourhood drawdown flag | **Fixed:** **F10** — fewer than 75% of the 128 joint samples with minute DD ≤ $35,000, or their median portfolio max daily DD > 35%; blocks (i). |
| M3 | VGT primary comparison not like-for-like | **Fixed.** (a) The asymmetry is stated in §0 and §14. (b) VGT's final-window research representative (`d1-681c3ac3cc`) is a **procedure-matched control** run through the same battery (research-only, never a candidate). (c) Axes are reported against both controls; "stronger" requires ≥ 2 of 3 against the procedure-matched control too. |
| M4 | F8 asymmetric; zero vs negative | **Fixed.** F8 states: negative (V < 0; blocks), no evidence (no representative, or no lot entered or open in the window; reported, does not block), not assessable (hindsight) for VGT primary. The VGT instrument's period-correct fold representatives are reported as its comparable test. The conditioning of a shortlisted ETF's F8 on selection is disclosed; the 61-ETF cross-section is named the less biased view (§9.3). |
| M5 | Shortlist disclosure inaccurate | **Fixed.** (a) KRE/XLE/EWZ rewritten (all 16 draws J_s > 0; drawdown-fragile; record silent on which condition failed; energy unrepresented). (b) The v1→v2 sequence is described as a reaction to seeing v1, with the exact changes (S5 changed no selection; merit slots changed the composition) and the winner's-curse exposure. (c) Merit picks bypassing clusters is justified and the counterfactual list (XME GDX KBE FXI IJH MTUM XHB EWW XBI EDV) is published; no v3. (d) KBE's marginality stated. |
| M6 | Same rule, different relative sizes | **Fixed by disclosure and binding:** every OAT point and all 128 joint vectors of the 21 phenotypes, with relative shifts and each ETF's realised volatility, are in the bound `results/designs/designs.json`; §6 states the confounding with examples. |
| M7 | Imported modules not covered by the freeze | **Fixed:** `requireFrozen` (used by `run`; `analyze` also) now refuses unless no tracked file outside the study's two folders differs from `b21ed711` except the one `package.json` script and no untracked file exists outside them. The tests, catalog and designs are bound. |
| M8 | Standing comparison loose | **Fixed.** An axis is met only on the pooled 128 **and** each seed; ties count as met but not strictly better; "stronger" needs one strictly better axis. **Common random numbers:** every phenotype's hypercubes now come from one stream (the VGT audit's labels), so samples are paired by relative position (tested); VGT primary's vectors are unchanged. Dip families are reported against eligible families; drawdown and worst lot are reported beside the axes; VGT primary's own standing and its meaning if it is (ii) are predeclared. |
| M9 | Missing bias disclosures | **Fixed:** §0 lists (1) the asymmetric comparison, (2) the source's concentration penalty in J_s/J_nb, (3) the selection-contaminated, coarse 16-draw statistic, (4) survivorship, (5) selection and the winner's curse; T-retro's weakness (procedure designed with 2016–2026 known) is stated. |

## Minor

| # | Disposition |
|---|---|
| 1 | Disclosed (§5): S4 inherits J_nb > 0; no ETF near the cut affected. |
| 2 | Portfolio daily DD is reported with its increment over C0 (`dailyOverC0`). |
| 3 | F5 renamed "winner parameter-dependence"; §8 states that no test shifts entry timing. |
| 4 | Fixed: the reference is the base's episode net if > 0, else the lot's own net (labelled). |
| 5 | Fixed: "armed, no entry" and "not armed" reported separately; the arming check is labelled a deep-path reconstruction; "shallower than X" is marked per episode. |
| 6 | Fixed: family nets count eligible episodes only (`familyNetOf`). |
| 7 | Disclosed (§14; F7 stated prominently if EDV reaches (i)); TLT's rank noted. |
| 8 | An order-of-magnitude distribution estimate for EDV, KBE and XLB will be reported in `PORTFOLIO_AND_CAPITAL_EFFICIENCY.md`. |
| 9 | Fixed: one-book runs store `grid`; pool runs omit it (never `null`). |
| 10 | Fixed: `shortlist` refuses once `PROTOCOL_FREEZE.json` exists (as does `catalog`). |
| 11 | Fixed: the door's comment and `SOURCE_AND_EVIDENCE_BOUNDARIES.md` state that it restricts symbols only; a test checks that `fixed GDX:representative --end 2026-10-13`, `fixed source:final:VGT --end 2024-01-02` and a registry file are refused. |
| 12 | Fixed: one net-per-$1M denominator (occupied days × $100,000) for every configuration; the S2 anchor difference noted (§5); regimes imported from the source context, G13 clipped to 2023-12-29. |
| 13 | Fixed: the source-box label is implemented (`insideSourceBox` per OAT point; e.g. GDX hold −s, XHB stop/hold/L +); context comment corrected; "core" renamed "diversity"; cluster judgments disclosed. |
| 14 | Fixed: `RESEARCH_RECOVERY.md` refreshed with recomputed hashes before the freeze. |
| 15 | The annotation now reports lots and dip families of eligible families; `< 30 lots` is kept but labelled uninformative. |

## Confirmatory review (N1–N5), all applied before the freeze

| # | Finding | Disposition |
|---|---|---|
| N1 | Under catalog v2 (126-session families) F1 and the families axis count legs of one event as independent | **Applied.** `independentOf`/`anchorOf` (`events.ts`): the base dip families whose anchor troughs are ≥ 252 sessions apart, greedy and chronological. F1's "≥ 2" and the families axis use this count; the 126-session families remain for F4 and the tables. PROTOCOL §7 discloses that 126 was chosen after seeing v1's price-only counts. Tested. |
| N2 | "Stronger" possible with no period-correct fold evidence | **Applied.** "Stronger" also requires `temporalSupport`: at least one fold representative with V > 0 and none negative. "No evidence" still does not block (i); the F8 state is shown beside every (i). Tested. |
| N3 | Capture definitions untested | **Applied.** Tests for a decline-phase dip entry, rebound entries on both sides of (and on) the 50%-depth line, dip capture versus a profitable high re-entry and a losing dip, family nets excluding an ineligible episode, coverage, and the independent-event count (38 study tests). |
| N4 | Stale `events.ts` header | **Applied:** the header now describes the anchored families, the dip capture and the independent-event count. |
| N5 | Fold boundary parity checked only in `verify` | **Applied:** `analyze` throws before using any fold figure if any fold run's mark at its search-end close differs from the stored Stage A net. |
