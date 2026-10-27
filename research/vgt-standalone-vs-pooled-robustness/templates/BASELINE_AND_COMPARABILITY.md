<!-- Rendered by `npm run vgt-robustness -- report` from templates/BASELINE_AND_COMPARABILITY.md and results/analysis.json; edit the template, not this file. -->
# Baseline reproduction and comparability

**Status: all {{v.baselineChecks}} baseline checks pass.** Every frozen configuration was reproduced exactly before
any comparison was interpreted: the anchors, the frozen controls, the existing standalone CLI and the prior audit's
stored records. Window {{v.window}} ({{v.sessions}} sessions, continuous `all`, arming 2017-06-15). The whole window was
inspected while these strategies were selected. **Every figure below is retrospective.**

## 1. The anchors

Each pool's anchor value from the brief is shown in parentheses. Fixed = one $100,000 lot at 5 bps per side and 11%
simple interest. Portfolio = the $300,000 60/40 VOOG/VGT core, borrowing 20% of marked equity per funded lot, with the
frozen dividend convention.

{{t.anchors}}

S has no anchor in the brief. Its figures are equal, in every summary field, to the frozen control **B1 ("VGT D1
alone, primary")** in `research/joint-16-etf-d1/results/controls/controls.json`. That control exists at 0, 2, 5 and
10 bps, and this study used all four in both modes (§3).

## 2. Every baseline check

The record is `results/baseline/baseline.json`, produced by `npm run vgt-robustness -- baseline`.

The first run, before the protocol freeze, had 47 checks and stored S's two base records. Every rerun adds two checks:
it recomputes those records and requires them to equal the stored ones, rather than appending new ones.

{{t.baselineChecks}}

Two further checks ran inside `analyze`:
- all {{v.reexecutions}} pooled path re-executions (§4 of the protocol) equal their stored prior-audit records in every
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
- B4 funds {{v.B4.vgtLots}} of the 21; {{v.B4.blocked}} are blocked by another book;
- B5 funds {{v.B5.vgtLots}}; {{v.B5.blocked}} are blocked.

The same holds for every perturbed VGT vector: in all 64 matched samples, the pool's funded VGT lots are a subset of
the standalone's lots for the same vector (`PARAMETER_STABILITY.md`).

**What differs** is only which other books compete for the one slot.

- Before 2020 no other book funded a lot, so S, B4 and B5 earn exactly the same through 2019
  (`TRADES_YEARS_AND_REGIMES.md`).
- **Fixed mode:** VGT signals blocked in B4 had S-net {{v.B4.blockedNet}}. The other books' lots that held the slot
  earned {{v.B4.holderNet}}. In B5 the figures are {{v.B5.blockedNet}} against {{v.B5.holderNet}}.
- **Portfolio mode:** S's overlay adds VGT exposure on top of the core's VGT, while the pools spread part of their
  borrowing over XBI, XRT, KRE and GDX (`PORTFOLIO_RISK_AND_CAPITAL_EFFICIENCY.md`).

**Refused signals at the frozen point (fixed):**

| | Refusals | VGT signals refused | Other books refused because VGT held the slot |
|---|---:|---:|---:|
| B4 | {{v.B4.refusalsTotal}} | {{v.B4.vgtRefused}} | {{v.B4.refusedByVgt}} |
| B5 | {{v.B5.refusalsTotal}} | {{v.B5.vgtRefused}} | {{v.B5.refusedByVgt}} |

## 4. S's 21 lots in the three structures (fixed, base)

"Blocked" means the pool's slot was held by the named lot when the VGT decision came. Nets are at $100,000. This is
descriptive displacement accounting, not a counterfactual.

{{t.frozenPaths}}

## 5. Comparability rules applied in every report

- Fixed-pool figures are dollars on a constant $100,000 slot. Their drawdown percentages are % of $100,000. Portfolio
  figures are compounding equity, and their drawdowns are running-peak % of marked equity. The two are never
  interchanged.
- **Daily-close** and **minute-sampled** drawdowns are labelled. Minute-sampled is never smaller.
- The pools' figures come from the prior audit's stored records (`research/b4-b5-robustness-audit/results/`), which are
  reproduced above. Only S was simulated fresh, plus the pooled path re-executions verified equal to those records.
- Nothing after 2026-10-13 was read. No variant was written to `config/`. The prospective B4/B5 freeze is untouched
  and still verifies (`npm run vgt-robustness -- verify`).
