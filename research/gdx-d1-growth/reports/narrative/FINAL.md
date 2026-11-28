# Final candidates (brief Phase 7; PROTOCOL §12)

**NO QUALIFYING GDX CANDIDATE.** No independent arm primary is development-qualified AND chronologically supported AND
passes V1–V3 on 2025–2026. The five independent chronological procedures (D, G, C, J, S) are all unsupported (every chained
drawdown exceeds the $35,000 ceiling), so condition b fails for every finalist before the validation is read.

Two primaries are **development-qualified without chronological support** and pass V1–V3: **G
`f13f3e1d64379748` (`C24/G/refine/G.h1.s1/R105#1 profit`)** and **C `rc1-5beecb91ea91c775` (`C24/C/pair DF2×GF1`)**.
In the outcome's words they are "not deployment-qualified without an explicit user decision". Neither the study nor this
record recommends one: both have unsupported chronology, weak validation neighbourhoods (21.1 % and 29.7 % of draws breach
the ceiling) and validation profits of $10,294 and $5,210 against N/original's $94,670 over the same window.

No informed primary (D+, G+, C+) passes V1–V3, so the informed development-only list is empty. The D primary fails V1
(−$15,255); the J and S primaries fail V2 and V3 (validation reset DDs $60,066 and $59,792).

The finalist identities were written immutably into `FROZEN_SELECTION.json` (sha256 `984dd972…`, commit `1ce56feb`)
before the FULL door was authorized (commit `76393753`). The outcome joined every validation row to its finalist by
(population, id) and failed closed (`src/research-outcome/identityJoin.ts`). An independent Python reconciliation
re-derived the same sets (OUTCOME_IDENTITY_RECONCILIATION.md). Nothing is adopted, merged, transmitted or deployed.
