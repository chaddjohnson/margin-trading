# Decision register — risk-envelope pilot NL0-REP 1.0.0 (RESOLVED)

**Provenance:** every decision below was taken by the user in the original Margin Trading conversation and handed to
Claude Code as the authorization `brief/BRIEF.md` (sha256 `5a9dfe8f68d227be2dd429508691bf65574df6a975fa104e5d05c27e747723dd`,
§1 "Explicit user decisions — resolve the decision register"), received 2026-11-22. The open register of the readiness
proposal is preserved unchanged in `history/2026-11-22-readiness-proposal/DECISION_REGISTER.md` (sha256 `c74390d2…`).
"Implemented in" names where the decision binds in code or protocol.

| ID | Decision | Status | Authorized resolution (brief §1) | Implemented in |
|---|---|---|---|---|
| D-0 | Authorize the pilot | **approved** | authorize this specific pilot, after the engineering gates and the protocol freeze | PROTOCOL §0, §12–§13 |
| D-1 | Cells | **approved** | two predeclared cells: legacy `GA0.VA0` and the outcome-independent hash-selected `GB0.VD1`; R1 and R2 per cell, cutoff and arm; never substituted after results | `context.ts` (`cells`), `tests/static.test.ts` |
| D-2 | Budget rule | **approved (refined)** | expected ≈ 270k–380k; up to **700,000 requested** evaluations as a contingency ceiling (not a target); the suggested 450k early-stop rule **removed**; the ceiling covers search, qualification and the next intervals; a deterministic bound verified before launching | `budget.ts` (bound 693,652), PROTOCOL §7 |
| D-3 | Basis of the new gates | **approved** | liquidation basis for the principal-loss and banked-DD gates; marked values reported | `src/risk-envelope/policy.ts` `re-40-25-25`, PROTOCOL §2 |
| D-4 | Neighbourhood form | **approved** | p90 of each of the three metrics within the arm's limits for rung feasibility and Q3 | `fitness.ts` `violationArm`, `qualify.ts` `verdictOf` |
| D-5 | Low-PL / high-giveback reserve | **approved: none** | keep NL0's search shares | the derived lane (unchanged shares) |
| D-6 | Island objectives | **approved** | NL0's (−net, −robust, p90 marked DD) and mechanics unchanged; only feasibility / violation change | `fitness.ts` `fitOfArm`, `derive.ts` |
| D-7 | New L0 / N/original | **approved** | descriptive frozen benchmarks only; never injected or selectable; no informed lane | `stages.ts` `benchmarks`, `select.ts` `populationOf` |
| D-8 | RA1 threshold (refined) | **approved (refined)** | original RA1 (S4 35 % of C0, unchanged) in both arms; envelope-adapted RA1 (S4 40 % of C0) in EXP only; same populations; only S4 differs; P0 kept as a comparison | `select.ts` (`ra1OrderWith`), `context.ts` (`ra1S4`) |
| D-9 | Open-ended Growth | **approved** | bounded and open-ended Growth eligible with the existing genome; labelled and reported separately | PROTOCOL §4, §15; the report |
| D-10 | EXP Q5 | **approved** | at 10 bps the entire EXP envelope plus positive net; CTRL Q5 unchanged | `qualify.ts` `verdictOf` |
| D-11 | DD^L | **approved** | report-only CPU diagnostic; no CUDA port | PROTOCOL §14; the diagnostics tool |
| D-12 | Next intervals (expanded) | **approved (expanded)** | every distinct selected primary of both arms and every selector (incl. original and adapted RA1), de-duplicated with attribution | `stages.ts` `runSelect` (subjects), `runInterval` |
| D-13 | D1–D3 coefficients | **approved** | nonbinding diagnostics only; illustrative coefficients are not thresholds and never guide the search | PROTOCOL §14 |
| D-14 | Merge into `main` | **approved: no merge** | execute on the accepted Phase 7 lineage on an isolated descendant pilot branch; preserve the acceptance record and the out-of-band pin; never push `main` | branch `research/vg-l0-risk-envelope-pilot` |
| D-15 | Scratch restores | **resolved** (readiness) | deleted after verification; compressed originals preserved; restore again only if genuinely needed | not needed (E2 reads sealed JSON) |

Items the pilot does **not** decide: adopting the envelope into the standard, nominating a New L0 replacement,
deployment, any change of NL0 1.0.0, a successor optimization.
